# QuickBite

Production-grade Food Delivery Platform.

This project is built to simulate a real production environment and demonstrate senior-level software engineering practices.

Main Goals

- Learn System Design by building.
- Practice Microservices.
- Apply Clean Architecture.
- Apply Domain-Driven Design principles.
- Build production-quality code.

## Tech Stack

### Frontend

- React Native (Customer App)
- Next.js (Admin Dashboard)

### Backend

- NestJS
- PostgreSQL
- Prisma ORM
- Redis
- RabbitMQ

### Infrastructure

- Docker
- Docker Compose

## Architecture

The backend follows a Microservices Architecture.

Services communicate synchronously using REST during the MVP phase.

RabbitMQ is introduced only when asynchronous communication provides a clear business or scalability benefit.

Each service owns its own database.

The API Gateway is the single public entry point.

## Repository Layout

This repository (`quickbite-backend`) contains **backend only** — the NestJS
microservices (`services/*`), shared libraries (`libs/*`), infrastructure
(`infra/`), and docs.

The **frontend lives in separate repositories**, one per app:
`quickbite-customer-app` (React Native) and `quickbite-admin-dashboard`
(Next.js).

Frontend and backend share types through a generated API client (OpenAPI), never
through a shared workspace — the repo boundary enforces the service contract.

## Services

- API Gateway
- Auth Service
- Restaurant Service
- Catalog Service
- Cart Service
- Order Service
- Payment Service
- Notification Service

## Engineering Principles

- Prefer simplicity over complexity.
- Avoid premature optimization.
- Build MVP first.
- Optimize when bottlenecks appear.
- Database per Service.
- Never access another service database.
- Prefer composition over inheritance.
- Follow SOLID principles.
- Follow Clean Architecture.

## Development Philosophy

Every architectural decision should be justified.

Every abstraction should solve an existing problem.

Do not introduce patterns only because they are popular.

Always explain trade-offs before implementation.

## AI Collaboration

Before implementing any feature:

1. Explain the architecture.
2. Explain the trade-offs.
3. Propose the simplest production-ready solution.
4. Wait for confirmation before generating large implementations.

When reviewing code:

- Focus on correctness.
- Maintainability.
- Performance.
- Security.
- Scalability.

Avoid unnecessary abstractions and over-engineering.

## Learning Mode

This project is built as a learning journey.

Prefer explanations over code generation.

Guide the implementation step by step.

Challenge architectural decisions when appropriate.

Do not assume requirements.

Ask questions before making important design decisions.
