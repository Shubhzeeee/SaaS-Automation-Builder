import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async findById(id: string) {
    const result = await this.pool.query(
      `SELECT u.*, o.name AS organization_name, o.slug AS organization_slug,
              s.plan, s.status AS subscription_status
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       LEFT JOIN subscriptions s ON s.organization_id = u.organization_id
       WHERE u.id = $1 AND u.is_active = true`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string) {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()],
    );
    return result.rows[0] || null;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.fullName !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(dto.fullName);
    }
    if (dto.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(dto.avatarUrl);
    }
    if (dto.metadata !== undefined) {
      fields.push(`metadata = metadata || $${idx++}`);
      values.push(JSON.stringify(dto.metadata));
    }

    if (!fields.length) return this.findById(userId);

    values.push(userId);
    const result = await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, full_name, avatar_url, role, metadata`,
      values,
    );
    return result.rows[0];
  }

  async listOrgMembers(orgId: string) {
    const result = await this.pool.query(
      `SELECT id, email, full_name, avatar_url, role, is_active, last_login_at, created_at
       FROM users WHERE organization_id = $1 ORDER BY created_at`,
      [orgId],
    );
    return result.rows;
  }

  async deactivate(userId: string) {
    await this.pool.query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [userId],
    );
  }
}
