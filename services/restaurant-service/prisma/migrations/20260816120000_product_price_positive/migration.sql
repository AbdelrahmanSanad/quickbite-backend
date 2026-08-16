-- Defense-in-depth: reject non-positive prices at the DB level, beyond the DTO
-- validation (@IsPositive). Prisma cannot express a CHECK in schema.prisma, so
-- this is authored as raw SQL and applied via `prisma migrate deploy`.
ALTER TABLE "products" ADD CONSTRAINT "products_price_positive" CHECK ("price" > 0);
