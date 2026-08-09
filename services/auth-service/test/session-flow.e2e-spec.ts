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

describe('Session flow (e2e)', () => {
  let app: INestApplication;
  let redis: Redis;

  beforeAll(async () => {
    app = await createTestApp();
    redis = getRedis(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('refresh rotates the token and invalidates the old one', async () => {
    const server = app.getHttpServer();
    const { refreshToken } = await registerVerifyLogin(app, redis);

    const rotated = await request(server)
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    const newRefresh = rotated.body.refreshToken;
    expect(newRefresh).not.toBe(refreshToken);

    // Old token no longer works; new one does.
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: newRefresh })
      .expect(200);
  });

  it('logout revokes the session', async () => {
    const server = app.getHttpServer();
    const { refreshToken } = await registerVerifyLogin(app, redis);

    await request(server)
      .post('/auth/logout')
      .send({ refreshToken })
      .expect(200);
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('logout-all revokes every session for the user', async () => {
    const server = app.getHttpServer();
    const email = uniqueEmail();
    const first = await registerVerifyLogin(app, redis, email);

    const second = await request(server)
      .post('/auth/login')
      .send({ email, password: STRONG_PW })
      .expect(200);

    const res = await request(server)
      .post('/auth/logout-all')
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    expect(res.body.revokedCount).toBeGreaterThanOrEqual(2);

    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: second.body.refreshToken })
      .expect(401);
  });
});
