require("dotenv").config();
import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { reviews } from "@/constants";
import { auth } from "@/lib/auth";

const transporter = nodemailer.createTransport({
    service: "gmail", // or your preferred email service
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const resolveDeptName = (recipientDepartment) => {
    let depart = recipientDepartment;
    if (depart === "Video Editing") {
        depart = "Photography";
    }
    const dept = reviews.find((item) => item.name === depart);
    let deptName = dept?.name || recipientDepartment || "the department";

    if (deptName === "Web Development" || deptName === "App Development") {
        deptName = "Development Department";
    }
    if (deptName === "Photography" || deptName === "Video Editing") {
        deptName = "Photography & Video Editing Department";
    }
    return deptName;
};

const sendOne = async (recipient, payloadData) => {
    const deptName = resolveDeptName(recipient.Department);

    let generalTemp = `<div>${payloadData.body}</div>`;
    generalTemp = generalTemp.replace(/#name/g, recipient.Name || "");
    generalTemp = generalTemp.replace(/#dept/g, deptName);

    await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: recipient.Email,
        subject: payloadData.subject,
        html: generalTemp,
    });

    return recipient.Email;
};

// Sends with a small concurrency cap instead of one-at-a-time sequential
// awaits, and isolates failures per recipient so one bad address (or a
// department name that fails to resolve) no longer aborts every email after
// it that would otherwise have gone out.
const CONCURRENCY = 5;
async function sendBatched(recipients, payloadData) {
    const results = [];
    for (let i = 0; i < recipients.length; i += CONCURRENCY) {
        const batch = recipients.slice(i, i + CONCURRENCY);
        const settled = await Promise.allSettled(
            batch.map((recipient) => sendOne(recipient, payloadData))
        );
        results.push(...settled);
    }
    return results;
}

export async function POST(req) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { recipients, payloadData } = await req.json();

    if (!recipients || recipients.length === 0) {
        return new Response(
            JSON.stringify({ error: "No recipients provided" }),
            { status: 400 }
        );
    }

    const results = await sendBatched(recipients, payloadData);
    const failed = results.filter((r) => r.status === "rejected").length;
    const sent = results.length - failed;

    if (failed > 0 && sent === 0) {
        return new Response(
            JSON.stringify({ error: "Failed to send emails" }),
            { status: 500 }
        );
    }

    return new Response(
        JSON.stringify({
            message: failed
                ? `Sent ${sent} of ${results.length} emails; ${failed} failed.`
                : "Emails sent successfully",
        }),
        { status: 200 }
    );
}
