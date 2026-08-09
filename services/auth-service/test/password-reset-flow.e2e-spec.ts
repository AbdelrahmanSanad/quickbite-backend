import { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';
import request from 'supertest';
import {
  createTestApp,
  getRedis,
  registerVerifyLogin,
  STRONG_PW,
  uniqueEmail,
} from './helpers/e2e';

const NEW_PW = 'NewStrongP@ss1';

describe('Password reset flow (e2e)', () => {
  let app: INestApplication;
  let redis: Redis;

  beforeAll(async () => {
    app = await createTestApp();
    redis = getRedis(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('forgot -> reset -> old password fails, new one works', async () => {
    const server = app.getHttpServer();
    const { email, userId } = await registerVerifyLogin(app, redis);

    await request(server)
      .post('/auth/forgot-password')
      .send({ email })
      .expect(200);

    const otp = await redis.hget(`password-reset:${userId}`, 'otp');
    expect(otp).toMatch(/^\d{6}$/);

    await request(server)
      .post('/auth/reset-password')
      .send({ email, otp, newPassword: NEW_PW })
      .expect(200);

    // Old password rejected, new one accepted.
    await request(server)
      .post('/auth/login')
      .send({ email, password: STRONG_PW })
      .expect(401);
    await request(server)
      .post('/auth/login')
      .send({ email, password: NEW_PW })
      .expect(200);
  });

  it('forgot-password returns 200 for an unknown email (no enumeration)', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: uniqueEmail('nobody') })
      .expect(200);
  });

  it('rejects a wrong OTP (400)', async () => {
    const server = app.getHttpServer();
    const { email } = await registerVerifyLogin(app, redis);
    await request(server)
      .post('/auth/forgot-password')
      .send({ email })
      .expect(200);

    await request(server)
      .post('/auth/reset-password')
      .send({ email, otp: '000000', newPassword: NEW_PW })
      .expect(400);
  });
});
