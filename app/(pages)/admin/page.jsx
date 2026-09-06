import React from "react";
import { headers } from "next/headers";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { connect, serializeFirestoreData } from "@/lib/db";
import { auth } from "@/lib/auth";
import AdminContent from "@/components/AdminContent";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Applicant PII (name, email, registration number, phone, question
  // answers) must never leave the server for a non-admin request. The
  // previous version fetched every applicant unconditionally and passed it
  // as a prop into a client component that only *visually* hid it behind a
  // role check, but the data was already shipped to the browser regardless
  // of who was looking. The gate now runs before any Firestore read, on the
  // server, using the authenticated session.
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = session?.user?.role === "admin";

  const applicants = isAdmin
    ? await (async () => {
        const db = await connect();
        const snapshot = await db.collection("formData").get();
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          _id: doc.id,
          ...serializeFirestoreData(doc.data()),
        }));
      })()
    : [];

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <NavBar />
      <AdminContent applicants={applicants} isAuthorized={isAdmin} hasSession={!!session?.user} />
      <Footer />
    </main>
  );
}
