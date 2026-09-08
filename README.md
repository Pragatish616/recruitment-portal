# GDG Recruitment Portal

A recruitment portal built for a Google Developer Group (GDG) chapter to run its yearly member intake — department discovery, applications, and admin review/shortlisting — end to end.

**Live:** https://recruitment-portal-ochre.vercel.app/

## What it does

- **Department discovery** — browse open departments grouped as Technical / Non-Technical, each with a short description and an accent color/icon.
- **Applications** — sign in, pick up to 2 departments, and fill one form per selection. A shared "why do you want to join" question is asked once; department-specific questions are asked per pick. Answers autosave as a local draft (debounced) so a refresh or dropped connection doesn't lose progress.
- **Duplicate/limit protection** — a user can't submit the same department twice or exceed 2 applications, enforced atomically server-side (not just in the UI).
- **Admin dashboard** — sortable/filterable/searchable applicant table, per-applicant response viewer, shortlist toggling (optimistic — flips instantly, rolls back with a toast if the server rejects it), a one-click data refresh that doesn't reload the page, CSV export, and bulk "send email to selected applicants" with a rich-text composer and template support.
- **Countdown** — a live "applications close in" timer driven by a single configurable deadline.
- **Light/dark theme**, accessible focus states, `prefers-reduced-motion`-aware animations throughout.
- **Polished loading states** — skeleton placeholders (not bare spinners) wherever content is genuinely in flight — department cards while checking what you've already applied to, the admin table on first auth check and on manual refresh — plus tooltips on every icon-only or ambiguous control.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth | [better-auth](https://www.better-auth.com/) — email/password + Google OAuth, role-based (`user` / `admin`) |
| Database | Firestore, via `firebase-admin` (server-only — the browser never talks to Firestore directly) |
| UI | Tailwind CSS + shadcn/ui (Radix primitives), Framer Motion, GSAP, OGL (WebGL) |
| Forms | react-hook-form + Zod |
| Email | Nodemailer |
| Deployment | Vercel |

## Architecture notes

A few decisions worth calling out for anyone reviewing this codebase:

- **Server-only data access.** Every Firestore read/write goes through a Next.js API route using the Admin SDK. `firestore.rules` denies all direct client access (`allow read, write: if false`) — there is no exposed surface beyond the authenticated API routes, and every admin-facing route independently checks `session.user.role === "admin"` before touching data (including the `/admin` page itself, which now gates the Firestore read on the server rather than fetching data and hiding it client-side).
- **O(1) lookups instead of collection queries.** Application documents use a deterministic id (`slug(email)__slug(department)`), plus a small per-user index document (`applicants/{emailHash}`) that tracks which departments a user has already applied to. This turns "has this user already applied here" / "how many departments has this user applied to" into single `doc.get()` reads instead of `where()` queries, avoids needing a composite Firestore index, and — written transactionally alongside the application doc — closes a read-then-write race that could otherwise let two concurrent submits both slip past the "not already submitted" check.
- **Code-split heavy client bundles.** The rich-text email composer (Tiptap + 5 extension packages) and the WebGL background effect are both loaded via `next/dynamic`, so their weight is only paid by the admin dashboard and homepage respectively, not shipped to every route.
- **Deadline as config, not code.** The application deadline is a single constant, overridable via `NEXT_PUBLIC_APPLICATION_DEADLINE`, read by both the countdown UI and the `submit-form` API route's own deadline check — extending an intake window is an env var change, not a redeploy of logic.
- **A user's own submitted-departments status is cached client-side** (`sessionStorage`, per signed-in email) so returning to the departments/application pages within the same session doesn't re-hit `/api/check-applications` every time; a genuine cache miss shows skeleton department cards rather than a flash of "available" that then flips to "already submitted."
- **Admin table state is a single source of truth.** The applicant table, the "View Responses" dialog's shortlist toggle, and a manual data refresh all read and write the same in-memory list rather than each keeping their own copy — so shortlisting from either view is instantly reflected in both, with no chance of the two disagreeing until a page reload.

## Project structure

```
app/
  (pages)/
    admin/            admin dashboard (server-gated)
    departments/       department picker
    join/[...joinIds]  application form for 1-2 selected departments
  api/
    submit-form/                 create an application (transactional)
    check-applications/          a user's applied departments
    check-department-submission/ has-this-user-applied-here check
    get-submissions/             a user's own submitted applications
    admin/applicants/            list all applicants (admin only)
    shortlist/[id]/              toggle shortlist status (admin only)
    send-email/                  bulk email selected applicants (admin only)
    auth/[...all]/               better-auth handler
components/           UI components (shadcn primitives under ui/)
constants/            department catalog, questionnaire data, deadline config
lib/                  Firestore connection + auth config
firestore.rules       deny-all rules (data plane is server-only)
```

## Running locally

```bash
npm install --legacy-peer-deps   # or: bun install
cp .env.example .env.local       # fill in the values below
npm run dev
```

### Required environment variables

See `.env.example` for the full list with descriptions. At minimum you need:

- A Firebase project with Firestore enabled, plus a service account (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) — or point `FIRESTORE_EMULATOR_HOST` at a local emulator for development without touching production data.
- `BETTER_AUTH_SECRET` (any random 32+ char string locally) and `BETTER_AUTH_URL`.
- A Google OAuth client (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) if you want Google sign-in.
- `EMAIL_USERNAME` / `EMAIL_PASSWORD` (a Gmail app password) — powers both the admin bulk-email feature and, now, email/password sign-up verification (`lib/mailer.js`). Without it, new email/password accounts can be created but can never be verified or signed into (Google sign-in is unaffected).
- `NEXT_PUBLIC_APPLICATION_DEADLINE` — an ISO 8601 datetime; falls back to a placeholder future date if unset.

## Deploying

The app is deployed on [Vercel](https://vercel.com). To redeploy your own copy:

1. Import this repo into a new Vercel project.
2. Add every variable from `.env.example` under Project Settings → Environment Variables (`NEXT_PUBLIC_*` values are baked in at build time, so changing them requires a redeploy, not just a settings save).
3. Add your Vercel domain as an authorized redirect URI on the Google OAuth client, or Google sign-in will fail in production.
4. Deploy `firestore.rules` to your Firebase project (`firebase deploy --only firestore:rules`) so the database stays locked down.

## Security

- Firestore has no public read/write surface — see `firestore.rules` and the architecture notes above.
- Applicant PII (name, email, registration number, phone, question answers) is never fetched unless the request is server-verified as an admin session.
- Every application field (name, registration number, phone, the "why join" answer, department) is required and format-validated server-side in `/api/submit-form` — not just in the client form, so a request built directly against the API can't create incomplete or spoofed records.
- Bulk email (`/api/send-email`, admin-only) HTML-escapes applicant-supplied fields before templating them into outbound email, so an applicant can't plant markup in their own application data and have it render in emails sent to other people.
- `Content-Security-Policy` and `Strict-Transport-Security` headers are set alongside `X-Frame-Options`/`X-Content-Type-Options`/`Referrer-Policy`/`Permissions-Policy` (see `next.config.mjs`).
- Sign-in/sign-up are rate-limited (5 requests/60s per IP) on top of better-auth's own default rate limiting, for brute-force resistance.
- Email/password sign-up requires verifying the address before the account is usable (`emailAndPassword.requireEmailVerification` + `autoSignIn: false` in `lib/auth.js`) — closes an identity-spoofing gap where anyone could otherwise apply under an email address they don't control. Google sign-in is unaffected (already provider-verified).
- New email/password sign-ups require a password with at least 8 characters, a letter, a number, and a special character, enforced server-side via a `hooks.before` check in `lib/auth.js` scoped specifically to the sign-up path — existing accounts are never re-validated or forced to change anything.
- See `work.md` for the full security audit history, including dependency-CVE triage and what's deliberately deferred (with reasoning) vs. fixed.
