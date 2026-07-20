# SocietyOS Interview Preparation

This document outlines the architecture, key decisions, and real-world challenges encountered while building SocietyOS. It is intended to serve as a reference for technical interviews.

## 1. Elevator Pitch

SocietyOS is a production-grade, multi-tenant housing society management platform built for the Indian residential market. It serves Residents, Watchmen, and Society Admins from a single centralized API while strictly enforcing data isolation between different societies. What elevates it beyond a standard CRUD application is its robust multi-tenancy architecture—enforced via a custom Mongoose scoping plugin leveraging `AsyncLocalStorage`—and its complete end-to-end operational flows, such as offline-capable QR pre-approvals for visitors and idempotent Razorpay integrations for maintenance billing.

## 2. Architecture Walkthrough (A to Z)

**Request Flow & Tenant Isolation**
When a client makes a request to a protected Next.js API route (e.g., `src/app/api/admin/users/route.ts`), it first passes through the `withAuth` middleware (`src/lib/auth/middleware.ts`). This middleware verifies the JWT and decodes the user's role and `societyId`. Instead of manually passing this ID down to every database call, we initialize an `AsyncLocalStorage` context (`src/lib/tenant/context.ts`) wrapped around the request lifecycle. 

When a Mongoose query is fired (e.g., `User.find()`), our custom `tenantScopingPlugin` (`src/lib/tenant/scopingPlugin.ts`) intercepts it at the pre-hook stage. It reads the `societyId` from the active context and silently injects a `{ societyId: ctx.societyId }` filter into the query. This prevents a whole class of data-leak vulnerabilities by enforcing tenant isolation at the data access layer, rather than relying on developers remembering to filter every query.

**Payment Integration**
When a resident pays a maintenance bill, the client calls `src/app/api/resident/payments/create-order/route.ts` to generate a Razorpay order. The actual payment confirmation happens asynchronously via Razorpay webhooks hitting `src/app/api/webhooks/razorpay/route.ts`. Webhooks are verified using cryptographic signatures to prevent tampering. Crucially, the webhook handler is built to be idempotent. We enforce a sparse unique index on `razorpayEventId` in the `Payment` collection (`src/models/Payment.ts`). If Razorpay re-delivers the same `payment.captured` event, the database-level uniqueness constraint gracefully rejects it, ensuring bills are never double-counted.

**Visitor QR Pre-approval & Offline Sync**
A resident generates a single-use token valid for a specific time window via `src/app/api/resident/visitors/pre-approve/route.ts`. When a visitor arrives, the watchman scans the QR code. The watchman client is an offline-capable PWA. If offline, the scan is queued locally and then bulk-synced via `src/app/api/watchman/visitors/sync/route.ts`. To prevent a race condition where two watchmen scan the same QR code at the exact same millisecond, we rely on a sparse unique index on the `token` field in MongoDB rather than application-layer checks.

**Complaint Status Pipeline**
Residents raise complaints which flow through a strict state machine (Open → In Progress → Resolved → Closed). The API at `src/app/api/admin/complaints/[id]/status/route.ts` strictly enforces these transitions, for instance, rejecting a jump from Open directly to Closed, or requiring a `resolutionNote` when moving to the Resolved state.

**Audit Logs**
Every admin mutation triggers `logAuditEvent` (`src/lib/audit/logger.ts`), which writes an immutable record to the `AuditLog` collection. The schema explicitly forbids updates or deletes, creating a verifiable trail of who performed what action, when, and to which entity.

## 3. Technology Deep-Dive

* **Next.js 14 (App Router):** Provides the foundational API layer and React server components. *Hard lesson:* When implementing the background cron jobs for late fees (`src/app/api/jobs/late-fees/route.ts`), we initially only exported a `POST` handler, which worked in local testing. However, Vercel Cron exclusively triggers using HTTP `GET`, meaning production would have silently failed with `405 Method Not Allowed` had we not caught it and exported identical logic on both methods.
* **TypeScript:** Ensures type safety across the stack, especially heavily utilized in defining the Mongoose document interfaces and API request bodies. *Hard lesson:* Extracting types from Mongoose schemas can lead to deeply nested, unreadable type errors when `PopulatedDoc` is misused across tenant boundaries.
* **MongoDB / Mongoose 9:** Serves as the primary data store with schema validations. *Hard lesson:* Mongoose 9 introduced a breaking change where `pre` hook callbacks no longer receive a `next` function; throwing an error is now required to signal validation failures, which required rewriting several custom validators including the tenant plugin.
* **JWT Auth:** Manages stateless authentication across the platform. We use short-lived access tokens with a refresh token rotation mechanism for better security without requiring centralized session lookups for every request.
* **Razorpay:** Powers the maintenance billing system. *Hard lesson:* Webhook idempotency is critical because Razorpay's delivery system guarantees "at least once" delivery, not "exactly once". If you don't handle duplicate event IDs gracefully, a user's bill balance could theoretically be credited twice.
* **Jest:** Used for the extensive integration test suite. Instead of mocking the database or using Supertest, our integration tests connect directly to a real MongoDB instance via Mongoose (`mongoose.connect(process.env.MONGODB_URI)`) and test the route handlers by directly invoking the `GET`/`POST` exported functions, passing them a mock `NextRequest`. This accurately tests the full execution context including tenant isolation boundaries.
* **GitHub Actions:** Our CI pipeline strictly gates deployments, running `lint`, `typecheck`, and `test`. *Hard lesson:* We experienced an incompatibility where `next lint` clashed with ESLint 9's new flat configs, causing the CI to fail on a fresh install despite passing locally. We had to specifically pin `eslint` and `eslint-config-next` in `package.json`.
* **Tailwind CSS:** Manages the entire Botanical design system via heavily customized tokens in `tailwind.config.ts`. *Hard lesson:* Trusting a design specification visually is dangerous; we had to actively compute contrast ratios between the bespoke `terracotta` alerts and `alabaster` backgrounds to catch WCAG failures before finalizing the design.

## 4. Key Architectural Decisions & Tradeoffs

| Decision | Reasoning & Tradeoffs |
| :--- | :--- |
| **AsyncLocalStorage + Mongoose Plugin for Tenancy** | *Reason:* Eliminates the bug class where developers forget `.where({ societyId })`.<br>*Tradeoff:* It introduces "magic" to the database layer. Background jobs require explicitly passing `{ unscoped: true }` which can be confusing to newcomers. |
| **JWT with Refresh Rotation vs Sessions** | *Reason:* Stateless architecture is highly scalable and reduces database load on every request.<br>*Tradeoff:* Immediate revocation of an access token is impossible until it expires; compromised tokens remain valid for their short TTL. |
| **Single-use Pre-approval Tokens** | *Reason:* Prevents a resident from sharing a generic QR code that could be abused for multiple unauthorized entries.<br>*Tradeoff:* High friction if a visitor accidentally closes the browser tab or if a group arrives in multiple cars. |
| **`Society.active` defaults to false** | *Reason:* Enforces an activation guard; a society cannot accept residents or payments until basic configurations (like emergency contacts) are verified.<br>*Tradeoff:* Requires a manual onboarding checklist that slows down adoption speed. |
| **Dual GET/POST exports for Cron** | *Reason:* Vercel Cron strictly sends `GET` requests, but manual triggering via Postman/cURL standardly uses `POST` for mutations.<br>*Tradeoff:* Slightly pollutes the API route file with duplicate HTTP method handlers routing to the same internal function. |

## 5. "Tell Me About a Bug You Debugged" — Real Stories

**1. The Disappearing Context (AsyncLocalStorage)**
* **Situation:** We wrote a test utility called `asUser` that wrapped API calls in an `AsyncLocalStorage` context to simulate tenant isolation during tests. However, the queries inside the block were executing completely un-scoped, leaking data everywhere.
* **Task:** Identify why `runWithTenantContext` was failing to apply the context to the Mongoose plugin.
* **Action:** I traced the execution flow and realized that the helper function was returning an un-awaited promise (`return fn()`). Because the promise was returned instantly to the caller, the synchronous execution block of `AsyncLocalStorage.run()` finished and tore down the context *before* the asynchronous database query inside the promise actually fired.
* **Result:** Adding a simple `await` (`return await fn()`) kept the scope alive until the database operation completed, instantly fixing the test leaks.

**2. The Silent Sparse Null Collapse**
* **Situation:** When building the Watchman visitor QR feature, I added a `unique: true, sparse: true` index on the `token` field so that only pre-approved visitors had unique tokens, while manual entries (which didn't have tokens) were ignored. But the database started throwing `E11000 duplicate key error` on the second manual entry.
* **Task:** Figure out why a sparse index was catching documents without tokens.
* **Action:** I reviewed the raw MongoDB documents and found that Mongoose was defaulting missing strings to `null`. A `sparse` index ignores documents where the field is completely *missing*, but it absolutely indexes documents where the value is explicitly `null`. 
* **Result:** I updated the schema to ensure the field was left `undefined` instead of `null`, preventing the duplicate key collision for manual visitor entries.

**3. The Vercel Cron 405 Trap**
* **Situation:** The automated late-fee calculation logic was built, tested locally via Postman (`POST /api/jobs/late-fees`), and merged.
* **Task:** Ensure the job runs cleanly on Vercel's Cron infrastructure.
* **Action:** While reviewing Vercel's documentation before deployment, I discovered that their cron scheduler strictly sends HTTP `GET` requests, regardless of whether the job mutates data. Since App Router strictly matches methods, Vercel would have received a silent `405 Method Not Allowed` every night.
* **Result:** I refactored the logic into a shared `runLateFeeJob` function and explicitly exported both `GET` and `POST` handlers, preventing a massive production failure on day one.

**4. The ESLint Flat Config Collision**
* **Situation:** The application passed `npm run lint` perfectly on my local machine. However, the GitHub Actions CI pipeline failed to deploy the initial build because of a linter crash complaining about plugin versions.
* **Task:** Resolve the CI pipeline failure to unblock deployments.
* **Action:** I discovered that my local machine wasn't failing because `node_modules` hadn't been reinstalled cleanly. However, the CI runner's fresh `npm ci` surfaced that an unpinned `eslint-config-next` was resolving to a version incompatible with Next.js 14, and the unpinned `eslint` was pulling down ESLint 9, which introduced a breaking "flat config" system.
* **Result:** I explicitly pinned both dependencies in `package.json` (`"eslint": "8.57.1"` and `"eslint-config-next": "14.2.35"`) to lock out the breaking changes, resulting in a stable and passing CI pipeline.

## 6. Likely Interview Questions & Model Answers

**Q: What happens if two watchmen scan the exact same pre-approval QR token at the exact same millisecond?**
*A: The application layer check might theoretically pass for both if the reads happen concurrently before the first write commits. However, we prevent this race condition entirely at the database level. The `Visitor` schema enforces a unique index on the `token` field. The second transaction attempting to save will be strictly rejected by MongoDB with a duplicate key error, which the backend catches and translates to an "already used" response.*

**Q: Why use a Mongoose plugin for multi-tenancy instead of just filtering in the API routes?**
*A: Security by default. If we rely on developers remembering to add `.where({ societyId: user.societyId })` to every single route, eventually someone will forget, leading to a catastrophic cross-tenant data leak. The scoping plugin intercepts queries centrally, meaning an unscoped query will throw a hard error unless explicitly permitted via an `{ unscoped: true }` override.*

**Q: How do you handle Razorpay webhook retries? If the same webhook is sent twice, do residents get double credit?**
*A: No, the webhooks are strictly idempotent. We rely on a unique sparse index on the `razorpayEventId` inside the `Payment` collection. If Razorpay re-delivers the exact same `payment.captured` event, the MongoDB uniqueness constraint prevents the duplicate record from saving, stopping the logic pipeline immediately without modifying the `MaintenanceBill` a second time.*

**Q: What was the hardest part about implementing JWTs with refresh tokens?**
*A: Ensuring smooth UX during token rotation. If a user has multiple tabs open and their access token expires, multiple API requests might fire simultaneously. Handling the concurrency so that the first failing request rotates the token, and the subsequent requests queue up and replay with the newly minted token (without redirecting the user to login), was a complex networking problem.*

**Q: What is the benefit of your Audit Log system being immutable?**
*A: True accountability. By defining `immutable: true` at the schema level and literally excluding `update` and `delete` hooks, we guarantee that no Admin can cover their tracks. If a complaint status was changed or a bill override was generated, the record of who did it and when is permanently engraved in the system.*

## 7. Honest Limitations & "What I'd Do Differently"

* **No Native Mobile App:** The Watchman portal is an offline-capable PWA, which works reasonably well but lacks native hardware integration (like ultra-fast native camera bindings or persistent push notifications). A React Native app would be a better long-term choice for that specific role.
* **Single Role Per Account:** Currently, a user's `role` is an immutable enum string tied to their account. A Super Admin cannot simultaneously be a Resident in their own society without creating a completely separate account with a different email address. A true RBAC implementation would abstract roles into a separate mapping table to allow multi-role flexibility.
* **Frontend/Backend Coupling:** Next.js App Router tightly couples the frontend UI to the backend API routes. While this sped up initial development, it makes it slightly harder to expose a clean, versioned REST API if we ever decide to build the aforementioned mobile applications.
* **Accessibility Testing:** We manually checked contrast ratios using WCAG math for our custom palettes (like the `terracotta` alerts against `alabaster` backgrounds), but we lack automated accessibility testing in the CI pipeline to enforce things like ARIA labels or keyboard navigation.
