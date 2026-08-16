import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestApp, mintToken } from './helpers/e2e';

const OWNER = 'RESTAURANT_OWNER';
const CUSTOMER = 'CUSTOMER';
const ADMIN = 'ADMIN';

describe('Category management (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const seedRestaurant = async () => {
    const { token, userId } = await mintToken(app, { role: OWNER });
    const res = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bistro' })
      .expect(201);
    return { token, userId, restaurantId: res.body.id as string };
  };

  const addCategory = async (
    token: string,
    restaurantId: string,
    body: Record<string, unknown>,
    expectStatus = 201,
  ) => {
    const res = await request(app.getHttpServer())
      .post(`/restaurants/${restaurantId}/categories`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(expectStatus);
    return res.body;
  };

  describe('POST /restaurants/:restaurantId/categories', () => {
    it('creates for the parent owner (201); deletedAt hidden', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const body = await addCategory(token, restaurantId, {
        name: 'Starters',
        sortOrder: 2,
      });
      expect(body.restaurantId).toBe(restaurantId);
      expect(body.sortOrder).toBe(2);
      expect(body).not.toHaveProperty('deletedAt');
    });

    it('rejects a duplicate live name in the same restaurant (409)', async () => {
      const { token, restaurantId } = await seedRestaurant();
      await addCategory(token, restaurantId, { name: 'Drinks' });
      await addCategory(token, restaurantId, { name: 'Drinks' }, 409);
    });

    it('allows reusing a soft-deleted category name (201)', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const first = await addCategory(token, restaurantId, {
        name: 'Seasonal',
      });
      await request(app.getHttpServer())
        .delete(`/categories/${first.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
      // Partial-unique index only covers live rows, so the name is free again.
      await addCategory(token, restaurantId, { name: 'Seasonal' }, 201);
    });

    it('rejects a non-owner (403), CUSTOMER (403), missing token (401)', async () => {
      const { restaurantId } = await seedRestaurant();
      const { token: other } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/categories`)
        .set('Authorization', `Bearer ${other}`)
        .send({ name: 'X' })
        .expect(403);
      const { token: customer } = await mintToken(app, { role: CUSTOMER });
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/categories`)
        .set('Authorization', `Bearer ${customer}`)
        .send({ name: 'X' })
        .expect(403);
      await request(app.getHttpServer())
        .post(`/restaurants/${restaurantId}/categories`)
        .send({ name: 'X' })
        .expect(401);
    });

    it('rejects bad bodies and unknown parent (400 / 404)', async () => {
      const { token, restaurantId } = await seedRestaurant();
      await addCategory(token, restaurantId, { name: 'X', color: 'red' }, 400);
      await addCategory(token, restaurantId, { sortOrder: 1 }, 400);
      await addCategory(token, restaurantId, { name: 'X', sortOrder: -1 }, 400);
      await request(app.getHttpServer())
        .post(`/restaurants/${randomUUID()}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X' })
        .expect(404);
    });
  });

  describe('GET /restaurants/:restaurantId/categories — public list', () => {
    it('orders by sortOrder then name (200)', async () => {
      const { token, restaurantId } = await seedRestaurant();
      await addCategory(token, restaurantId, { name: 'Beta', sortOrder: 1 });
      await addCategory(token, restaurantId, { name: 'Alpha', sortOrder: 1 });
      await addCategory(token, restaurantId, { name: 'First', sortOrder: 0 });

      const res = await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/categories`)
        .expect(200);
      expect(res.body.map((c: { name: string }) => c.name)).toEqual([
        'First',
        'Alpha',
        'Beta',
      ]);
    });

    it('returns 404 for an unknown parent and 400 for a non-UUID', async () => {
      await request(app.getHttpServer())
        .get(`/restaurants/${randomUUID()}/categories`)
        .expect(404);
      await request(app.getHttpServer())
        .get('/restaurants/not-a-uuid/categories')
        .expect(400);
    });
  });

  describe('GET /categories/:id — public', () => {
    it('returns an existing category (200) and 404 for unknown', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const cat = await addCategory(token, restaurantId, { name: 'Mains' });
      await request(app.getHttpServer())
        .get(`/categories/${cat.id}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/categories/${randomUUID()}`)
        .expect(404);
    });
  });

  describe('PATCH /categories/:id', () => {
    it('lets the owner update (200), rejects a different owner (403), ADMIN overrides (200)', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const cat = await addCategory(token, restaurantId, { name: 'Mains' });

      const ok = await request(app.getHttpServer())
        .patch(`/categories/${cat.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ sortOrder: 9 })
        .expect(200);
      expect(ok.body.sortOrder).toBe(9);

      const { token: other } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .patch(`/categories/${cat.id}`)
        .set('Authorization', `Bearer ${other}`)
        .send({ name: 'Hijacked' })
        .expect(403);

      const { token: admin } = await mintToken(app, { role: ADMIN });
      await request(app.getHttpServer())
        .patch(`/categories/${cat.id}`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ name: 'AdminEdit' })
        .expect(200);
    });

    it('rejects renaming into a live sibling name (409)', async () => {
      const { token, restaurantId } = await seedRestaurant();
      await addCategory(token, restaurantId, { name: 'Taken' });
      const other = await addCategory(token, restaurantId, { name: 'Other' });
      await request(app.getHttpServer())
        .patch(`/categories/${other.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Taken' })
        .expect(409);
    });

    it('returns 404 when updating an unknown category', async () => {
      const { token } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .patch(`/categories/${randomUUID()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('rejects a different owner (403), soft-deletes for the owner (204) then reads 404', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const cat = await addCategory(token, restaurantId, { name: 'Temp' });

      const { token: other } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .delete(`/categories/${cat.id}`)
        .set('Authorization', `Bearer ${other}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/categories/${cat.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/categories/${cat.id}`)
        .expect(404);
    });
  });

  describe('soft-delete up the chain', () => {
    it('hides categories once their parent restaurant is soft-deleted', async () => {
      const { token, restaurantId } = await seedRestaurant();
      const cat = await addCategory(token, restaurantId, { name: 'Mains' });

      await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/categories/${cat.id}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/restaurants/${restaurantId}/categories`)
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/categories/${cat.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nope' })
        .expect(404);
    });
  });
});
