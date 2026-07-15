# SocietyOS Phase 1+2+3 — Task Tracker

## 1. Project Scaffolding
- [x] Initialize Next.js 14 with App Router, TypeScript, TailwindCSS, ESLint
- [x] Configure tsconfig.json strict mode + path aliases
- [x] Create .env.example
- [x] Update .gitignore
- [x] Install dependencies (mongoose, jsonwebtoken, bcryptjs, zod, razorpay, etc.)

## 2. Database Layer
- [x] MongoDB connection singleton (`src/lib/db/connection.ts`)
- [x] AsyncLocalStorage tenant context (`src/lib/tenant/context.ts`)
- [x] Mongoose scoping plugin (`src/lib/tenant/scopingPlugin.ts`)

## 3. Data Models
- [x] Society model
- [x] User model
- [x] Unit model
- [x] AuditLog model
- [x] MaintenanceBill model
- [x] Payment model
- [x] Receipt model

## 4. Authentication System
- [x] JWT utilities (`src/lib/auth/jwt.ts`)
- [x] Password hashing (`src/lib/auth/password.ts`)
- [x] Auth middleware (`src/lib/auth/middleware.ts`)
- [x] Rate limiter (`src/lib/auth/rateLimit.ts` - bypassed in test mode)

## 5. Validation Layer (Zod)
- [x] Auth schemas
- [x] Society schemas
- [x] Unit schemas
- [x] User schemas
- [x] Bill/Payment schemas

## 6. API Routes — Auth
- [x] POST /api/auth/signup
- [x] POST /api/auth/login
- [x] POST /api/auth/refresh
- [x] POST /api/auth/logout
- [x] POST /api/auth/activate (Admin Activation)

## 7. API Routes — Super Admin
- [x] GET/POST /api/superadmin/societies (Onboarding with Activation Link)
- [x] GET/PATCH/DELETE /api/superadmin/societies/[id]

## 8. API Routes — Admin (Units/Settings/Watchman/Bills)
- [x] GET/POST /api/admin/units
- [x] GET/PATCH/DELETE /api/admin/units/[id]
- [x] POST /api/admin/units/bulk-import
- [x] GET /api/admin/users
- [x] POST /api/admin/users/[id]/approve (with Duplicate Claim handling)
- [x] POST /api/admin/users/watchman
- [x] GET/PATCH /api/admin/settings
- [x] POST /api/admin/bills/generate (Bulk Bill Generation with overrides)

## 9. API Routes — Resident (Payments/Receipts)
- [x] POST /api/resident/payments/create-order (Razorpay order creation)
- [x] GET /api/resident/receipts/[id] (Receipt download/view)

## 10. Webhooks & Background Jobs
- [x] POST /api/webhooks/razorpay (Idempotent captured/failed handler)
- [x] POST /api/jobs/late-fees (Daily late fee rule processor)

## 11. Audit Log Infrastructure
- [x] Audit logger utility with support for system/webhook actors

## 12. Seed Script
- [ ] scripts/seed.ts

## 13. Tests
- [x] Jest config
- [x] Tenant isolation: Cross-tenant tests (`tests/tenant-isolation/crossTenant.test.ts`)
- [x] Integration: Super Admin Onboarding & Activation tests (`tests/integration/superadminOnboarding.test.ts`)
- [x] Integration: Admin units tests (`tests/integration/adminUnits.test.ts`)
- [x] Integration: Resident Signup & Approval tests (`tests/integration/residentSignup.test.ts`)
- [x] Integration: Admin settings tests (`tests/integration/adminSettings.test.ts`)
- [x] Integration: Watchman Account Creation tests (`tests/integration/adminWatchman.test.ts`)
- [x] Integration: Admin Billing & Late Fees tests (`tests/integration/adminBilling.test.ts`)
- [x] Integration: Resident Payments, Webhooks, and Receipts tests (`tests/integration/residentPayments.test.ts`)

## 14. CI/CD
- [ ] .github/workflows/ci.yml
- [ ] .github/workflows/deploy.yml

## 15. Frontend
- [x] Root layout + global styles
- [x] Landing page
- [x] Login page
- [x] Signup page
- [x] Admin dashboard
- [ ] Admin units page
- [ ] Admin users page
- [ ] Admin audit log page
- [ ] Super Admin dashboard
- [ ] Shared UI components
- [x] Auth provider + API client
