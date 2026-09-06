# GDG Recruitment Portal

A recruitment portal built for a Google Developer Group (GDG) chapter to run its yearly member intake — department discovery, applications, and admin review/shortlisting — end to end.

**Live:** https://recruitment-portal-ochre.vercel.app/

## What it does

- **Department discovery** — browse open departments grouped as Technical / Non-Technical, each with a short description and an accent color/icon.
- **Applications** — sign in, pick up to 2 departments, and fill one form per selection. A shared "why do you want to join" question is asked once; department-specific questions are asked per pick. Answers autosave as a local draft (debounced) so a refresh or dropped connection doesn't lose progress.
- **Duplicate/limit protection** — a user can't submit the same department twice or exceed 2 applications, enforced atomically server-side (not just in the UI).
- **Admin dashboard** — sortable/filterable/searchable applicant table, per-applicant response viewer, shortlist toggling, CSV export, and bulk "send email to selected applicants" with a rich-text composer and template support.
- **Countdown** — a live "applications close in" timer driven by a single configurable deadline.
- **Light/dark theme**, accessible focus states, `prefers-reduced-motion`-aware animations throughout.

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
- `EMAIL_USERNAME` / `EMAIL_PASSWORD` (a Gmail app password) if you want the admin bulk-email feature to actually send.
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
- Registration numbers and phone numbers are format-validated server-side, not just in the form.
