import nodemailer from 'nodemailer';

// Cache transporters per-user to avoid re-creating on every email
const transporterCache = new Map<string, nodemailer.Transporter>();

/**
 * Creates and returns a Gmail OAuth2 transporter for a specific user.
 * Automatically refreshes access tokens using the user's refresh token.
 */
function getOAuth2Transporter(senderEmail: string, refreshToken: string): nodemailer.Transporter {
  const cacheKey = `oauth:${senderEmail.toLowerCase()}`;
  
  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey)!;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('[OAuth2] Google OAuth credentials missing in backend configuration.');
  }

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: senderEmail,
      clientId,
      clientSecret,
      refreshToken,
    },
  });

  transporterCache.set(cacheKey, transport);
  console.log(`[SMTP/OAuth2] Gmail OAuth2 transporter initialized for: ${senderEmail}`);
  return transport;
}

/**
 * Creates and returns a Gmail SMTP transporter using App Password for a specific user.
 */
function getGmailTransporter(smtpEmail: string, smtpAppPassword: string): nodemailer.Transporter {
  const cleanPass = smtpAppPassword.replace(/\s+/g, '');
  const cacheKey = `pwd:${smtpEmail.toLowerCase()}`;
  
  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey)!;
  }

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpEmail.trim(),
      pass: cleanPass,
    },
  });

  transporterCache.set(cacheKey, transport);
  console.log(`[SMTP] Gmail App Password transporter created for: ${smtpEmail}`);
  return transport;
}

/**
 * Returns a fallback transporter using .env credentials.
 * Used when a user hasn't authenticated via OAuth or entered an App Password.
 */
function getFallbackTransporter(): nodemailer.Transporter {
  const cacheKey = '__fallback__';
  
  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey)!;
  }

  const provider = (process.env.SMTP_PROVIDER || 'ethereal').toLowerCase();

  if (provider === 'gmail') {
    const user = (process.env.GMAIL_USER || '').trim();
    const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    if (!user || !pass || user === 'your-email@gmail.com' || pass === 'your-16-char-app-password') {
      throw new Error(
        '[SMTP] No credentials available. Please configure GMAIL_USER and GMAIL_APP_PASSWORD in .env.'
      );
    }

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    transporterCache.set(cacheKey, transport);
    console.log(`[SMTP] Fallback Gmail transporter configured for: ${user}`);
    return transport;
  }

  // Ethereal fallback (for testing only)
  const host = process.env.ETHEREAL_HOST || 'smtp.ethereal.email';
  const port = parseInt(process.env.ETHEREAL_PORT || '587', 10);
  const user = process.env.ETHEREAL_USER || '';
  const pass = process.env.ETHEREAL_PASSWORD || '';

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  transporterCache.set(cacheKey, transport);
  console.log(`[SMTP] Fallback Ethereal transporter configured`);
  return transport;
}

/**
 * Clears cached transporter for a specific user (e.g., when updating credentials or tokens).
 */
export function clearTransporterCache(smtpEmail?: string) {
  if (smtpEmail) {
    transporterCache.delete(`oauth:${smtpEmail.toLowerCase()}`);
    transporterCache.delete(`pwd:${smtpEmail.toLowerCase()}`);
    transporterCache.delete(smtpEmail.toLowerCase());
  } else {
    transporterCache.clear();
  }
}

/**
 * Verifies SMTP credentials by attempting to connect.
 * Returns true if the connection succeeds.
 */
export async function verifySmtpCredentials(smtpEmail: string, smtpAppPassword: string): Promise<boolean> {
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpEmail.trim(),
      pass: smtpAppPassword.replace(/\s+/g, ''),
    },
  });

  try {
    await transport.verify();
    return true;
  } catch (error) {
    console.error(`[SMTP] Verification failed for ${smtpEmail}:`, error);
    return false;
  } finally {
    transport.close();
  }
}

export interface EmailAttachment {
  filename: string;
  contentType?: string;
  content: string; // Base64 or string
  encoding?: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  body: string;
  senderName: string;
  senderEmail?: string;
  senderRefreshToken?: string;
  senderAppPassword?: string;
  attachments?: EmailAttachment[];
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | false;
}

/**
 * Sends a single email using the user's Google OAuth2 token, App Password, or fallback.
 */
export async function sendEmail(options: SendMailOptions): Promise<SendMailResult> {
  const { to, subject, body, senderName, senderEmail, senderAppPassword, attachments } = options;

  let mailTransporter: nodemailer.Transporter;
  let fromEmail: string;

  // 1. Custom Gmail App Password if configured by user
  if (senderEmail && senderAppPassword) {
    mailTransporter = getGmailTransporter(senderEmail, senderAppPassword);
    fromEmail = senderEmail;
  }
  // 2. Default: Verified server SMTP credentials (.env)
  else {
    mailTransporter = getFallbackTransporter();
    fromEmail = (process.env.GMAIL_USER || 'noreply@gmail.com').trim();
  }

  const displayName = senderName || 'Outbox Campaign';

  // Format attachments for Nodemailer (base64 buffers)
  const formattedAttachments = attachments && attachments.length > 0
    ? attachments.map((att) => ({
        filename: att.filename,
        contentType: att.contentType,
        content: Buffer.from(att.content, 'base64'),
      }))
    : undefined;

  const mailOptions: any = {
    from: `"${displayName}" <${fromEmail}>`,
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
    attachments: formattedAttachments,
  };

  const info = await mailTransporter.sendMail(mailOptions);

  // Preview URL only works with Ethereal
  const provider = (process.env.SMTP_PROVIDER || 'ethereal').toLowerCase();
  const isEthereal = !senderEmail && provider === 'ethereal';
  const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : false;

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
