import nodemailer from "nodemailer";

// Separate transporter instance from app/api/send-email/route.js (the admin
// bulk-email feature) rather than sharing one - keeps this auth-critical
// path isolated from that route's own lifecycle, so a change to one can't
// regress the other. Both read the same already-configured Gmail App
// Password (EMAIL_USERNAME/EMAIL_PASSWORD); no new credentials needed.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail({ user, url }) {
  await transporter.sendMail({
    from: process.env.EMAIL_USERNAME,
    to: user.email,
    subject: "Verify your email — Recruitment Portal",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">Verify your email</h2>
        <p>Hi ${user.name || "there"},</p>
        <p>Confirm this is your email address to finish setting up your Recruitment Portal account.</p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
            Verify email
          </a>
        </p>
        <p style="color:#666;font-size:13px;">If the button doesn't work, copy and paste this link: <br />${url}</p>
        <p style="color:#666;font-size:13px;">If you didn't try to create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}
