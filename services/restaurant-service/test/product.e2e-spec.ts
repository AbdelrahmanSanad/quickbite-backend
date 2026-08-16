import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestApp, mintToken } from './helpers/e2e';

const OWNER = 'RESTAURANT_OWNER';
const CUSTOMER = 'CUSTOMER';
const ADMIN = 'ADMIN';

describe('Product management (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Seeds an owner + restaurant + category; returns token and ids. */
  const seed = async () => {
    const { token, userId } = await mintToken(app, { role: OWNER });
    const r = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bistro' })
      .expect(201);
    const c = await request(app.getHttpServer())
      .post(`/restaurants/${r.body.id}/categories`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mains' })
      .expect(201);
    return {
      token,
      userId,
      restaurantId: r.body.id as string,
      categoryId: c.body.id as string,
    };
  };

  const addProduct = async (
    token: string,
    categoryId: string,
    body: Record<string, unknown>,
    expectStatus = 201,
  ) => {
    const res = await request(app.getHttpServer())
      .post(`/categories/${categoryId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(expectStatus);
    return res.body;
  };

  describe('POST /categories/:categoryId/products', () => {
    it('creates for the owner (201); price echoed as a 2dp string, deletedAt hidden', async () => {
      const { token, categoryId } = await seed();
      const body = await addProduct(token, categoryId, {
        name: 'Burger',
        price: 12.5,
      });
      expect(body.categoryId).toBe(categoryId);
      expect(body.price).toBe('12.50');
      expect(body.isAvailable).toBe(true);
      expect(body).not.toHaveProperty('deletedAt');
    });

    it('rejects invalid prices (400): zero, negative, 3dp, over-max, non-number', async () => {
      const { token, categoryId } = await seed();
      await addProduct(token, categoryId, { name: 'X', price: 0 }, 400);
      await addProduct(token, categoryId, { name: 'X', price: -1 }, 400);
      await addProduct(token, categoryId, { name: 'X', price: 1.234 }, 400);
      await addProduct(token, categoryId, { name: 'X', price: 2_000_000 }, 400);
      await addProduct(token, categoryId, { name: 'X', price: 'free' }, 400);
    });

    it('rejects bad bodies and unknown category (400 / 404)', async () => {
      const { token, categoryId } = await seed();
      await addProduct(token, categoryId, { price: 5 }, 400); // missing name
      await addProduct(token, categoryId, { name: 'X', price: 5, x: 1 }, 400);
      await request(app.getHttpServer())
        .post(`/categories/${randomUUID()}/products`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X', price: 5 })
        .expect(404);
    });

    it('rejects a non-owner (403), CUSTOMER (403), missing token (401)', async () => {
      const { categoryId } = await seed();
      const { token: other } = await mintToken(app, { role: OWNER });
      await addProductAs(other, categoryId, 403);
      const { token: customer } = await mintToken(app, { role: CUSTOMER });
      await addProductAs(customer, categoryId, 403);
      await request(app.getHttpServer())
        .post(`/categories/${categoryId}/products`)
        .send({ name: 'X', price: 5 })
        .expect(401);
    });

    const addProductAs = (token: string, categoryId: string, status: number) =>
      request(app.getHttpServer())
        .post(`/categories/${categoryId}/products`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X', price: 5 })
        .expect(status);
  });

  describe('GET /categories/:categoryId/products — public list', () => {
    it('orders by sortOrder then name (200)', async () => {
      const { token, categoryId } = await seed();
      await addProduct(token, categoryId, {
        name: 'Beta',
        price: 1,
        sortOrder: 1,
      });
      await addProduct(token, categoryId, {
        name: 'Alpha',
        price: 1,
        sortOrder: 1,
      });
      await addProduct(token, categoryId, {
        name: 'First',
        price: 1,
        sortOrder: 0,
      });

      const res = await request(app.getHttpServer())
        .get(`/categories/${categoryId}/products`)
        .expect(200);
      expect(res.body.map((p: { name: string }) => p.name)).toEqual([
        'First',
        'Alpha',
        'Beta',
      ]);
    });

    it('returns 404 for an unknown category and 400 for a non-UUID', async () => {
      await request(app.getHttpServer())
        .get(`/categories/${randomUUID()}/products`)
        .expect(404);
      await request(app.getHttpServer())
        .get('/categories/not-a-uuid/products')
        .expect(400);
    });
  });

  describe('GET /products/:id — public', () => {
    it('returns an existing product (200) and 404 for unknown', async () => {
      const { token, categoryId } = await seed();
      const p = await addProduct(token, categoryId, {
        name: 'Fries',
        price: 3,
      });
      await request(app.getHttpServer()).get(`/products/${p.id}`).expect(200);
      await request(app.getHttpServer())
        .get(`/products/${randomUUID()}`)
        .expect(404);
    });
  });

  describe('PATCH /products/:id', () => {
    it('owner updates (200), non-owner 403, ADMIN overrides (200)', async () => {
      const { token, categoryId } = await seed();
      const p = await addProduct(token, categoryId, { name: 'Soda', price: 2 });

      const ok = await request(app.getHttpServer())
        .patch(`/products/${p.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 2.75, isAvailable: false })
        .expect(200);
      expect(ok.body.price).toBe('2.75');
      expect(ok.body.isAvailable).toBe(false);

      const { token: other } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .patch(`/products/${p.id}`)
        .set('Authorization', `Bearer ${other}`)
        .send({ name: 'Hijacked' })
        .expect(403);

      const { token: admin } = await mintToken(app, { role: ADMIN });
      await request(app.getHttpServer())
        .patch(`/products/${p.id}`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ name: 'AdminEdit' })
        .expect(200);
    });

    it('rejects an invalid price on update (400) and unknown id (404)', async () => {
      const { token, categoryId } = await seed();
      const p = await addProduct(token, categoryId, { name: 'Soda', price: 2 });
      await request(app.getHttpServer())
        .patch(`/products/${p.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 0 })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/products/${randomUUID()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });
  });

  describe('DELETE /products/:id', () => {
    it('non-owner 403, owner soft-deletes (204) then reads 404', async () => {
      const { token, categoryId } = await seed();
      const p = await addProduct(token, categoryId, { name: 'Temp', price: 1 });

      const { token: other } = await mintToken(app, { role: OWNER });
      await request(app.getHttpServer())
        .delete(`/products/${p.id}`)
        .set('Authorization', `Bearer ${other}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/products/${p.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
      await request(app.getHttpServer()).get(`/products/${p.id}`).expect(404);
    });
  });

  // §9: a product is invisible if its category OR the category's restaurant is
  // soft-deleted (two-level chain).
  describe('soft-delete up the two-level chain', () => {
    it('hides products when the parent CATEGORY is soft-deleted', async () => {
      const { token, categoryId } = await seed();
      const p = await addProduct(token, categoryId, { name: 'Item', price: 1 });

      await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer()).get(`/products/${p.id}`).expect(404);
      await request(app.getHttpServer())
        .get(`/categories/${categoryId}/products`)
        .expect(404);
    });

    it('hides products when the RESTAURANT is soft-deleted', async () => {
      const { token, restaurantId, categoryId } = await seed();
      const p = await addProduct(token, categoryId, { name: 'Item', price: 1 });

      await request(app.getHttpServer())
        .delete(`/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer()).get(`/products/${p.id}`).expect(404);
      await request(app.getHttpServer())
        .get(`/categories/${categoryId}/products`)
        .expect(404);
    });
  });
});
