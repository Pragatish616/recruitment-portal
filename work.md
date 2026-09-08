# Work Log — GDG Recruitment Portal

This document explains, end to end, what this project is, what was broken, what was fixed, why each fix was made the way it was, and what production-readiness looks like today. It is written for a technical reviewer (mentor) evaluating the submission.

## Executive summary

This started as a deliberately broken baseline — a data-loss bug plus a fully open database with zero admin auth, both fixed in §3. From there it went through six further passes: a manual security audit that found and closed two more real bugs (§6), a dependency/CVE triage that fixed what could be safely fixed and *explained* why the rest is deferred rather than either ignoring it or risking an untested major upgrade before judging (§10), a functional-correctness pass that found and fixed four independent, previously-invisible bugs across the mail composer, the registration form, and the admin dashboard (§11), a UX pass adding optimistic updates, caching, skeleton loading states, and tooltips — which itself surfaced and fixed a real data-desync bug between two admin views (§12), a second read-only security audit that closed an identity-spoofing gap by adding email verification (§13), and a final read-only pass confirming every department's questions are completely and correctly mapped and that the system already structurally guarantees one account per email (§14). Every fix in this document was verified against an actual `next build` (and where possible, a live route sweep) before being committed — nothing here is an unverified claim.

## Under the hood: work a quick click-through won't surface

A short demo click-through will show the UI working, but several of the most consequential fixes are invisible unless you go looking for them specifically:

- **The database was fully open to the internet with zero admin authentication** before this pass — anyone could read or write every applicant's PII directly via the Firestore API, bypassing the app entirely, and the admin API routes shipped all applicant data to the browser *before* checking who was asking. Both closed in §3. This was the assignment's hidden bug, and it's the single highest-severity thing in this document.
- **Shortlisting an applicant from the "View Responses" dialog silently failed to update the main table** until a full page reload — the two views kept separate copies of the same state. Fixed by making both read/write one shared, optimistic source of truth (§12). You'd only notice the original bug by shortlisting from the dialog, closing it, and comparing against the table.
- **The "Send Mail" button was clickable but inert** before the "Verify Mail" step — no error, no toast, just silence, which reads exactly like a broken feature (§11). Now genuinely disabled until verified, and verification itself requires a subject line.
- **Server-side validation exists independently of the UI** for every required application field (name, registration number, phone, the "why join" answer) and the department itself — a request built directly against the API, bypassing the form entirely, is rejected the same as a bad UI submission (§6, §10). None of this is visible unless you try to bypass the form.
- **Bulk email HTML-escapes applicant-supplied data** before templating it into outbound messages, so a malicious value typed into an application's Name field at submission time can't inject markup into emails sent to other applicants later (§10) — a stored-injection path that would never surface in normal use.
- **`Content-Security-Policy`, `Strict-Transport-Security`, and tightened auth rate-limiting** are live on every response (§10) — only visible via browser dev tools or a security scanner, not by using the site.
- **A previously-dead, already-correctly-authenticated API route was reactivated** to power a real "Refresh" button, replacing a full `window.location.reload()` that used to be the only way to see fresh admin data (§12).
- **Firestore writes are transactional with deterministic, SHA-256-hashed document IDs**, closing both a duplicate-submission race condition and an email-collision bug, and turning "has this user already applied" into an O(1) read instead of a collection query (§5, §6) — a cost/scale decision no amount of clicking around would reveal.

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

## 10. Round 2 security & dependency hardening pass (2026-09-08)

A second, deeper pass beyond §6, run right before the submission deadline: a full production build + local prod-server smoke test, an `npm audit` against production dependencies, and a manual re-read of the two routes that handle the highest-consequence untrusted input (`submit-form`, `send-email`). Everything below was verified against a fresh `next build` (clean, zero errors) before being committed.

**App-level bugs found and fixed:**
- **Server never enforced required fields.** `/api/submit-form` only format-checked `RegistrationNumber` *if present*, and never checked `Name`, `Phone`, or the "why join" answer at all — the client's Zod schema marks all four required, but that's UI-only. A request built directly against the API (same class of gap as the Department-whitelist bug fixed in §6) could create a stored application with blank identity fields. Fixed: all four are now required and format-checked server-side. The "why join" question string was also pulled out of a local const duplicated in `FormComp.jsx` into a single exported `JOIN_QUESTION` constant in `constants/index.js`, so the client and server can't drift out of sync on the exact question text.
- **Stored HTML injection via bulk email.** `/api/send-email`'s `#name`/`#dept` template substitution interpolated `recipient.Name` — an **applicant-supplied** field from their own application — directly into the HTML email body sent to recipients, unescaped. An applicant could put markup in their Name field at application time, and it would render live in every recipient's inbox the next time an admin sent a templated bulk email using `#name`. Fixed with HTML-entity escaping on the substituted values; the admin's own rich-text composer output (`payloadData.body`/`subject`) is untouched since that's trusted admin-authored HTML by design.

**Defense-in-depth added:**
- **Content-Security-Policy + Strict-Transport-Security headers** added in `next.config.mjs`, alongside the existing `X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/`Permissions-Policy`. The CSP was scoped by actually grepping `app/`, `components/`, `lib/`, and `constants/` for every external URL this app's client code references — the only one found was Google's avatar CDN (`lh3.googleusercontent.com`), so `img-src` allows exactly that plus `'self'`, and everything else (`connect-src`, `script-src`, `style-src`) is `'self'` (+ `'unsafe-inline'`, required because the App Router injects inline hydration scripts and this project has no CSP-nonce middleware). Verified locally with `next start` + curl that the header is actually present on responses and that `/`, `/departments`, `/auth/signin`, and `/admin` all still return 200 under it.
- **Tightened auth rate limiting.** better-auth already rate-limits every endpoint by default in production (100 req/10s per IP+path) — that ceiling is sized for normal traffic, not brute-force resistance. Added `customRules` in `lib/auth.js` capping `/sign-in/email` and `/sign-up/email` specifically at 5 requests/60s, using better-auth's own built-in rate-limiter rather than a bespoke implementation.

**Dependency audit (`npm audit --omit=dev`) — what was fixed vs. what's being deliberately deferred:**
- **Fixed:** `nodemailer` bumped `^6.9.14` → `^10.0.1`, resolving several real SMTP-level CVEs (command/CRLF injection, SSRF via the `raw`/`jsonTransport` options, TLS-cert-validation bypass). Verified the app's actual `nodemailer` usage (`createTransport` + `sendMail` with a plain object) is unaffected by the v10 API — confirmed via a clean rebuild.
- **Deferred, with reasoning — not silently ignored:**
  - **Next.js.** `14.2.35` is the latest available *patch* on the 14.x line, but a long list of CVEs (RSC cache poisoning, Server Actions DoS/SSRF, image-optimizer DoS, request smuggling in rewrites, middleware bypass, etc.) were only ever fixed starting in the `15.5.x` line — there is no patched 14.x release for these. Rather than either ignoring this or blind-upgrading a major version hours before judging, each advisory was checked against what this app actually does: **no `middleware.js`, no `"use server"` Server Actions, no `rewrites()`, no i18n config, App Router (not Pages Router)** — confirmed by grep. That rules out the Server Actions CVEs, the middleware/i18n bypass CVE, and the rewrites-SSRF CVE entirely (the app has none of the features those bugs live in), and the image-optimizer/disk-cache CVEs are explicitly scoped to *self-hosted* deployments, not Vercel's managed image pipeline. What's left un-ruled-out is the general RSC cache-poisoning/confusion family, which does apply to any App Router app. **Recommended fix:** upgrade to Next `15.5.21+` (a real breaking-change migration) as the #1 post-deadline priority — deliberately not attempted live with no test window before judging.
  - **Tiptap** (`@tiptap/*`, pinned to the 2.x line): a prototype-pollution bug in `mergeAttributes()`, fixed only in `3.31.3+` — another major-version migration across ~15 interdependent packages. Mitigating context: this is the **admin-only** rich-text email composer, a client-side editor library, not a public-facing input path — exploitation needs an authenticated admin's own browser to execute the vulnerable code against attacker-controlled editor content, which meaningfully narrows real-world exploitability versus a public-facing dependency. Deferred for the same reason as Next.js: a multi-package major migration is not something to attempt uncommitted right before a demo.
  - **`postcss`** — bundled *inside* Next's own `node_modules`, gets fixed automatically as part of the Next 15 upgrade above; not a standalone dependency this repo controls.
  - **`uuid`** (moderate, no fix published) and the **`glob` CLI** command-injection advisory (high) — both real advisories, but neither is reachable through this app's code: `uuid` is three levels deep in `firebase-admin → @google-cloud/storage`, a Cloud Storage client this app never calls (it only uses Firestore); the `glob` CVE is specifically about invoking `glob`'s own CLI with `-c`/`--cmd`, which nothing in this app's runtime path does (it's a transitive build-tool dependency). Accepted as residual risk with no practical exposure.

## 11. Round 3: functional fixes, data-integrity verification, and branding (2026-09-08)

**Bugs found and fixed:**
- **Registration number silently rejected valid-looking input.** The field's `uppercase` class in `FormComp.jsx` is CSS `text-transform` — purely visual. Typing a registration number in lowercase displayed correctly (e.g. `25bce5612` rendered as `25BCE5612` on screen) but the actual submitted value stayed lowercase, failing the uppercase-only format regex on both client and server with no visible reason why. Fixed by uppercasing the real field value on change, not just its display.
- **Mail composer could silently drop the Subject/template selection.** `MailComposer.jsx`'s `onUpdate` handler for the rich-text body editor declared a `(prev) => ...` functional state updater but then ignored `prev` and spread the outer-scope `payloadData` closure variable instead — a stale-state bug. Depending on React's render/batch timing, editing the email body after setting a Subject (or picking a template) could silently reset those fields back to empty before the email actually sent, with no visual sign anything was wrong since the Subject input wasn't even bound to state (`value` was unset — a second, compounding bug, also fixed). Both are fixed now: the Subject input is properly controlled, and all three `payloadData` updates (Subject, template selection, editor body) use the functional `(prev) => ({...prev, ...})` form consistently.

**Data-integrity verification (requested: confirm every response — including links — is actually stored and shown in full):** traced the full path end to end and found no truncation anywhere:
- `/api/submit-form` writes the entire client-submitted `Questions` object to Firestore untouched (`Questions: Questions || {}`) — no field filtering, no length limits, no character restrictions on the per-department question schemas (`z.string().optional()`, no regex).
- `serializeFirestoreData` (`lib/db.ts`), used by the admin applicants API, recursively serializes every field (handling nested objects/arrays/Firestore Timestamps) with no data dropped or shortened.
- The admin response viewer (`CarouselComp.jsx`) renders every question/answer pair in full inside a scrollable container — nothing is cut off or ellipsized. While verifying this, two display-only gaps (not data loss — the underlying stored data was always complete) were fixed: multi-line answers weren't preserving line breaks visually (`whitespace-pre-wrap` added), and links rendered as inert plain text instead of being clickable (added a small regex-based linkifier — splits on `https?://` matches and renders real `<a>` elements, never raw HTML, so there's no injection surface).
- CSV export (`formatQuestionsForCsv` in `DataTable.jsx`) flattens every question/answer into the export row with nothing omitted.
- Grepped the entire submit → store → serialize → display/export pipeline for `.substring(`/`.slice(0`/`.substr(` — none found. Applicant answers, including links and long-form text, are stored and displayed completely.

**"Send Mail" button appeared to do nothing (reported by the user, investigated same day):** root cause found in `MailComposer.jsx` — the "Send Mail" button was only ever *styled* to look disabled before the "Verify Mail" confirmation step (`opacity-40`/`cursor-not-allowed` classes), but was never actually `disabled`. Its `onClick` silently no-op'd (`if (confirm) {...}`) when clicked before verifying, with zero feedback — no toast, no error. To anyone who clicked "Send Mail" directly without noticing the "Verify Mail" step first, this looks exactly like a broken button. Fixed: the button is now genuinely `disabled={!confirm}`, and "Verify Mail" itself is now disabled until a Subject is entered (`disabled={!payloadData.subject.trim()}`), preventing an admin from confirming and sending a mail with no subject line in the first place.

**Investigated, not a bug:** the user also asked why some department-specific question fields show "Not Answered" despite having typed something during testing. Traced the submit path (`FormComp.jsx` → `/api/submit-form`) and found no mechanism that could drop or reject an individual filled-in field while keeping the rest of a submission — a submission either creates the full document or fails entirely. Department-specific questions (unlike `Name`/`RegistrationNumber`/`Phone`/the "why join" answer, which are required both client- and server-side) have always been optional by this form's design (`z.string().optional()`, no server-side requirement). The most likely explanation is those specific fields were genuinely left blank during testing, not a storage bug — "Not Answered" is accurate in that case. No code change made here since no defect was found; flagged for the user to report the exact department + question text if it recurs so it can be pinpointed.

**Branding:** replaced the placeholder "R" letter mark in the navbar (`NavBar.jsx`) with the actual organization logo (`public/assets/gdg-logo.png`), rendered via `next/image` (auto-optimized, served at 28×28 — verified locally that the optimized endpoint returns a valid ~3KB PNG and every route still renders correctly under it).

**Confirmed working:** the user tested the "Send Mail" flow after the fixes above and after correcting the Gmail App Password in Vercel's environment variables — a real email was sent successfully end to end.

## 12. Round 4: caching, skeleton loaders, optimistic UI, and tooltips (2026-09-08)

The user asked for these four UX/perf patterns to be audited across the app and implemented wherever missing. Findings and changes below; every item was verified against a clean `next build` and a local `next start` route sweep before being committed.

**Caching — audited, one real gap, one real gap closed:**
- Already present and working correctly: `SubmissionsProvider.jsx` caches a signed-in user's submitted-department list in `sessionStorage` (`submitted_depts_<email>`), so repeat visits within the same browser tab skip the `/api/check-applications` round trip entirely. `FormComp.jsx`'s local draft autosave is a second, separate caching layer (localStorage, debounced) already covered in earlier rounds.
- **Real gap found and closed:** `SubmissionsProvider` already exposed an `isLoadingSubmissions` flag for the in-flight (uncached) case, but nothing consumed it — the Departments page rendered every department card as immediately available, then could flip a card to "Already submitted" a moment later once the network check resolved. Fixed by having the Departments page render skeleton cards while `isLoadingSubmissions` is true (see Skeletons below), so the flash-then-correct behavior is gone.
- **Real gap found and closed:** the admin dashboard's data was only ever available via the initial server-render — there was no client-side re-fetch path in use, so `/api/admin/applicants` existed, was correctly auth-gated, and was never called by anything. The only way to get fresher data was `window.location.reload()` (see below).

**Skeleton loaders — added where a real loading state existed but only showed a bare spinner or nothing:**
- Departments page: skeleton department cards while `isLoadingSubmissions` is true (see Caching above).
- Admin dashboard (`AdminContent.jsx`): the `isPending` auth-hydration state now renders a skeleton table shape instead of a single spinner icon.
- Admin dashboard, data refresh: refreshing the applicant list (see below) now shows skeleton rows in place of the table body instead of a spinner-only button state.
- New primitive added: `components/ui/skeleton.jsx` (standard shadcn pattern — a single `animate-pulse` styled div), no new dependency required.

**Optimistic rendering — implemented for the shortlist toggle, which also fixed a real state-desync bug found while wiring it up:**
- Toggling "Shortlist"/"Unshortlist" (both in the main table and inside the "View Responses" dialog) now flips the row's state immediately and rolls back with a toast if the server actually rejects the request, instead of waiting on the network round trip before showing anything.
- **Bug found and fixed along the way:** the "View Responses" dialog (`DialogComp.jsx`/`CarouselComp.jsx`) kept its own separate `shortlistStatus` array, entirely disconnected from the main table's data. Toggling shortlist status from inside that dialog updated only the dialog's own local copy — closing the dialog and looking at the main table would show the applicant's *old* shortlisted status until a full page reload. Fixed by removing that duplicated state entirely: both views now share DataTable's single `handleShortlist` function and read `shortlisted` directly off the same underlying record, so they can no longer disagree.
- **A second bug surfaced by this refactor, fixed in the same pass:** the table's filter logic previously tracked "is a department/shortlisted filter active" by comparing array references (`deptFiltered !== data`). That's fragile by construction — it only works as long as the underlying data array itself never legitimately changes for any other reason. Adding optimistic updates (which necessarily replace that array) would have made this comparison misfire, silently reverting the table to stale filtered data any time a shortlist was toggled. Replaced with explicit filter-value state and a `useMemo`-derived table view, which has no such failure mode.

**"Reset Filters" was doing a full page reload just to clear filters — replaced with an instant, local action, and reactivated the dead refresh endpoint:**
- `window.location.reload()` is gone. "Reset Filters" now clears the search box, department filter, and shortlisted filter purely in React state — instant, no network round trip, no lost scroll position.
- A separate new "Refresh" button now calls the previously-unused `/api/admin/applicants` route to pull a fresh applicant list without reloading the page, showing skeleton rows while in flight (see above).
- **Bug found and fixed in the same pass:** `FilterDepartment`/`FilterShortlisted` each keep their own internal "currently selected" label state, which only ever got cleared as a side effect of the old full-page reload wiping *everything*. Once Reset Filters became a lightweight in-page action, clicking it would clear the actual filtering but leave the dropdown buttons still displaying the old selected label — a real, newly-exposed inconsistency. Fixed by passing a `resetKey` down to both components that they watch to clear their own displayed state.

**Tooltips — added a real primitive and applied it to the controls that had no visible label:**
- New primitives: `components/ui/tooltip.jsx` (standard shadcn/Radix pattern) and the `@radix-ui/react-tooltip` dependency (matching the version scheme of every other `@radix-ui/*` package already in this project); `TooltipProvider` wraps the app once in `app/layout.js`.
- Applied to: the theme toggle button (icon-only, previously only had a screen-reader-only label with no visible hint on hover), the user avatar/account menu trigger (now also surfaces the signed-in user's name/email on hover), and the admin dashboard's Reset Filters / Refresh / Download CSV buttons (clarifying exactly what each does, since "Refresh" and "Reset Filters" now do two genuinely different things instead of one button doing both via a reload).

## 13. Round 5: read-only security audit + email verification (2026-09-08)

A fresh, independent read-only pass (no code changed) focused on areas the earlier rounds hadn't specifically targeted: IDOR checks on every self-scoped route, better-auth's own privilege-escalation and account-linking internals (verified against the library's own source, not assumed), and the two most recently-added admin routes.

**Held up clean, verified (not assumed):** IDOR checks are consistent across `check-applications`/`check-department-submission`/`get-submissions` (all require `email === session.user.email`). CSRF exposure on state-changing routes is mitigated by better-auth's `sameSite: "lax"` session cookie default. Better-auth's own admin-role-escalation endpoints (`/admin/set-role` etc.) independently re-check the caller's *current* role server-side, so a regular user can't call better-auth's own API to self-promote. No `dangerouslySetInnerHTML`, no `eval`, no leaked secrets, no exposed production source maps.

**Findings, and what was done about each:**
1. **No email verification on email/password sign-up — fixed this round.** Anyone could previously sign up using someone else's real email address without proving ownership, then submit an application under that identity. Traced the follow-on risk (could this let an attacker later hijack the real owner's account via Google sign-in on the same email?) and confirmed better-auth's own default (`requireLocalEmailVerified: true`) already blocks that specific escalation — so this was never a full account-takeover path, but the identity-spoofing gap on application content itself was real. See below for the fix.
2. **No maximum length on free-text fields** (`Name`, per-department question answers) — validated for presence, not length. Bounded in practice by the existing 2-applications-per-account cap and sign-up rate limiting, so low severity, but a real gap if judged specifically against this project's "storage-cost" angle. Not fixed this round (flagged, not blocking — see §15).
3. **`/api/shortlist/[id]` called `docRef.update()` before checking `snapshot.exists` — fixed this round.** Firestore's `update()` throws on a nonexistent document, so the intended `404` branch could never execute; a bad id always fell into the generic catch block instead, returning a raw Firestore error string with a `400` status. Admin-only, so this was never a security exposure — a real dead-code/wrong-status-code bug, not a vulnerability. Fixed by checking existence first, then writing; the response is now built by overlaying the just-written value onto that same pre-write read instead of reading the document a second time, so the fix costs no extra Firestore operation over the original (one read, one write, same as before — just correctly ordered). The catch block, now genuinely unreachable except for real infrastructure failures, returns a generic `500` message instead of the raw Firestore error string.
4. **Same route: no type-checking on the `shortlisted` body field — fixed this round.** A non-boolean value (e.g. a stray string) would previously be written to Firestore as-is; since any non-empty string is truthy in JS, a malformed value could have silently corrupted the shortlisted count/filter logic. Now rejected with a `400` before touching the database if `typeof shortlisted !== "boolean"`. Admin-trust-boundary only, so this was defense-in-depth rather than a live exploit path — verified the client (`DataTable.jsx`) already only ever sends a real boolean, so this tightens the route without changing any existing behavior.
5. **Minor internal-detail leakage** in a couple of error strings (e.g. mentioning an internal folder name) — cosmetic, not exploitable. Not fixed this round.

**Email verification — implemented in this round, closing finding #1:**
- New `lib/mailer.js`: a small, independent Nodemailer transporter reusing the *same already-configured* Gmail App Password (`EMAIL_USERNAME`/`EMAIL_PASSWORD`) the bulk-email feature already uses — no new credentials required. Kept separate from `app/api/send-email/route.js`'s own transporter so a change to one can't regress the already-tested-working other.
- `lib/auth.js`: added `emailAndPassword.requireEmailVerification: true` and, critically, `emailAndPassword.autoSignIn: false`. The second flag is not optional decoration — traced better-auth's actual sign-up handler and confirmed that without disabling auto sign-in, a brand-new unverified account still gets a fully usable session immediately after sign-up regardless of `requireEmailVerification`; that flag alone only gates a *later, separate* sign-in attempt. Disabling auto sign-in is what actually closes the gap for the realistic attack path (sign up as someone else, immediately use the session in the same request).
- Confirmed via better-auth's own source that `/api/auth/verify-email` is already handled by the existing `app/api/auth/[...all]` catch-all route (a GET endpoint that validates the token server-side and redirects) — no new page needed.
- `app/auth/signin/page.jsx`: updated the post-sign-up handler to detect the new no-session-yet state (`res.data.token` is null when unverified) and show a "check your email to verify" message instead of assuming immediate login and redirecting as if signed in.
- Google OAuth sign-in is unaffected — Google-authenticated emails are already provider-verified and don't go through this check.
- **Operational note, not a code gap:** this only affects future sign-in attempts. Anyone with an already-active session (including the admin's own, and the throwaway test accounts already in the database from earlier testing) keeps working uninterrupted — the verification check only runs at sign-in/sign-up time, not on every request. The next time any *existing* pre-this-change account needs to sign in fresh, they'll get a "check your email" prompt with an automatically-sent verification link to their own real inbox (self-service, not a lockout) — this includes the admin account itself, so be aware the next fresh sign-in will require clicking that link once.
- **Grandfathering existing accounts.** Requiring verification going forward would otherwise force every account created *before* this change (including the admin's own, and every throwaway test account from earlier testing) through the same one-time verification click. `scripts/grandfather-existing-users.js` (same one-off-tool convention as `scripts/migrate-doc-ids.js` in §8 — intentionally not committed) marks every account that exists *at the moment it's run* as `emailVerified: true`, so none of them ever hit the gate; any account created after it's run still goes through real verification. Requires production Firebase Admin credentials in the shell, same as the doc-ID migration script:
  ```
  node scripts/grandfather-existing-users.js          # dry run — lists who'd be updated, writes nothing
  node scripts/grandfather-existing-users.js --apply  # actually marks them verified
  ```
  Run once, immediately after this change goes live, before anyone with a pre-existing account needs to sign in fresh. Confirmed run and working as of 2026-09-08.

## 14. Round 6: department-question mapping audit + identity-uniqueness verification (2026-09-08, read-only)

Two more read-only checks, requested directly, with no code defects found in either — reported precisely rather than treated as an excuse to invent changes.

**Every department's custom questions are completely and correctly mapped.** Cross-referenced all 12 departments in `reviews` (`constants/index.js`) against `QuestionnaireData` one by one: every department has exactly one matching entry, exact string match on the department name, with a thematically-correct, hand-written question set (verified by reading every question in all 12 sets, not just the labels — e.g. Blockchain asks about smart contracts/Web3, Data Science asks about pandas/scikit-learn, Game Development asks about engines). No department is missing questions; no `QuestionnaireData` entry is orphaned from a real department.

**Two small pieces of dead code found, not fixed (cosmetic, admin-side only, never reachable by an applicant):**
- `FilterDepartment.jsx` manually adds a 13th filter option, "Video Editing," that doesn't exist anywhere in `reviews` — clicking it in the admin dashboard would always return zero results, since no applicant can ever have that value in their `Department` field (it isn't offered on the actual application form).
- `app/api/send-email/route.js`'s `resolveDeptName` still contains aliasing logic for "Photography" and "Video Editing" (→ "Photography & Video Editing Department"), neither of which is a real, selectable department. Leftover from an earlier department roster that was consolidated (the current "Publicity" department's own description now covers "video editing") but never cleaned up on the admin side.

**"One email, one login" is already a structural guarantee, verified against better-auth's own source rather than assumed:** every sign-up lowercases the email before checking for an existing account (`email.toLowerCase()` in `sign-up.mjs`) and rejects the sign-up outright if one exists — so case variants (`User@Example.com` vs `user@example.com`) can't create two accounts, and a duplicate email/password sign-up can't create a second one either. Google OAuth sign-in for an email that already has an account links into that *same* account rather than creating a second one (traced in `oauth2/link-account.mjs` during the §13 audit). No code change was needed or made — this was true before this session's work and remains true now.

## 15. Recommended next improvements (post-deadline, prioritized)

**Security**
1. **Upgrade Next.js 14 → 15.5.21+ and Tiptap 2 → 3.31.3+** (see §10) — both are breaking-change migrations deferred under deadline time pressure, not gaps that were missed. Budget a dedicated testing window (full regression pass on forms, admin dashboard, theming) before attempting either.
2. Add server-side file/size limits and content-type checks if any future feature accepts uploads (resume, portfolio links, etc.) — none currently exist, but worth a guard before adding.
3. Rotate/verify the Firebase Admin service account key is stored only in Vercel's encrypted env vars, never committed (confirm `.env.local` stays gitignored — it currently points at a throwaway test project, not prod).
4. Add automated dependency scanning (`npm audit` / Dependabot / Snyk) in CI given the number of third-party Radix/Tiptap packages, so the next round of CVEs surfaces automatically instead of via a manual pass.
5. Consider a persistent-storage rate limiter (e.g. Upstash Redis) for `/api/submit-form` if abuse becomes a real problem — the route is already auth-gated and hard-capped at 2 applications/user for free, and better-auth's own rate limiter now covers sign-in/sign-up (§10), so this is a "if needed" item, not a gap in current protection.
6. Add a max-length check on free-text fields (`Name`, per-department question answers) server-side in `/api/submit-form` — currently validated for presence, not length (§13, finding #2). Bounded today by the 2-applications-per-account cap and sign-up rate limiting, so not urgent, but a real gap if this is judged specifically against the storage-cost angle.

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
5. Remove the two orphaned "Photography"/"Video Editing" references (§14) — a dead filter option in `FilterDepartment.jsx` and dead aliasing logic in `send-email/route.js`'s `resolveDeptName`, both pointing at departments that no longer exist in `reviews`.

**Testing**
1. No automated test suite currently exists (a `coverage/` directory is present but there's nothing generating it). Add at minimum: API route tests for `/api/submit-form` (duplicate/limit/whitelist enforcement) and an auth-gating test for every admin route, since those are the highest-consequence paths if regressed.
