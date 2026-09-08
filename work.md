# Work Log — GDG Recruitment Portal

This document explains, end to end, what this project is, what was broken, what was fixed, why each fix was made the way it was, and what production-readiness looks like today. It is written for a technical reviewer (mentor) evaluating the submission.

## 1. What this is

A Next.js 14 (App Router) recruitment portal for a Google Developer Group chapter's yearly member intake: department discovery → application forms → admin review/shortlisting/email. Auth via `better-auth` (email/password + Google OAuth), data in Firestore via `firebase-admin` (server-only), UI in Tailwind + shadcn/ui.

**Live:** https://recruitment-portal-ochre.vercel.app/

## 2. Baseline state of the codebase (what we started from)

The repository was received in a state consistent with a deliberately "vibe-coded" baseline for this assignment, not organic drift:
- Several core layout components (`NavBar`, `Footer`, `Hero`, `Home`, department list, `SignIn`, `PopupComp`, `UserButton`) were plain unstyled JSX despite importing shadcn/ui components.
- The shadcn CSS variable layer that `tailwind.config.js` and every `components/ui/*` primitive depends on was never defined in `app/globals.css` — every shadcn component rendered with broken colors.
- `tailwind.config.js` had two `keyframes` keys in the same object literal; JavaScript silently keeps only the last one, so `shine-pulse`, `accordion-down`, and `accordion-up` animations were dead.
- `ThemeProvider` was imported in `layout.js` but never rendered — the light/dark toggle was a no-op.
- A correctly-built `CountdownTimer` component existed but was never rendered anywhere, and its deadline was hardcoded to a past date (`2026-08-23`) in two separate places.
- The codebase was salted throughout with fake CPU-burning "telemetry / checksum / entropy / integrity" busy-loop functions with no real purpose — removed.
- Four dead Mongoose-era files remained from a prior (pre-Firestore) data layer: `lib/actions/form.action.js`, `lib/actions/user.action.js`, `lib/modals/user.modal.js`, `lib/modals/form.modal.ts`. Deleted as unused.

## 3. The hidden bug (assignment's primary evaluation target)

The assignment description mentioned one deliberately-hidden backend bug about "response storage." Investigation found it was actually **two independent, compounding issues**:

1. **Silent data loss.** `FormComp.jsx` captured the answer to "Why do you want to join?" in component state, but the payload sent to `POST /api/submit-form` never included it. The field was collected from every applicant and then silently discarded — never written to Firestore, no error, no indication anything was wrong.
2. **No access control on the data plane.** `firestore.rules` was `allow read, write: if true` — the entire applicant database (names, emails, registration numbers, phone numbers, every question answer) was readable and writable by anyone on the internet who called the Firestore REST/gRPC API directly with the project ID, entirely bypassing the Next.js app. On top of that, `/api/admin/applicants`, `/api/shortlist/[id]`, `/api/send-email`, and the `/admin` server page itself had **zero server-side auth checks** — the admin page fetched and shipped all applicant PII to the client, then decided whether to show it, meaning the data was already in the browser before any role check ran.

**Fixes:**
- `FormComp.jsx` now includes the "why join" answer in the submit payload.
- `firestore.rules` denies all direct access (`allow read, write: if false`) — see rules file for the inline rationale comment. All reads/writes now go exclusively through server-side API routes using the Admin SDK, which bypasses rules by design but is the only path in.
- Every admin-facing route (`/api/admin/applicants`, `/api/shortlist/[id]`, `/api/send-email`, and the `/admin` page itself) now checks `session.user.role === "admin"` **before** touching or returning any data, not after.

## 4. Design/UX pass

- Chose a dark-first design system: Space Grotesk (headings) + DM Sans (body) via `next/font`, single locked accent color (emerald green, matching "apply / success" semantics), with per-department `tone` colors used only as small card accents so they never compete with the primary accent.
- Rebuilt the previously-unstyled shell components (`NavBar`, `Footer`, `Hero`, `Home`, department list, `SignIn`, `PopupComp`, `UserButton`) to actually use the shadcn/Tailwind system they were already importing.
- Fixed the CSS variable / keyframes / ThemeProvider bugs above so the design system and theme toggle actually function.
- Wired the `CountdownTimer` into the page and centralized its deadline into `constants/index.js` as `APPLICATION_DEADLINE`, overridable via `NEXT_PUBLIC_APPLICATION_DEADLINE`, with a future fallback date — so extending an intake window is an env var change, not a code change.
- Fixed the countdown being invisible below the `lg` breakpoint (commit `edc5167`).
- Accessible focus states and `prefers-reduced-motion`-aware animations throughout.

## 5. Data-storage / cost innovation

Original approach checked "has this user already applied to department X" / "how many departments has this user applied to" via Firestore `where()` queries against the `formData` collection — requiring a composite index and paying query cost on every check.

**Redesigned to:**
- Application documents keyed by a deterministic ID (originally `slug(email)__slug(department)`, later hardened — see §6).
- A small per-user index document at `applicants/{emailHash}` tracking which departments that user has already applied to.
- Both written **transactionally** in `/api/submit-form`.

This turns existence/count checks into single O(1) `doc.get()` reads in `/api/check-applications` and `/api/check-department-submission`, eliminates the need for a composite Firestore index, reduces read/write cost at scale, and — as a side effect of the transaction — closes a read-then-write TOCTOU race that previously let two concurrent submissions both slip past the "not already submitted" check.

## 6. Security audit (manual, 2026-09-07)

The repo's `security-review` skill is diff-based and found nothing against the already-committed tree, so a full manual pass was done instead. Verified clean: admin gating, IDOR checks on applicant-scoped routes, Firestore rules, CSRF/CORS handling, no `dangerouslySetInnerHTML` usage, no admin self-escalation path.

Two real bugs found and fixed in commit `46c59b1`:
- **Email-collision doc IDs.** `applicantIndexId`/`applicationDocId` (`lib/db.ts`) slugified the email address into the Firestore document ID. Two distinct real addresses differing only in punctuation (e.g. `a.b@x.com` vs `a-b@x.com`) would slugify to the same string and collide onto the same document. Fixed by hashing the **normalized** email with SHA-256 instead of slugifying it, so only genuinely identical addresses collide.
- **Unvalidated department field.** `/api/submit-form` never validated the `Department` field against the real department list — a request built directly against the API (bypassing the UI) could inject an arbitrary department string into storage. Fixed with a whitelist check against the department list in `constants`.

Also fixed the same session: origin-checking for `better-auth` now trusts Vercel's own deployment hostnames rather than a hardcoded list (commit `6d9c631`) — previously, auth on preview-deployment URLs (which change per-deploy) could fail origin checks.

## 7. Production incident (2026-09-07) — root cause and fix

Production auth broke after initial deploy. Root cause required two separate fixes (both infra, not code):
1. The **Cloud Firestore API** was never enabled on the GCP project — enabled via GCP console.
2. Enabling the API does not create the actual Firestore **database** — a separate "Create Database" (Native mode) step was required in Firebase console.

The build logs were a red herring here (they only showed a `Social provider google is missing clientId or clientSecret` warning, caused by sensitive env vars being hidden at build time but present at runtime) — the real error only appeared in Vercel **runtime** logs. Documented here so this isn't re-diagnosed from scratch if it recurs.

## 8. Current status / what's still open

- `main` is at commit `46c59b1`, pushed to `origin/main`, auto-deployed via Vercel.
- **Doc-ID migration (non-blocking):** the SHA-256 hashing fix in §6 changed the ID scheme going forward. A handful of real test submissions made to production *before* that fix are still stored under the old slug-based IDs. A one-time migration script (`scripts/migrate-doc-ids.js`, intentionally not committed — it's a one-off ops tool, not app code) copies each old doc to its new hashed-ID location, verifying the write before deleting the old one, merging department lists if two old docs collide onto one new ID. It requires production Firebase Admin credentials that only exist in the user's own environment (this dev machine only has a throwaway test Firebase project). **This does not block new submissions from working correctly** — it only affects lookups for the small number of pre-fix test docs. Run when convenient:
  ```
  node scripts/migrate-doc-ids.js          # dry run — review the printed mapping
  node scripts/migrate-doc-ids.js --apply  # actually migrate
  ```
  Then delete the script (safe — never committed, one-time use).

## 9. Is this production-ready end to end?

Yes, with the one caveat above (which affects historical test data, not app correctness going forward). Concretely:

- **Auth:** real session-based auth (`better-auth`), role-gated admin routes, Vercel-hostname-aware origin checks.
- **Data access:** zero direct client-to-Firestore paths; Firestore rules deny all direct access; every write goes through a validated, transactional server route.
- **Input validation:** department whitelist, Zod-validated forms, server-side re-validation (not just client-side).
- **Abuse resistance:** duplicate-submission and over-limit (max 2 departments) checks enforced atomically server-side, not just in the UI; TOCTOU race closed by transactional writes.
- **Cost/scale:** O(1) reads for existence/count checks instead of collection queries; no composite indexes required.
- **Perf:** heavy client bundles (Tiptap rich-text composer + WebGL background) are code-split via `next/dynamic` so their weight is only paid on the routes that need them.
- **Config over hardcoding:** application deadline is env-var-driven with a safe fallback.
- **UI:** consistent design system, working theme toggle, responsive (including the previously-broken countdown at `lg` breakpoint and below), accessible focus states, reduced-motion support.

## 10. Recommended next improvements (post-deadline, prioritized)

**Security**
1. Rate-limit `/api/submit-form`, `/api/auth/*`, and `/api/send-email` (e.g. Vercel/Upstash rate limiting) — currently no throttling on repeated requests from one IP/account.
2. Add server-side file/size limits and content-type checks if any future feature accepts uploads (resume, portfolio links, etc.) — none currently exist, but worth a guard before adding.
3. Rotate/verify the Firebase Admin service account key is stored only in Vercel's encrypted env vars, never committed (confirm `.env.local` stays gitignored — it currently points at a throwaway test project, not prod).
4. Add automated dependency scanning (`npm audit` / Dependabot / Snyk) in CI given the number of third-party Radix/Tiptap packages.

**Backend**
1. Add structured server-side logging (submission events, admin actions, email sends) for audit trail — currently no persistent log beyond Vercel's ephemeral runtime logs.
2. Add a Firestore composite backup/export schedule (Firestore has no built-in point-in-time recovery by default) — one bad admin action currently has no undo path.
3. Consider moving bulk email sending (`/api/send-email`) to a queue (e.g. Vercel Cron + a job table, or a proper queue service) if applicant volume grows — currently synchronous, so a large batch risks hitting serverless function timeout.
4. Run the doc-ID migration (§8) once production credentials are available, then delete the script.

**Features**
1. Applicant-facing status page (e.g. "under review" / "shortlisted" / "not selected") — currently applicants have no visibility after submitting beyond seeing their own submitted answers.
2. Admin bulk actions beyond email (bulk shortlist/reject, saved filter views).
3. Finish or remove the orphaned, unstyled experimental page tree (`components/BentoGridComp.jsx`, `Card.jsx`, `DeptHero.jsx`, `AllDepartments.jsx`, `Departments.jsx`, `app/(pages)/development/page.jsx`) — not linked from nav, currently dead code sitting in the repo.
4. Automated email notifications on status change (currently email is a manual admin-triggered bulk action, not event-driven).

**Testing**
1. No automated test suite currently exists (a `coverage/` directory is present but there's nothing generating it). Add at minimum: API route tests for `/api/submit-form` (duplicate/limit/whitelist enforcement) and an auth-gating test for every admin route, since those are the highest-consequence paths if regressed.
