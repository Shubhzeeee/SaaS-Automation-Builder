import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test User',
          email: `test_${Date.now()}@example.com`,
          password: 'Password123!',
          organizationName: 'Test Org',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data.user).toHaveProperty('email');
        });
    });

    it('rejects registration with weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ fullName: 'Test', email: 'test@test.com', password: '123' })
        .expect(400);
    });

    it('rejects duplicate email', async () => {
      const email = `dupe_${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ fullName: 'User One', email, password: 'Password123!' });

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ fullName: 'User Two', email, password: 'Password123!' })
        .expect(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 401 with wrong credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'WrongPassword1!' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });
});
