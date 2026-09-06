import { NextResponse } from "next/server";
import { connect, serializeFirestoreData, applicantIndexId, applicationDocId } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = session.user;
    const userEmail = user.email;

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    if (email !== userEmail) {
      return NextResponse.json(
        { message: "You can only check your own applications" },
        { status: 403 }
      );
    }

    const db = await connect();

    // A user applies to at most 2 departments (enforced in /api/submit-form),
    // so their submissions live at 1-2 known document ids. Read the small
    // per-user index doc for that department list, then fetch those exact
    // docs by id instead of running a collection query scanning "formData"
    // for a matching Email field on every read.
    const indexSnap = await db.collection("applicants").doc(applicantIndexId(email)).get();
    const departments = indexSnap.exists ? indexSnap.data()?.departments || [] : [];

    if (!departments.length) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const refs = departments.map((department) =>
      db.collection("formData").doc(applicationDocId(email, department))
    );
    const snapshots = await db.getAll(...refs);
    const data = snapshots
      .filter((doc) => doc.exists)
      .map((doc) => ({
        id: doc.id,
        _id: doc.id,
        ...serializeFirestoreData(doc.data()),
      }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error checking applications:", error);
    return NextResponse.json(
      {
        message:
          "Internal server error inside check-applications dir",
      },
      { status: 500 }
    );
  }
}
