import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { DB_POOL } from '../../src/database/database.module';
import * as bcrypt from 'bcryptjs';

const mockPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock_token'),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string, def?: any) => {
    const cfg: Record<string, any> = {
      JWT_SECRET: 'test_secret_at_least_32_characters_long',
      JWT_EXPIRY: '7d',
      JWT_REFRESH_SECRET: 'test_refresh_secret_32_chars_long!',
    };
    return cfg[key] ?? def;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB_POOL, useValue: mockPool },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('returns null when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });

    it('returns null when password is wrong', async () => {
      const hash = await bcrypt.hash('correct_password', 12);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1', email: 'test@example.com', password_hash: hash,
      });
      const result = await service.validateUser('test@example.com', 'wrong_password');
      expect(result).toBeNull();
    });

    it('returns user when credentials are valid', async () => {
      const hash = await bcrypt.hash('correct_password', 12);
      const user = { id: 'user-1', email: 'test@example.com', password_hash: hash };
      mockUsersService.findByEmail.mockResolvedValue(user);
      const result = await service.validateUser('test@example.com', 'correct_password');
      expect(result).toEqual(user);
    });
  });

  describe('register', () => {
    it('throws ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({
          fullName: 'Jane Smith',
          email: 'jane@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and org on successful registration', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 'org-1' }] }) // org insert
          .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'jane@test.com', full_name: 'Jane Smith', role: 'owner' }] }) // user insert
          .mockResolvedValueOnce(undefined) // subscription insert
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);

      const result = await service.register({
        fullName: 'Jane Smith',
        email: 'jane@test.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('jane@test.com');
    });
  });
});
