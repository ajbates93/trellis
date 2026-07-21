import { db } from "#server/database/connection";
import { verifications } from "#server/database/schema";
import { sendEmail, emailTemplates } from "#server/utils/email";

export async function sendUserInvitation(user: { id: string; name: string; email: string }): Promise<void> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store verification token in Better Auth's verification table
  await db.insert(verifications).values({
    id: crypto.randomUUID(),
    identifier: user.email,
    value: token,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Build set password URL
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const setPasswordUrl = `${baseUrl}/set-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  // Send invitation email
  await sendEmail({
    to: user.email,
    subject: "Welcome to Trellis - Set Your Password",
    html: emailTemplates.invitation(user.name, setPasswordUrl),
  });
}
