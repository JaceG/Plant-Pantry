import { ServerClient } from "postmark";

// Lazy-initialized Postmark client
let client: ServerClient | null = null;
let initialized = false;

/**
 * Initialize the Postmark client (called lazily on first use)
 * This ensures dotenv has loaded before we read environment variables
 */
function getClient(): ServerClient | null {
  if (!initialized) {
    initialized = true;
    const apiKey = process.env.POSTMARK_API_KEY;

    if (apiKey) {
      client = new ServerClient(apiKey);
      console.log("✅ Postmark email service configured");
    } else {
      console.warn(
        "⚠️  Postmark API key not configured. Password reset emails will be logged to console.",
      );
    }
  }
  return client;
}

function getFromEmail(): string {
  return process.env.POSTMARK_FROM_EMAIL || "noreply@veganaisle.com";
}

function getClientUrl(): string {
  return process.env.CLIENT_URL || "http://localhost:5173";
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export const emailService = {
  /**
   * Send an email via Postmark
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, htmlBody, textBody } = options;
    const postmarkClient = getClient();

    // If no Postmark client (no API key), log to console in development
    if (!postmarkClient) {
      console.log("\n========== EMAIL (Dev Mode) ==========");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:\n${textBody || htmlBody}`);
      console.log("=======================================\n");
      return true;
    }

    try {
      await postmarkClient.sendEmail({
        From: getFromEmail(),
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody || htmlBody.replace(/<[^>]*>/g, ""), // Strip HTML for plain text
      });
      console.log(`✅ Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("Failed to send email via Postmark:", error);
      return false;
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${getClientUrl()}/reset-password?token=${resetToken}`;

    const htmlBody = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Reset Your Password</title>
			</head>
			<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
				<div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
					<div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 32px; text-align: center;">
						<span style="font-size: 48px;">🌱</span>
						<h1 style="color: #ffffff; margin: 16px 0 0 0; font-size: 24px; font-weight: 600;">Vegan Aisle</h1>
					</div>
					<div style="padding: 32px;">
						<h2 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 20px;">Reset Your Password</h2>
						<p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
							We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
						</p>
						<div style="text-align: center; margin: 32px 0;">
							<a href="${resetUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
						</div>
						<p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
							If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
						</p>
						<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
						<p style="color: #9ca3af; font-size: 12px; margin: 0;">
							If the button doesn't work, copy and paste this link into your browser:<br>
							<a href="${resetUrl}" style="color: #22c55e; word-break: break-all;">${resetUrl}</a>
						</p>
					</div>
				</div>
			</body>
			</html>
		`;

    const textBody = `
Reset Your Password

We received a request to reset your password for your Vegan Aisle account.

Click the link below to create a new password (expires in 1 hour):
${resetUrl}

If you didn't request a password reset, you can safely ignore this email.
		`;

    return this.sendEmail({
      to: email,
      subject: "Reset Your Password - Vegan Aisle",
      htmlBody,
      textBody,
    });
  },
};
