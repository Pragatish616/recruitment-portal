import { NextResponse } from "next/server";
import { connect, applicantIndexId } from "@/lib/db";
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
    // One doc read instead of a collection query: /api/submit-form maintains
    // this per-user index doc transactionally, so it is always in sync with
    // formData without having to scan/query it here.
    const indexSnap = await db.collection("applicants").doc(applicantIndexId(email)).get();
    const submittedDepartments = indexSnap.exists ? indexSnap.data()?.departments || [] : [];

    return NextResponse.json({ count: submittedDepartments.length, submittedDepartments }, { status: 200 });
  } catch (error) {
    console.error("Error checking applications:", error);
    return NextResponse.json(
      {
        message: "Internal server error inside check-applications dir",
      },
      { status: 500 }
    );
  }
}
