import { connect, applicantIndexId } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401 }
      );
    }

    const user = session.user;
    const userEmail = user.email;

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const department = searchParams.get("department");

    if (!email || !department) {
      return new Response(
        JSON.stringify({ error: "Missing email or department" }),
        { status: 400 }
      );
    }

    if (email !== userEmail) {
      return new Response(
        JSON.stringify({ error: "You can only check your own submissions" }),
        { status: 403 }
      );
    }

    const db = await connect();
    // Single doc read against the per-user index (see /api/submit-form)
    // instead of a two-field composite-index query against formData.
    const indexSnap = await db.collection("applicants").doc(applicantIndexId(email)).get();
    const departments = indexSnap.exists ? indexSnap.data()?.departments || [] : [];

    return new Response(JSON.stringify({ submitted: departments.includes(department) }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error checking department submission:", error);
    return new Response(JSON.stringify({ error: "Database query failed" }), {
      status: 500,
    });
  }
}
