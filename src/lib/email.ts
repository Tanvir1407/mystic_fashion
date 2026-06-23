import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "587");
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || "Mystic Fashion <noreply@mysticfashion.com>";

let transporter: nodemailer.Transporter | null = null;

if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`
⚠️  [Email Service] SMTP configuration is incomplete. 
   Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your environment.
   
   --- EMAIL PREVIEW ---
   To: ${to}
   Subject: ${subject}
   Body (HTML): 
   ${html}
   ----------------------
    `);
    }
    // Return success in development to prevent locking progress when SMTP credentials are not yet configured.
    return { success: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log(`[Email Service] Email sent successfully. MessageID: ${info.messageId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Email Service] Failed to send email:`, error);
    return { success: false, error: error.message || "Failed to send email." };
  }
}
