import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, Inject, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DB_POOL } from '../database/database.module';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string | null;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: any) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const orgName = dto.organizationName || `${dto.fullName}'s Workspace`;
      const orgSlug = this.slugify(orgName);
      const orgResult = await client.query(
        'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id',
        [orgName, orgSlug],
      );
      const orgId = orgResult.rows[0].id;

      const userResult = await client.query(
        `INSERT INTO users (organization_id, email, password_hash, full_name, role, email_verified)
         VALUES ($1, $2, $3, $4, 'owner', false)
         RETURNING id, email, full_name, role, organization_id`,
        [orgId, dto.email.toLowerCase(), passwordHash, dto.fullName],
      );
      const user = userResult.rows[0];

      await client.query(
        'INSERT INTO subscriptions (organization_id, plan, status) VALUES ($1, $2, $3)',
        [orgId, 'free', 'active'],
      );

      await client.query('COMMIT');

      const tokens = await this.generateTokenPair(user.id, user.email, orgId, user.role);
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          organizationId: orgId,
        },
        ...tokens,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password_hash) return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    return valid ? user : null;
  }

  async login(user: any, ipAddress?: string, userAgent?: string) {
    const tokens = await this.generateTokenPair(
      user.id, user.email, user.organization_id, user.role,
    );

    const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await this.pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent) VALUES ($1,$2,$3,$4,$5)',
      [user.id, tokenHash, expiresAt, ipAddress || null, userAgent || null],
    );
    await this.pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        organizationId: user.organization_id,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const result = await this.pool.query(
      `SELECT rt.*, u.email, u.role, u.organization_id
       FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
      [tokenHash],
    );
    if (!result.rows.length) throw new UnauthorizedException('Invalid or expired refresh token');
    const record = result.rows[0];
    await this.pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
    return this.generateTokenPair(record.user_id, record.email, record.organization_id, record.role);
  }

  async logout(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await this.pool.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [user.id, tokenHash, expiresAt],
    );
    this.logger.log(`Password reset token for ${email}: ${token}`);
    return token;
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await this.pool.query(
      'SELECT * FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW()',
      [tokenHash],
    );
    if (!result.rows.length) throw new BadRequestException('Invalid or expired reset token');
    const record = result.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, record.user_id]);
      await client.query('UPDATE password_resets SET used_at=NOW() WHERE id=$1', [record.id]);
      await client.query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [record.user_id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  private async generateTokenPair(userId: string, email: string, orgId: string | null, role: string) {
    const payload: JwtPayload = { sub: userId, email, orgId, role };
    const secret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || secret;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret, expiresIn: this.configService.get('JWT_EXPIRY', '7d') }),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: '30d' }),
    ]);
    return { accessToken, refreshToken };
  }

  private slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
      + '-' + crypto.randomBytes(3).toString('hex');
  }
}
