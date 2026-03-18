/**
 * POST /api/auth/forgot-password
 * Sends a password-reset link to the user's email address.
 * If SMTP is not configured the endpoint still returns 200 so the
 * frontend can show a friendly "check your inbox" message without
 * leaking whether the email is registered.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const RESET_SECRET = new TextEncoder().encode(
  process.env.JWT_RESET_SECRET ??
    process.env.JWT_ACCESS_SECRET ??
    "dev-reset-secret"
);

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 — don't reveal whether the email exists
    if (!user) {
      return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
    }

    // Generate a short-lived reset token (15 min)
    const resetToken = await new SignJWT({ sub: user.id, type: "password-reset" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .sign(RESET_SECRET);

    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/reset-password?token=${resetToken}`;

    // Send email if SMTP is configured
    const hasSmtp =
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS;

    if (hasSmtp) {
      try {
        const nodemailer = (await import("nodemailer")).default;
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        await transporter.sendMail({
          from: `"DeliVro" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Reset your DeliVro password",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto">
              <h2 style="color:#4f46e5">Password Reset</h2>
              <p>Click the link below to reset your password. It expires in <strong>15 minutes</strong>.</p>
              <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
                Reset Password
              </a>
              <p style="color:#64748b;font-size:14px">If you did not request this, you can safely ignore this email.</p>
              <hr style="border:none;border-top:1px solid #e2e8f0"/>
              <p style="color:#94a3b8;font-size:12px">DeliVro — Premium Delivery Platform</p>
            </div>
          `,
        });
      } catch {
        // Don't fail the request on email send errors — log only
        console.error("[forgot-password] SMTP send failed");
      }
    } else {
      // Dev mode: log the URL to the server console
      console.info(`[forgot-password] Reset URL for ${email}: ${resetUrl}`);
    }

    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }
    console.error("[forgot-password]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
