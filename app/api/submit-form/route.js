import { connect, applicantIndexId, applicationDocId } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { APPLICATION_DEADLINE, reviews } from "@/constants";

const VALID_DEPARTMENTS = new Set(reviews.map((department) => department.name));

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return new Response(
        JSON.stringify({ message: "Authentication required" }),
        { status: 401 }
      );
    }

    const user = session.user;
    const userEmail = user.email;

    const deadline = new Date(APPLICATION_DEADLINE);
    if (new Date() > deadline)
      return new Response(
        JSON.stringify({
          message: "The submission deadline has passed"
        }),
        { status: 403 }
      );

    const db = await connect();
    const data = await req.json();

    const { Department, Questions, ...formFields } = data;

    if (!Department || typeof Department !== "string") {
      return new Response(
        JSON.stringify({ message: "A department is required" }),
        { status: 400 }
      );
    }

    if (!VALID_DEPARTMENTS.has(Department)) {
      return new Response(
        JSON.stringify({ message: "Unknown department" }),
        { status: 400 }
      );
    }

    const regNoRegex = /^\d{2}[A-Z]{3}\d{4}$/;
    if (formFields.RegistrationNumber && !regNoRegex.test(formFields.RegistrationNumber)) {
      return new Response(
        JSON.stringify({
          message: "Registration number must be 2 numbers, 3 uppercase letters, and 4 numbers (e.g. 25BCE5612)",
        }),
        { status: 400 }
      );
    }

    // One doc per (email, department) at a deterministic id, plus a small
    // per-user index doc. This makes "has this user already applied here"
    // and "how many departments has this user applied to" O(1) lookups
    // elsewhere (see /api/check-applications and /api/check-department-
    // submission) instead of collection queries, and lets a Firestore
    // transaction check-and-write atomically below, closing a race where two
    // concurrent submits for the same department could previously both pass
    // the "not already submitted" read before either one's write landed.
    const formRef = db.collection("formData").doc(applicationDocId(userEmail, Department));
    const indexRef = db.collection("applicants").doc(applicantIndexId(userEmail));

    const outcome = await db.runTransaction(async (tx) => {
      const [formSnap, indexSnap] = await Promise.all([tx.get(formRef), tx.get(indexRef)]);
      const departmentsSoFar = indexSnap.exists ? indexSnap.data()?.departments || [] : [];

      if (formSnap.exists) {
        return { ok: false, reason: "duplicate" };
      }
      if (departmentsSoFar.length >= 2) {
        return { ok: false, reason: "limit" };
      }

      tx.set(formRef, {
        ...formFields,
        Department,
        Questions: Questions || {},
        Email: userEmail,
        shortlisted: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        indexRef,
        {
          email: userEmail,
          departments: FieldValue.arrayUnion(Department),
          count: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { ok: true };
    });

    if (!outcome.ok) {
      if (outcome.reason === "duplicate") {
        return new Response(
          JSON.stringify({
            message: `You have already submitted an application for ${Department}`,
          }),
          { status: 400 }
        );
      }
      return new Response(
        JSON.stringify({
          message: "Remember that you can only submit upto 2 unique applications",
        }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Form submitted successfully!",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Form submission error:", error);
    return new Response(JSON.stringify({ message: "Error submitting form" }), {
      status: 500,
    });
  }
}
