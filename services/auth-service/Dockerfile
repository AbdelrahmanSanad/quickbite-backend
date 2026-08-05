# syntax=docker/dockerfile:1
# Build context is the MONOREPO ROOT (see docker-compose.yml `context: ../..`),
# because dependencies are hoisted to the root node_modules and the lockfile
# lives at the root. Build with:
#   docker build -f services/auth-service/Dockerfile -t quickbite/auth-service .

# ---- base: shared foundation ----
FROM node:24-alpine AS base
WORKDIR /app
# Prisma's query engine needs openssl on Alpine (musl).
RUN apk add --no-cache openssl

# ---- deps: full install (incl. dev) for building ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY services/auth-service/package.json ./services/auth-service/
RUN npm ci

# ---- build: generate Prisma client + compile TypeScript ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json turbo.json ./
COPY services/auth-service ./services/auth-service
RUN npm run db:generate -w @quickbite/auth-service \
 && npm run build -w @quickbite/auth-service

# ---- prod-deps: production-only node_modules (no dev deps) ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY services/auth-service/package.json ./services/auth-service/
RUN npm ci --omit=dev

# ---- runner: minimal runtime image ----
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/services/auth-service

# Production deps live at the hoisted root; Node resolves them by walking up.
COPY --from=prod-deps /app/node_modules /app/node_modules
# Overlay the generated Prisma client (built with the prisma CLI, a dev dep).
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client /app/node_modules/@prisma/client
# Compiled app + schema + manifest.
COPY --from=build /app/services/auth-service/dist ./dist
COPY --from=build /app/services/auth-service/prisma ./prisma
COPY --from=build /app/services/auth-service/package.json ./

USER node
EXPOSE 3001
CMD ["node", "dist/main"]
