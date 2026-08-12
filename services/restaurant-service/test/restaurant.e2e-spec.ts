import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestApp, mintToken } from './helpers/e2e';

const OWNER = 'RESTAURANT_OWNER';
const CUSTOMER = 'CUSTOMER';
const ADMIN = 'ADMIN';

describe('Restaurant CRUD (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const createAs = async (userId?: string) => {
    const { token, userId: uid } = await mintToken(app, {
      userId,
      role: OWNER,
    });
    const res = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bistro' })
      .expect(201);
    return { token, userId: uid, id: res.body.id as string };
  };

  describe('POST /restaurants — auth + role wiring', () => {
    it('rejects a request with no token (401)', async () => {
      await request(app.getHttpServer())
        .post('/restaurants')
        .send({ name: 'Bistro' })
        .expect(401);
    });

    it('rejects a garbage bearer token (401)', async () => {
      await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', 'Bearer not-a-real-token')
        .send({ name: 'Bistro' })
        .expect(401);
    });

    it('rejects a CUSTOMER (403)', async () => {
      const { token } = await mintToken(app, { role: CUSTOMER });
      await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bistro' })
        .expect(403);
    });

    it('creates for a RESTAURANT_OWNER; ownerId is the token subject, deletedAt hidden', async () => {
      const { token, userId } = await mintToken(app, { role: OWNER });
      const res = await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bistro', description: 'Cozy' })
        .expect(201);

      expect(res.body.ownerId).toBe(userId);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body).not.toHaveProperty('deletedAt');
    });

    it('rejects a body that smuggles ownerId (400 whitelist)', async () => {
      const { token } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bistro', ownerId: randomUUID() })
        .expect(400);
    });
  });

  describe('GET /restaurants/:id — public', () => {
    it('returns an existing restaurant without a token (200)', async () => {
      const { id } = await createAs();
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${id}`)
        .expect(200);
      expect(res.body.id).toBe(id);
    });

    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get(`/restaurants/${randomUUID()}`)
        .expect(404);
    });

    it('returns 400 for a non-UUID id', async () => {
      await request(app.getHttpServer())
        .get('/restaurants/not-a-uuid')
        .expect(400);
    });
  });

  describe('PATCH /restaurants/:id — ownership', () => {
    it('lets the owner update (200)', async () => {
      const { token, id } = await createAs();
      const res = await request(app.getHttpServer())
        .patch(`/restaurants/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed' })
        .expect(200);
      expect(res.body.name).toBe('Renamed');
    });

    it('rejects a different owner (403)', async () => {
      const { id } = await createAs();
      const { token: otherToken } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .patch(`/restaurants/${id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hijacked' })
        .expect(403);
    });

    it('lets an ADMIN override ownership (200)', async () => {
      const { id } = await createAs();
      const { token: adminToken } = await mintToken(app, { role: ADMIN });
      await request(app.getHttpServer())
        .patch(`/restaurants/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'AdminEdit' })
        .expect(200);
    });

    // Security invariant: an owner must NOT be able to change status (or any
    // non-whitelisted field) via PATCH — the DTO omits status + forbidNonWhitelisted.
    it('rejects an owner attempting to set status (400 whitelist)', async () => {
      const { token, id } = await createAs();
      await request(app.getHttpServer())
        .patch(`/restaurants/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'SUSPENDED' })
        .expect(400);
    });

    it('returns 404 when updating an unknown id', async () => {
      const { token } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .patch(`/restaurants/${randomUUID()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });
  });

  describe('DELETE /restaurants/:id — soft delete', () => {
    it('rejects a different owner (403)', async () => {
      const { id } = await createAs();
      const { token: otherToken } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .delete(`/restaurants/${id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('soft-deletes for the owner (204) and the restaurant then reads as 404', async () => {
      const { token, id } = await createAs();
      await request(app.getHttpServer())
        .delete(`/restaurants/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer()).get(`/restaurants/${id}`).expect(404);
    });

    it('returns 404 when deleting an unknown id', async () => {
      const { token } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .delete(`/restaurants/${randomUUID()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
