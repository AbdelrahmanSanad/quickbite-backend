# Sprint 1 — Auth Service

> **Status tracking:** each task is a checkbox. `[ ]` = todo, `[x]` = done.
> A feature is "done" when all its tasks are checked, its build/lint/tests pass,
> and its PR is merged. The `next-auth-feature` skill reads this file to pick the
> next unstarted feature and checks tasks off as it completes them.

## 🎯 Goal

Build a secure authentication service that supports user registration, login,
session management, email verification, password reset, and JWT-based
authentication.

---

## Epic 1: User Registration

### Feature 1.1 — Register User ✅

- [x] Initialize Auth Module
- [x] Configure PostgreSQL & Prisma
- [x] Configure Redis
- [x] Create User Entity
- [x] Create Register DTO
- [x] Validate Request
- [x] Check Email Uniqueness
- [x] Hash Password (Argon2)
- [x] Save User (Status = PENDING)
- [x] Generate Email Verification Token
- [x] Store Verification Token in Redis (TTL 24h)
- [x] Publish `UserRegistered` Event
- [x] Return Success Response

### Feature 1.2 — Verify Email ✅

- [x] Verify Token from Redis
- [x] Activate User
- [x] Mark Email as Verified
- [x] Delete Verification Token
- [x] Return Success Response

---

## Epic 2: Authentication

### Feature 2.1 — Login ✅

- [x] Validate Credentials
- [x] Check User Status
- [x] Check Email Verified
- [x] Verify Password
- [x] Generate Access Token
- [x] Generate Refresh Token
- [x] Hash Refresh Token
- [x] Save Session
- [x] Return Tokens

### Feature 2.2 — Refresh Token ✅

- [x] Validate Refresh Token
- [x] Verify Stored Hash
- [x] Rotate Refresh Token
- [x] Update Session
- [x] Return New Tokens

### Feature 2.3 — Logout ✅

- [x] Revoke Current Session
- [x] Remove Refresh Token
- [x] Return Success

### Feature 2.4 — Logout All Devices ✅

- [x] Revoke All Sessions
- [x] Return Success

---

## Epic 3: Password Recovery

### Feature 3.1 — Forgot Password

- [ ] Validate Email
- [ ] Generate OTP
- [ ] Store OTP in Redis (TTL 10 min)
- [ ] Publish `PasswordResetRequested` Event
- [ ] Return Success

### Feature 3.2 — Reset Password

- [ ] Validate OTP
- [ ] Hash New Password
- [ ] Update Password
- [ ] Revoke All Sessions
- [ ] Delete OTP
- [ ] Return Success

---

## Epic 4: Session Management

- [ ] Create Session Entity
- [ ] Store Device Information
- [ ] Store IP Address
- [ ] Store User Agent
- [ ] Track Last Activity
- [ ] Support Multiple Devices

---

## Epic 5: Security

- [ ] Rate Limiting
- [ ] Global Validation Pipe
- [ ] Exception Filter
- [ ] Password Strength Validation
- [ ] Security Headers (Helmet)
- [ ] CORS Configuration
- [ ] Environment Validation

---

## Epic 6: Documentation

- [ ] Swagger
- [ ] API Examples
- [ ] Error Responses
- [ ] Environment Variables Documentation

---

## Epic 7: Testing

### Unit Tests

- [ ] Register
- [ ] Login
- [ ] Verify Email
- [ ] Refresh Token
- [ ] Forgot Password
- [ ] Reset Password

### Integration Tests

- [ ] Auth Flow
- [ ] Session Flow
- [ ] Password Reset Flow

---

## Definition of Done (per feature)

- [ ] ✅ Build passes
- [ ] ✅ Lint passes
- [ ] ✅ Tests pass
- [ ] ✅ Swagger updated
- [ ] ✅ Prisma migration applied (if schema changed)
- [ ] ✅ No hardcoded secrets
- [ ] ✅ Environment variables validated
- [ ] ✅ Code reviewed
