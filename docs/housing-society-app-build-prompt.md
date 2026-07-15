# Build Prompt: SocietyOS — Multi-Tenant Housing Society Management System

Use this as a single prompt for an AI code builder (Claude Code, Cursor, Bolt, v0, etc.) to scaffold and build the project. Feed it in one shot, then iterate feature-by-feature rather than asking for everything at once.

---

## Context for the AI builder

Build a production-grade, multi-tenant housing society management web app for the Indian residential market (Mumbai-style co-operative housing societies). Several open-source clones of this idea already exist (E-Society, Housera, various "society-management" repos on GitHub) — they are all single-tenant or naively multi-tenant, use plain JavaScript with no type safety, server-rendered EJS/Bootstrap or dated React, shallow/no payment integration, no visitor pre-approval, no automated fee logic, no audit trail, and no CI-gated testing. This build must be meaningfully better than those on every one of those axes — do not build a shallow clone.

## Tech stack (fixed — do not substitute)

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (or a separate Express + TypeScript service if you prefer a clean frontend/backend split — pick one and be consistent)
- **Database:** MongoDB with Mongoose, schemas written in TypeScript
- **Auth:** JWT-based, with refresh tokens; role-based access control (Resident, Society Admin, Watchman, Super Admin)
- **Payments:** Razorpay (Orders API + webhooks) — NOT Stripe
- **CI/CD:** GitHub Actions — lint + typecheck + test must pass before deploy
- **Testing:** Jest + Supertest for API routes, React Testing Library for key components
- **Deployment target:** Vercel (frontend) + Render/Railway (backend, if split) + MongoDB Atlas

## Core entity model

- `Society` — tenant root. Every other collection references `societyId`.
- `Unit` — flat/unit number, belongs to a Society, has one or more Residents.
- `User` — has a `role` and a `societyId` (Super Admin has no societyId — platform-level).
- `MaintenanceBill` — belongs to a Unit, has due date, amount, late-fee rule, payment status.
- `Payment` — Razorpay order/payment record, linked to a MaintenanceBill.
- `Complaint` — raised by a Resident, has a status pipeline (Open → In Progress → Resolved → Closed), assigned to Admin.
- `Visitor` — pre-approved or gate-logged, linked to a Unit and a Watchman entry.
- `Notice` — posted by Admin, visible to all Residents in that Society.
- `AuditLog` — records every admin mutation (who did what, when, on which record).

## Required features by role

### Resident
- View/pay maintenance bills via Razorpay; download receipt after payment
- Raise a complaint, track status, see admin responses
- Pre-approve a visitor by generating a **QR code or shareable link** the visitor uses to check in at the gate — this is a differentiating feature versus existing repos, build it properly
- View society notices/circulars
- View own payment history and any late fees applied

### Society Admin
- Generate maintenance bills in bulk for all units, with a configurable late-fee rule (e.g., 2% after due date, compounding or flat — make it configurable per Society)
- Track due/paid/overdue status per unit
- Manage complaints: assign, update status, close with a resolution note
- Post notices/circulars
- Approve new resident signups for their Society
- View an **audit log** of all admin actions taken on their Society's data
- Configure emergency contact list for the Society

### Watchman
- Lightweight mobile-first PWA view (must work with an unreliable connection — queue entries locally and sync when back online)
- Scan/check a visitor's pre-approval QR code, or manually log a visitor against a Unit if not pre-approved
- View a live log of who's currently inside

### Super Admin (platform level)
- Onboard new Societies
- View cross-society metrics (no access to resident-level data of a society they don't administer)

## Multi-tenancy requirements (this is the technical centerpiece — do not skip)

Do not rely solely on a `societyId` field checked ad hoc in route handlers. Implement:
1. A Mongoose plugin or middleware that **automatically scopes every query** to the current request's `societyId` (attached from the authenticated user's JWT), so a forgotten `.find({societyId})` in a new route can't leak cross-tenant data.
2. Compound indexes on `{ societyId, _id }` (or equivalent) on every tenant-scoped collection.
3. A test suite that specifically asserts cross-tenant isolation — e.g., a resident of Society A cannot fetch Society B's bills/complaints/visitors even with a crafted request.

## Payments requirements

- Razorpay Orders API to create an order per bill payment.
- A webhook endpoint that verifies the Razorpay signature, and is **idempotent** — replaying the same webhook event must not double-mark a bill as paid or create duplicate payment records. Use the Razorpay event ID as a dedupe key.
- Automated late-fee calculation as a scheduled job (cron or a serverless scheduled function) that runs daily and applies the Society's configured late-fee rule to overdue bills.

## Non-functional requirements

- Full TypeScript, strict mode on.
- GitHub Actions workflow: on every PR, run lint + typecheck + full test suite; block merge on failure. Separate workflow deploys on merge to main, only if the test job passed.
- Seed script that creates 2–3 demo Societies with units, residents, bills (some overdue), and complaints, so the app is demo-able immediately.
- README with architecture diagram (can be ASCII or Mermaid), setup instructions, and a short section explicitly stating what this does differently from existing open-source clones (multi-tenancy enforcement, visitor QR pre-approval, idempotent payments, audit log, CI-gated tests) — this doubles as your interview talking points.

## Build order (do not attempt all at once)

1. Auth + multi-tenant scoping middleware + tests for tenant isolation
2. Society/Unit/User CRUD (admin onboarding flow)
3. Maintenance bills + Razorpay integration + webhook idempotency
4. Complaints pipeline
5. Visitor QR pre-approval + Watchman PWA view with offline queue
6. Notices, audit log, late-fee cron job
7. CI/CD pipeline, seed script, README

Ask for one numbered stage at a time from the AI builder rather than the whole app in one pass — this keeps each stage reviewable and testable before moving on.
