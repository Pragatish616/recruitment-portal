import { betterAuth } from "better-auth";
import { firestoreAdapter } from "better-auth-firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { sendVerificationEmail } from "@/lib/mailer";

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "demo-DWASFW-rec";
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const appOptions = { projectId: firebaseProjectId };
if (firebaseClientEmail && firebasePrivateKey) {
  appOptions.credential = cert({
    projectId: firebaseProjectId,
    clientEmail: firebaseClientEmail,
    privateKey: firebasePrivateKey,
  });
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(appOptions);
const firestore = getFirestore(app);

// Vercel gives every deployment more than one valid hostname: a stable
// production alias (VERCEL_PROJECT_PRODUCTION_URL) and a unique per-build
// URL (VERCEL_URL) that changes on every deploy and is what the dashboard's
// "Visit" button often opens. better-auth rejects any request whose Origin
// doesn't match baseURL/trustedOrigins as a CSRF protection, so relying on
// BETTER_AUTH_URL alone throws "invalid origin" the moment someone hits the
// site from any hostname but the one it's hardcoded to. Trusting all of
// Vercel's own hostnames for this deployment closes that gap without
// weakening the check itself.
const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
].filter(Boolean);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  trustedOrigins,
  database: firestoreAdapter({
    firestore,
  }),
  // better-auth already rate-limits every endpoint by default in production
  // (100 req/10s per IP+path), but that ceiling is sized for normal app
  // traffic, not credential-stuffing/brute-force resistance on auth itself.
  // Tighten just the two password-guessing surfaces without touching the
  // generous default everywhere else.
  rateLimit: {
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (reduces re-login and session creation writes)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24, // 1 day
    },
    updateAge: 60 * 60 * 24, // 1 day (prevent frequent session writes)
  },
  emailAndPassword: {
    enabled: true,
    // Closes an identity-spoofing gap: without this, anyone could sign up
    // using someone else's real email address (no proof of ownership
    // required) and submit an application under that identity. autoSignIn
    // must be disabled too - otherwise sign-up still hands out a usable
    // session immediately regardless of this flag, and the check below only
    // ever runs on a later, separate sign-in attempt.
    requireEmailVerification: true,
    autoSignIn: false,
  },
  emailVerification: {
    sendOnSignIn: true, // re-sends a fresh link if someone tries to sign in before verifying
    autoSignInAfterVerification: true, // no need to sign in twice after clicking the link
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ user, url });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(), // This must be the last plugin in the array
  ],
});