import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestApp, mintToken } from './helpers/e2e';

const OWNER = 'RESTAURANT_OWNER';
const CUSTOMER = 'CUSTOMER';
const ADMIN = 'ADMIN';

describe('Branch management (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Creates an owner + a restaurant they own; returns their token and ids. */
  const seedRestaurant = async () => {
    const { token, userId } = await mintToken(app, { role: OWNER });
    const res = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bistro' })
      .expect(201);
    return { token, userId, restaurantId: res.body.id as string };
  };

  const addBranch = async (token: string, restaurantId: string) => {
    const res = await request(app.getHttpServer())
      .post(`/restaurants/${restaurantId}/branches`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Downtown', address: '1 Main St' })
      .expect(201);
    return res.body.id as string;
  };

  describe('POST /restaurants/:restaurantId/branches', () => {
    it('creates for the parent-restaurant owner (201); isActive true, deletedAt hidden', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const res = await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Downtown', address: '1 Main St', phone: '555' })
        .expect(201);

      expect(res.body.restaurantId).toBe(restaurantId);
      expect(res.body.isActive).toBe(true);
      expect(res.body).not.toHaveProperty('deletedAt');
    });

    it('rejects an owner who does not own the parent (403)', async () => {
      const { restaurantId } = await seedRestaurant();
      const { token: otherToken } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/branches`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'X', address: 'Y' })
        .expect(403);
    });

    it('rejects a CUSTOMER (403) and a missing token (401)', async () => {
      const { restaurantId } = await seedRestaurant();
      const { token: customer } = await mintToken(app, { role: CUSTOMER });
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/branches`)
        .set('Authorization', `Bearer ${customer}`)
        .send({ name: 'X', address: 'Y' })
        .expect(403);
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/branches`)
        .send({ name: 'X', address: 'Y' })
        .expect(401);
    });

    it('rejects a smuggled isActive and a missing address (400)', async () => {
      const { token, restaurantId } = await seedRestaurant();
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X', address: 'Y', isActive: false })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X' })
        .expect(400);
    });

    it('returns 404 when the parent restaurant is unknown', async () => {
      const { token } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .post(`/restaurants/${randomUUID()}/branches`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X', address: 'Y' })
        .expect(404);
    });
  });

  describe('GET /restaurants/:restaurantId/branches — public list', () => {
    it('lists branches without a token (200)', async () => {
      const { token, restaurantId } = await seedRestaurant();
      await addBranch(token, restaurantId);
      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/branches`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
    });

    it('returns 404 for an unknown parent and 400 for a non-UUID', async () => {
      await request(app.getHttpServer())
        .get(`/restaurants/${randomUUID()}/branches`)
        .expect(404);
      await request(app.getHttpServer())
        .get('/restaurants/not-a-uuid/branches')
        .expect(400);
    });
  });

  describe('GET /branches/:id — public', () => {
    it('returns an existing branch (200) and 404 for unknown', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const branchId = await addBranch(token, restaurantId);
      await request(app.getHttpServer())
        .get(`/branches/${branchId}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/branches/${randomUUID()}`)
        .expect(404);
    });
  });

  describe('PATCH /branches/:id — ownership', () => {
    it('lets the owner update (200), rejects a different owner (403), ADMIN overrides (200)', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const branchId = await addBranch(token, restaurantId);

      const ok = await request(app.getHttpServer())
        .patch(`/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);
      expect(ok.body.isActive).toBe(false);

      const { token: otherToken } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .patch(`/branches/${branchId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hijacked' })
        .expect(403);

      const { token: adminToken } = await mintToken(app, { role: ADMIN });
      await request(app.getHttpServer())
        .patch(`/branches/${branchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'AdminEdit' })
        .expect(200);
    });

    it('returns 404 when updating an unknown branch', async () => {
      const { token } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .patch(`/branches/${randomUUID()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });
  });

  describe('DELETE /branches/:id — soft delete', () => {
    it('rejects a different owner (403), soft-deletes for the owner (204) then reads 404', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const branchId = await addBranch(token, restaurantId);

      const { token: otherToken } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .delete(`/branches/${branchId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/branches/${branchId}`)
        .expect(404);
    });
  });

  // §15: soft delete does not cascade, but a branch under a soft-deleted parent
  // must be invisible up the chain (get/list 404, write 404).
  describe('soft-delete up the chain', () => {
    it('hides branches once their parent restaurant is soft-deleted', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const branchId = await addBranch(token, restaurantId);

      await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/branches/${branchId}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/branches`)
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/branches/${branchId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nope' })
        .expect(404);
    });
  });
});
