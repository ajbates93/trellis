import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendEmail = async (options: SendEmailOptions) => {
  const fromEmail =
    options.from || process.env.EMAIL_FROM || "noreply@cohort.dev";

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(`Email sending failed: ${error.message}`);
    }

    console.log("Email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Email service error:", error);
    throw error;
  }
};

// Email Templates
export const emailTemplates = {
  invitation: (name: string, setPasswordUrl: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Cohort</title>
      </head>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669;">Welcome to Cohort</h1>
          </div>

          <p>Hi ${name},</p>

          <p>You've been invited to join Cohort, your team's peer feedback platform.</p>

          <p>To get started, please set your password by clicking the button below:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${setPasswordUrl}"
               style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Set Your Password
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            This link will expire in 24 hours for security reasons.
          </p>

          <p style="color: #666; font-size: 14px;">
            If you didn't expect this invitation, please ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            Cohort - Peer feedback made simple
          </p>
        </div>
      </body>
    </html>
  `,

  passwordReset: (name: string, resetUrl: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #059669;">Reset Your Password</h1>

          <p>Hi ${name},</p>

          <p>You requested to reset your password for your Cohort account.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Reset Password
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour for security reasons.
          </p>

          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            Cohort - Peer feedback made simple
          </p>
        </div>
      </body>
    </html>
  `,

  emailVerification: (name: string, verifyUrl: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #059669;">Verify Your Email</h1>

          <p>Hi ${name},</p>

          <p>Please verify your email address to complete your account setup.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}"
               style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Verify Email
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            This link will expire in 24 hours.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            Cohort - Peer feedback made simple
          </p>
        </div>
      </body>
    </html>
  `,
};
