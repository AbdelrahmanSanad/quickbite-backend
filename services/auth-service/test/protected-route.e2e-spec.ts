import { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';
import request from 'supertest';
import { createTestApp, getRedis, registerVerifyLogin } from './helpers/e2e';

describe('Protected route /auth/me (e2e)', () => {
  let app: INestApplication;
  let redis: Redis;

  beforeAll(async () => {
    app = await createTestApp();
    redis = getRedis(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a request with no token (401)', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('rejects a malformed Authorization header (401)', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Token abc')
      .expect(401);
  });

  it('rejects a garbage bearer token (401)', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('accepts a valid access token and returns the authenticated identity', async () => {
    const { email, userId, accessToken } = await registerVerifyLogin(
      app,
      redis,
    );

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual({ userId, email, role: 'CUSTOMER' });
  });
});
