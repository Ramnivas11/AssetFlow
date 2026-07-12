# AssetFlow — Phase-by-Phase AI Build Prompts

**How to use this document:** each phase below is a **complete, self-contained prompt**. Paste one phase at a time into your AI coding agent (Claude Code, Antigravity, Cursor, etc.), let it finish, run the verification checklist yourself, then move to the next phase. Don't paste multiple phases at once — the whole point of phasing is that each one is a checkpoint you confirm before more code gets built on top of it. Each prompt repeats the global context so it works standalone even in a fresh agent session.

---

## PHASE 0 — Foundation

```
ROLE: You are building "AssetFlow," an Enterprise Asset & Resource Management System, as a production-grade Next.js application. This is Phase 0 of 6 — foundation only. Do not build any feature screens yet.

TECH STACK (fixed for the whole project, do not substitute):
- Next.js 15, App Router, TypeScript (strict mode)
- Tailwind CSS + shadcn/ui (installed via `npx shadcn@latest init`, components added individually via the CLI as needed — never hand-copy from a template site, never use an unrelated UI kit)
- PostgreSQL via Prisma ORM
- Auth.js (NextAuth v5) with the Credentials provider
- Redis (Upstash) + BullMQ for background jobs (infra only in this phase, no jobs yet)
- Vitest for unit tests, Playwright for E2E tests
- GitHub Actions for CI
- Deploy target: Vercel (app) + Neon or Supabase (Postgres) + Upstash (Redis)

ARCHITECTURE (fixed for the whole project — explain this back to me before writing code, in your own words, to confirm you understand it):
- Three-layer separation: (1) API route handlers in src/app/api/** are THIN — they only check auth/session, validate input with Zod, and call a service function; (2) all business logic lives in src/lib/services/*.ts as pure, testable functions that take plain arguments and a Prisma client, not Next.js request/response objects; (3) Prisma is the only data access layer, no raw queries outside of the two documented exceptions below.
- Two business rules MUST be enforced at the database level, not just in application code, because they are concurrency-sensitive:
  1. "An asset can only have one ACTIVE allocation at a time" — enforce via a Postgres PARTIAL UNIQUE INDEX on AllocationRecord(assetId) WHERE status = 'Active'. Write this as a raw SQL block in a Prisma migration (`prisma migrate dev --create-only` then edit the generated SQL), since Prisma's schema DSL cannot express partial indexes directly — confirm this approach, don't try to force it through the Prisma schema.
  2. "A bookable asset cannot have two overlapping bookings" — enforce via a Postgres EXCLUSION CONSTRAINT using the btree_gist extension, on Booking(assetId, tstzrange(startAt, endAt)). This also requires a raw SQL migration and enabling the btree_gist extension first.

SCOPE FOR THIS PHASE ONLY:
1. Initialize the Next.js + TypeScript + Tailwind project. Confirm `npm run build` succeeds before continuing.
2. Run `npx shadcn@latest init`, and add these initial components: button, card, input, label, table, badge, dialog, tabs, select, form, dropdown-menu. Pick one accent color (not the shadcn default slate/zinc — choose something distinct) and one heading font, set them in the Tailwind theme / globals.css. This is the app's entire visual identity — decide once, do not revisit later in this or any future phase.
3. Initialize Prisma. Build the FULL schema now (even though most tables won't be used until later phases) so later phases never need destructive migrations:
   User (id, name, email unique, passwordHash, role enum [Employee, DepartmentHead, AssetManager, Admin], departmentId FK nullable, status enum [Active, Inactive], twoFactorSecret nullable, deletedAt nullable, createdAt, updatedAt)
   Department (id, name, headUserId FK nullable, parentDepartmentId FK nullable self-reference, status, deletedAt, createdAt, updatedAt)
   AssetCategory (id, name, customFields Json nullable, deletedAt, createdAt, updatedAt)
   Asset (id, tag unique, name, categoryId FK, serialNumber, acquisitionDate, acquisitionCost Decimal, condition, location, isBookable boolean, status enum [Available, Allocated, Reserved, UnderMaintenance, Lost, Retired, Disposed], currentHolderUserId FK nullable, currentHolderDeptId FK nullable, deletedAt, createdAt, updatedAt)
   AllocationRecord (id, assetId FK, holderUserId FK, holderDeptId FK nullable, allocatedAt, expectedReturnAt nullable, returnedAt nullable, returnConditionNote nullable, status enum [Active, Returned, Transferred], createdAt)
   TransferRequest (id, assetId FK, requestedByUserId FK, fromHolderUserId FK, toUserId FK, status enum [Requested, Approved, Rejected, Completed], approvedByUserId FK nullable, createdAt, updatedAt)
   Booking (id, assetId FK, bookedByUserId FK, startAt, endAt, status enum [Upcoming, Ongoing, Completed, Cancelled], createdAt, updatedAt)
   MaintenanceRequest (id, assetId FK, raisedByUserId FK, issueDescription, priority enum [Low, Medium, High], status enum [Pending, Approved, Rejected, Assigned, InProgress, Resolved], approvedByUserId FK nullable, technicianNote nullable, createdAt, updatedAt)
   AuditCycle (id, scopeDeptId FK nullable, scopeLocation nullable, startDate, endDate, status enum [Open, Closed], createdAt, updatedAt)
   AuditItem (id, auditCycleId FK, assetId FK, auditorUserId FK, result enum [Pending, Verified, Missing, Damaged], createdAt, updatedAt)
   ActivityLog (id, userId FK, action, entityType, entityId, metadata Json nullable, createdAt) — no update/delete access will ever be built for this table, design it write-only from the start
   Notification (id, userId FK, message, type, isRead boolean default false, createdAt)
   Document (id, entityType, entityId, url, uploadedByUserId FK, uploadedAt) — polymorphic attachment table, do not create separate photo columns on other tables
   ScheduledJob (id, jobType, ranAt, status, details Json nullable)
   All FKs ON DELETE RESTRICT. Index Asset.status, Asset.categoryId, Booking(assetId, startAt), AllocationRecord.assetId.
4. Write the two raw-SQL migrations for the partial unique index and exclusion constraint described above. Verify both constraints actually reject conflicting inserts with a throwaway manual test (temporary script is fine, delete it after confirming).
5. Write a seed script (prisma/seed.ts): 2 departments (one with the other as parent, to exercise hierarchy), 2 asset categories, 5 users spanning all 4 roles, 5 assets in varied lifecycle states. Make this idempotent (safe to re-run).
6. Set up Auth.js: signup endpoint that ALWAYS creates role=Employee server-side regardless of any role field in the request body, login, session handling, bcrypt password hashing. Do not build 2FA yet (that's Phase 3) but add the twoFactorSecret column now so no later migration is needed for it.
7. Set up GitHub Actions CI: on every PR, run lint, typecheck, and unit tests (there will be very few unit tests yet — that's fine, the pipeline just needs to exist and pass).
8. Deploy the skeleton to Vercel, connected to a real Postgres (Neon/Supabase) and Redis (Upstash) instance. Confirm the deployed URL loads and can log in with a seeded user.

OUT OF SCOPE (do not build yet): any feature screen beyond login, background jobs actually running, file upload, 2FA, any UI beyond the bare app shell (header + empty content area).

DELIVERABLE / VERIFICATION: Before declaring this phase done, confirm all of the following and show me the evidence:
- `npm run build` succeeds
- `prisma migrate dev` runs clean, including the two raw-SQL constraint migrations
- The exclusion constraint and partial unique index each demonstrably reject a conflicting insert (show the test)
- Seed script runs and produces the described data
- A seeded user can sign up / log in at the deployed Vercel URL
- CI is green on a test PR
- Explain in 3-5 sentences why the service-layer pattern was chosen over putting logic directly in route handlers
```

---

## PHASE 1 — Core Workflows (the demo-critical path)

```
ROLE: Continuing AssetFlow. Phase 0 (foundation: schema, auth, CI, deploy pipeline) is complete and verified. This is Phase 1 — build the core workflows that form the app's primary demo path. Write unit and E2E tests alongside each feature, not after all features are done.

REMINDER OF FIXED ARCHITECTURE: thin API routes → service layer (src/lib/services/*.ts, pure functions) → Prisma. The allocation-conflict rule and booking-overlap rule are enforced at the DATABASE level (already built in Phase 0) — your service-layer code must handle the resulting DB errors gracefully and translate them into clear API error responses, not attempt to duplicate the check purely in application logic (that would reintroduce the race condition the DB constraint exists to prevent).

SCOPE FOR THIS PHASE:

1. Org Setup screen (Admin only, three tabs using the shadcn Tabs component):
   - Tab A: Department CRUD — create/edit/deactivate, assign head user, optional parent department, status toggle
   - Tab B: Asset Category CRUD — create/edit, name + optional customFields (simple key-value pairs stored in the Json column, basic UI for now — a proper dynamic form builder is a later-phase concern, not now)
   - Tab C: Employee Directory — list all users (name, email, department, role, status), and a "Promote" action that is the ONLY place in the entire app a user's role can change (to DepartmentHead or AssetManager). This endpoint must re-verify the caller is Admin server-side even though the UI already hides it from non-admins.

2. Asset Registry screen:
   - Register form: name, category (dropdown from Tab B), auto-generated tag (format AF-0001, incrementing, generate server-side inside a transaction to avoid duplicate-tag races), serial number, acquisition date, acquisition cost, condition, location, isBookable toggle. New assets always start at status=Available.
   - List view (shadcn Table) with filter/search by tag, category, status, department, location.
   - Status shown via a Badge component, with ONE consistent color mapping used everywhere in the app from now on: Available=green, Allocated=blue, Reserved=purple, UnderMaintenance=amber, Lost=red, Retired=gray, Disposed=dark gray. Define this mapping once as a shared constant, import it everywhere — do not redefine colors per screen.
   - Per-asset detail view showing allocation history (from AllocationRecord) — maintenance history will be empty until Phase 2, leave the section present but empty-stated.

3. Asset lifecycle state machine (src/lib/services/assetLifecycle.ts): an explicit whitelist of valid (from, to) status transitions as a data structure (e.g. a Map or object), not scattered if/else logic. At minimum: Available↔UnderMaintenance, Available→Allocated, Allocated→Available, Available/Allocated→Lost/Retired/Disposed. Any transition not in the whitelist throws a typed error the API layer translates to a 400 with a clear message. Write unit tests covering both valid and invalid transitions.

4. Allocation & Transfer screen:
   - Allocate: pick an employee or department, optional expected return date. On submit, attempt to create an AllocationRecord with status=Active. If the DB partial-unique-index rejects it (asset already actively allocated), catch that specific error, look up who currently holds it, and return a structured response like { conflict: true, heldBy: { name, ... } } — the frontend uses this to show "Currently held by X" inline PLUS a "Request Transfer" button, not a generic error toast. This exact interaction is the app's signature moment — make the UI genuinely good here, not an afterthought.
   - Transfer workflow: Employee/Asset Manager requests a transfer (creates TransferRequest, status=Requested) → Asset Manager or the relevant Department Head approves/rejects → on approval, mark the old AllocationRecord as Transferred, create a new Active AllocationRecord for the new holder, mark TransferRequest as Completed. All of this happens inside a single Prisma transaction.
   - Return flow: mark the active AllocationRecord as Returned with a returnedAt timestamp and a condition check-in note; asset status transitions Allocated→Available via the lifecycle service.
   - Overdue detection: for now, compute this at query time in the dashboard/list queries (allocations past expectedReturnAt with status still Active) — a real background job comes in Phase 3, don't build one yet.

5. Resource Booking screen:
   - Only assets with isBookable=true are selectable.
   - Time-slot booking form (start/end datetime). On submit, attempt to insert into Booking. If the exclusion constraint rejects it, catch that specific DB error and return a structured conflict response including which existing booking it conflicts with (so the UI can say "conflicts with an existing booking from X to Y", not a generic error).
   - List/calendar-lite view of a resource's upcoming bookings (a simple sorted list grouped by date is sufficient — a full drag/drop calendar UI is future scope, don't build one).
   - Cancel action, sets status=Cancelled.

6. Dashboard screen: KPI cards (shadcn Card or Tremor, your choice, but be consistent) for Assets Available, Assets Allocated, Maintenance Today (will show 0 until Phase 2 exists — that's fine), Active Bookings, Pending Transfers, Upcoming Returns. Overdue returns shown in a visually distinct section from upcoming ones (not just a different color, actually a separate list/heading). Quick-action buttons linking to Register Asset / Book Resource (Raise Maintenance Request button can link to a "coming soon" or simply be added once Phase 2 exists — your call, keep it simple).

7. Role-scoped visibility, enforced server-side in every service function that reads data (not just hidden in the UI): Department Head sees only their department's assets/allocations/bookings; Employee sees only their own allocations/bookings plus general resource availability; Admin and Asset Manager see everything.

8. Write a Playwright E2E test covering the full demo path in one flow: signup → admin login (seeded) → admin promotes the new user to Asset Manager → login as that user → register an asset → allocate it to Employee A → attempt to allocate the same asset to Employee B and assert the conflict response + transfer-request UI appears → complete a transfer → book a resource for a time slot → attempt an overlapping booking and assert rejection → book a non-overlapping adjacent slot and assert success → return the original asset and assert status reverts to Available. This test must pass in CI before this phase is considered done.

OUT OF SCOPE for this phase: Maintenance, Audit Cycles, Reports/Analytics, real Notifications (a stub/empty screen is fine if you need a placeholder route), file uploads, background jobs, 2FA. Do not start any of these yet even if it seems quick — finish and fully verify this phase first.

DELIVERABLE / VERIFICATION:
- Unit tests pass for the lifecycle state machine, allocation conflict handling, and booking overlap handling
- The full Playwright E2E path described above passes in CI
- Manually demo the conflict UI for both allocation and booking and confirm the messaging is specific (who holds it / what it conflicts with), not generic
- Confirm Department Head and Employee accounts genuinely cannot see other departments' data via a direct API call, not just that the UI hides it
```

---

## PHASE 2 — Remaining Spec Screens

```
ROLE: Continuing AssetFlow. Phases 0-1 are complete and verified (foundation + the full core demo path with passing E2E tests). This is Phase 2 — build the remaining screens from the original problem statement: Maintenance, Audit Cycles, Reports & Analytics, and real Notifications/Activity Log.

REMINDER: same three-layer architecture, same lifecycle-status color mapping (do not redefine it), same server-side role scoping pattern established in Phase 1. Reuse the ActivityLog table for every mutation from this point forward — every service-layer write in this phase (and retroactively, if easy, in Phase 1's services) should also write an ActivityLog entry: who did what, when, to which entity. This table is write-only, no update/delete API will ever exist for it.

SCOPE FOR THIS PHASE:

1. Maintenance Management screen:
   - Raise request: select asset, describe issue, set priority (Low/Medium/High). Attach a photo (use the Document table — a simple file input storing to a temporary/local path is fine for THIS phase; real S3 presigned uploads come in Phase 3, don't build cloud storage yet, just get the Document table wired up with a placeholder storage mechanism you'll swap in Phase 3).
   - Workflow: Pending → Approved/Rejected (Asset Manager only) → Technician Assigned (free-text technician name/note is fine, no separate technician user role needed) → In Progress → Resolved.
   - On Approved, asset status auto-transitions to UnderMaintenance via the lifecycle service (reuse it, do not duplicate transition logic). On Resolved, reverts to Available.
   - Maintenance history displayed on the Asset Registry detail view (Phase 1 left this section empty-stated — populate it now).

2. Asset Audit screen:
   - Create Audit Cycle: scope (department and/or location), date range, assign one or more auditors (multi-select from Employee Directory).
   - For an open cycle, generate AuditItem rows for every in-scope asset with result=Pending.
   - Auditor view: for cycles they're assigned to, mark each asset Verified/Missing/Damaged.
   - Discrepancy report: auto-generated view/export listing all Missing/Damaged items for a cycle.
   - Close Audit Cycle: locks further edits (status=Closed), and for any item marked Missing, transition the underlying asset's status to Lost via the lifecycle service.
   - Audit history retained and viewable per past cycle.

3. Reports & Analytics screen:
   - Asset utilization trends (most-used vs. idle, derived from AllocationRecord duration/frequency)
   - Maintenance frequency by asset/category
   - Assets due for maintenance or nearing retirement (define "nearing retirement" as a simple heuristic, e.g. acquisitionDate + a configurable age threshold — state your assumption in a code comment since the spec doesn't define this precisely)
   - Department-wise allocation summary
   - Resource booking heatmap (peak usage windows, a simple day/hour grid is sufficient, not a fancy visualization library)
   - CSV export for at least the department-wise summary and the discrepancy report; use a simple server-side CSV generation, no PDF yet (PDF export is Phase 3/4 territory per the existing plan — confirm this against the project's roadmap doc if you have access to it, otherwise proceed with CSV only for now)

4. Notifications & Activity Log screen:
   - In-app notification feed per user (list, mark-as-read), generated from key events: asset allocated, transfer approved, booking confirmed/cancelled, maintenance approved/rejected, overdue return alert, audit discrepancy flagged. Trigger these from the relevant service-layer functions (the same places now writing to ActivityLog) — one write path, two tables.
   - Full Activity Log view (Admin-visible, or scoped per role — Admin sees all, others see only entries relevant to entities they have access to): who did what, when, filterable by entity type/date.
   - Real email sending is NOT in scope yet (that's Phase 3) — notifications are in-app only for now.

5. Retrofit check: confirm every Phase 1 service-layer mutation (allocate, transfer, return, book, cancel booking) also writes an ActivityLog entry. If Phase 1 skipped this, add it now — this is a small, mechanical addition, not a refactor of the underlying logic.

OUT OF SCOPE for this phase: real file storage (S3), real email, background jobs, 2FA, rate limiting, any Section-3/3.1-style additional feature (CSV import, QR codes, depreciation, etc.) — those are later phases, do not pull them forward even if convenient.

DELIVERABLE / VERIFICATION:
- Unit tests for the audit cycle closing logic (Missing items correctly flip assets to Lost) and the maintenance approval state transitions
- Manually verify: raising a maintenance request, approving it, confirming the asset shows UnderMaintenance, resolving it, confirming it reverts to Available, and that this shows up in both the asset's maintenance history and the Activity Log
- Manually verify: creating an audit cycle, marking one item Missing, closing the cycle, and confirming that asset's status is now Lost
- Confirm CSV exports produce valid, correctly-formatted files
```

---

## PHASE 3 — Production Hardening

```
ROLE: Continuing AssetFlow. Phases 0-2 are complete: full spec (all 10 screens) is built and functionally verified. This is Phase 3 — production hardening. No new user-facing features in this phase; the goal is making the existing system reliable, secure, and observable.

SCOPE FOR THIS PHASE:

1. Background jobs (BullMQ + Redis, infra already provisioned in Phase 0):
   - Overdue-return detection job: runs on a schedule (e.g. hourly), scans for allocations past expectedReturnAt still Active, and generates/updates Notification entries (do not duplicate notifications on every run — check if one already exists for this overdue allocation before creating another).
   - Booking-reminder job: notifies the booker some fixed time before their booking starts (e.g. 30 minutes — state this as an assumption/config value, the spec doesn't specify).
   - Audit-cycle reminder job: notifies assigned auditors of cycles nearing their end date with unverified items remaining.
   - Every job run writes a row to ScheduledJob (jobType, ranAt, status, details) for observability — this is how you'll demonstrate the jobs are actually running reliably, not just "trust me."
   - Move the overdue-detection logic that Phase 1 computed at query-time into this job instead; the dashboard/list queries can now read the precomputed flag/notification rather than recomputing on every page load.

2. Real file storage: replace Phase 2's placeholder Document storage with actual S3-compatible storage (Cloudflare R2 or AWS S3) using presigned upload URLs — the client uploads directly to storage, the server only issues the presigned URL and records the resulting URL in the Document table. Validate MIME type and file size server-side BEFORE issuing the presigned URL, not just client-side.

3. Real transactional email (Resend or SES): password reset flow (finally make this real, Phase 0's forgot-password was a stub), and route the notification events from Phase 2 to also send email for high-priority ones (overdue return, maintenance approval/rejection, transfer approval) — not every single in-app notification, that would be spammy; use judgment on which events warrant email and state your reasoning.

4. 2FA (TOTP) for Admin and Asset Manager roles: enrollment flow (generate secret, show QR code via the `qrcode` package, verify a code to confirm enrollment), and require a valid TOTP code at login for these two roles once enrolled. Use a well-known library (otplib) — do not hand-roll any cryptographic code.

5. Rate limiting on auth endpoints (login, signup, password reset) and on mutation endpoints generally, via Upstash Ratelimit or equivalent middleware — not just an in-memory counter, this needs to survive serverless cold starts.

6. Observability: integrate Sentry for error tracking (both client and server side). Add structured logging for service-layer errors.

7. Soft deletes: implement deletedAt filtering as a standard pattern across every service-layer query for Department, AssetCategory, User, Asset — these should never be hard-deleted given they have history attached (AllocationRecord, Booking, MaintenanceRequest referencing them). Add a "deactivate" UI action wherever a "delete" action currently exists for these entities, since the schema already has status/deletedAt fields for this from Phase 0.

8. Security pass: confirm CSRF protection is active (Auth.js default), add basic security headers (CSP, etc.), confirm no secrets exist in the repo or client bundle, confirm every API route re-validates role/session server-side (do a full audit pass over every route from Phases 1-2, this is the point of this phase).

OUT OF SCOPE: any new user-facing feature from Section 3/3.1's list (CSV import, QR codes, depreciation, dark mode, etc.) — those are Phase 4/5, do not build them here even if related infrastructure (like file storage) makes them tempting to start early.

DELIVERABLE / VERIFICATION:
- Manually trigger each background job and confirm a ScheduledJob row is created and the expected notification/email results
- Confirm a file upload actually round-trips through real object storage (upload, retrieve, display)
- Confirm 2FA enrollment and login-with-2FA works for an Asset Manager account
- Confirm a rate-limited endpoint actually blocks after the configured threshold
- Confirm Sentry receives a deliberately-triggered test error
- Confirm a "deleted" Department/Asset/User is excluded from active lists but its historical records (past allocations, bookings) remain intact and viewable
```

---

## PHASE 4 — First-Wave Additional Features

```
ROLE: Continuing AssetFlow. Phases 0-3 are complete: full spec built, production-hardened (jobs, storage, email, 2FA, security). This is Phase 4 — the first-wave additional features that go beyond the original spec but deliver real value. Build in the priority order listed; if time runs out partway through, stop at a clean feature boundary rather than leaving one half-built.

SCOPE FOR THIS PHASE, IN THIS ORDER:

1. CSV bulk import for assets and employees: an upload UI, server-side parsing and validation (reuse Zod schemas where possible), and a per-row error report for failed imports (don't silently skip bad rows — show the user exactly which rows failed and why). Successful rows should go through the same service-layer functions as manual entry (e.g. asset creation still gets an auto-generated tag), not a separate bypass path.

2. QR code generation + scan-to-lookup: generate a QR code per asset (encoding the asset's tag or a lookup URL) displayed on the asset detail page and available as a printable label. Build a scan page (can use the device camera via a lightweight browser QR-scanning library) that looks up and navigates to the matching asset.

3. Asset depreciation tracking: straight-line depreciation calculated from acquisitionCost and acquisitionDate plus a per-category useful-life assumption (add a usefulLifeYears field to AssetCategory if not already present from Phase 0's customFields — decide whether this belongs as a first-class column or inside customFields, and state your reasoning). Display current book value on the asset detail page and include it in the Reports screen.

4. Dark mode via shadcn/Tailwind's built-in theming — should require minimal custom work given shadcn's theme provider; verify every screen (not just the ones built in Phase 1) is actually legible in dark mode, don't just flip the toggle and assume it's fine.

5. Slack/webhook notification integration: reuse the existing Notification/ActivityLog event stream from Phase 2/3 — add a webhook delivery option (configurable per-org or per-user, your call, state the assumption) that POSTs the same event data already being generated, rather than building a parallel notification path.

OUT OF SCOPE: anything from Section 3.1's extended backlog (warranty alerts, recurring bookings, offboarding checklist, etc.) or SSO — those are Phase 5, do not pull them forward.

DELIVERABLE / VERIFICATION:
- Import a CSV with at least one deliberately invalid row and confirm the error report correctly identifies it while valid rows still succeed
- Scan a generated QR code (or paste its encoded value into the lookup page) and confirm it navigates to the correct asset
- Confirm depreciation figures are mathematically correct against a hand-calculated example
- Confirm dark mode renders correctly across at least the Dashboard, Asset Registry, and Booking screens
- Confirm a webhook fires with the correct payload for at least one real event (e.g. allocation)
```

---

## PHASE 5 — Extended Backlog (v2)

```
ROLE: Continuing AssetFlow. Phases 0-4 are complete. This is Phase 5 — pull from the extended feature backlog based on remaining time and team interest. Unlike prior phases, this one is intentionally a menu, not a fixed checklist — pick items in roughly this order, but stop building new items once you're running low on time rather than half-finishing several.

SUGGESTED ORDER (lower effort / high value first):
1. Warranty & insurance expiry tracking with proactive alert notifications (reuses AssetCategory.customFields or a promoted first-class field, and the existing Notification pipeline from Phase 2/3 — no new infrastructure needed)
2. Bulk actions on the Asset Registry table (bulk reassign department, bulk status update) — reuses existing service-layer functions per-row, this is a UI batching feature, not new business logic
3. Employee offboarding checklist: deactivating a User (soft delete from Phase 3) should auto-flag all their currently-held active allocations for return/reallocation, surfaced to their Department Head or Asset Manager as an actionable list — this closes a real gap where deactivation currently orphans allocations silently
4. Recurring bookings: extend the Booking model/UI to support a recurrence rule (e.g. weekly for N occurrences) that creates multiple Booking rows up front, each still individually subject to the overlap exclusion constraint — a recurring request should partially succeed and report which occurrences failed due to conflicts, not all-or-nothing fail
5. Vendor/external contractor tracking on MaintenanceRequest: add vendor name and cost fields, surface vendor cost in the Reports screen's maintenance-frequency-by-category view

FURTHER OPTIONS if time remains (lower priority, higher effort — confirm with me before starting any of these, since they're larger scope commitments): SLA tracking on maintenance requests, photo evidence capture during audits, "ghost asset" anomaly detection (assets unseen across multiple audit cycles), suggested-alternative-resource on booking conflict, digest emails, calendar sync (Google/Outlook), configurable multi-level approval chains, approval delegation, a public read-only API with API keys, offline-capable audit mode (PWA), HRIS sync, SSO.

DELIVERABLE / VERIFICATION for each item you build: state which item you're building before starting, confirm it reuses existing service-layer/notification/activity-log infrastructure rather than duplicating it, and provide a short manual verification step per item before moving to the next.
```

---

## PHASE 6 — Polish & Demo Prep

```
ROLE: Continuing AssetFlow. All prior phases you've reached are functionally complete. This is Phase 6 — no new features, just consistency, realistic data, and demo readiness.

SCOPE:
1. UI consistency pass across every screen built so far: confirm loading, empty, and error states exist everywhere a list or async data appears (this is the single most common "unfinished" tell — audit for it specifically, screen by screen). Confirm the lifecycle-status color mapping from Phase 1 is applied identically everywhere, no drift.
2. Replace the Phase 0 seed script with a richer, realistic dataset: multiple departments, enough employees/assets to make the Dashboard and Reports screens look genuinely populated rather than sparse, some assets in every lifecycle state, some overdue allocations/bookings so those UI states are visible without manual setup.
3. Full dry-run of the primary demo path (the same one from Phase 1's E2E test, plus whichever later-phase features you want to showcase) end-to-end on the deployed URL, not localhost.
4. Prepare short talking points on: the service-layer architecture decision, the two DB-level concurrency constraints (partial unique index, exclusion constraint) and why they're correct over application-level checks, and one or two features from Phase 4/5 that best demonstrate the system's depth.

DELIVERABLE: confirm the deployed URL runs the full demo path twice without errors, and that every team member can explain the architecture decisions above unscripted.
```