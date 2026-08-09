import { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';
import request from 'supertest';
import { createTestApp, getRedis, STRONG_PW, uniqueEmail } from './helpers/e2e';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let redis: Redis;

  beforeAll(async () => {
    app = await createTestApp();
    redis = getRedis(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('register -> verify email -> login', async () => {
    const server = app.getHttpServer();
    const email = uniqueEmail();

    const reg = await request(server)
      .post('/auth/register')
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email,
        password: STRONG_PW,
      })
      .expect(201);
    expect(reg.body.status).toBe('PENDING');

    const token = await redis.hget(`verify-email:${reg.body.id}`, 'token');
    expect(token).toBeTruthy();

    await request(server)
      .post('/auth/verify-email')
      .send({ userId: reg.body.id, token })
      .expect(200);

    const login = await request(server)
      .post('/auth/login')
      .send({ email, password: STRONG_PW })
      .expect(200);
    expect(login.body.accessToken).toBeTruthy();
    expect(login.body.refreshToken).toBeTruthy();
    expect(login.body.tokenType).toBe('Bearer');
  });

  it('rejects a weak password on register (400)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        firstName: 'A',
        lastName: 'B',
        email: uniqueEmail(),
        password: 'weakpass',
      })
      .expect(400);
  });

  it('rejects a duplicate email (409)', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ firstName: 'A', lastName: 'B', email, password: STRONG_PW })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ firstName: 'A', lastName: 'B', email, password: STRONG_PW })
      .expect(409);
  });

  it('rejects login before verification (403)', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ firstName: 'A', lastName: 'B', email, password: STRONG_PW })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: STRONG_PW })
      .expect(403);
  });
});
