import { Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { emailQueue } from '../queues/emailQueue';
import { AuthenticatedRequest } from '../types';
import { verifySmtpCredentials, clearTransporterCache } from '../services/emailService';

// Validation schema for scheduling a campaign
const ScheduleCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  senderName: z.string().optional(),
  attachments: z.array(
    z.object({
      filename: z.string(),
      contentType: z.string().optional(),
      content: z.string(), // base64 encoded string
    })
  ).optional(),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
  startTime: z.string().transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid start time format');
    }
    return date;
  }),
  delayBetweenEmails: z.number().int().nonnegative('Delay must be at least 0 seconds').default(2),
  hourlyLimit: z.number().int().positive('Hourly limit must be greater than 0').default(200),
});

/**
 * POST /api/emails/schedule
 * Validates parameters, creates Campaign & Jobs in Postgres, and schedules BullMQ delayed tasks.
 */
export async function scheduleCampaign(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user context.' });
    }

    const parseResult = ScheduleCampaignSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { subject, body, senderName, attachments, recipients, startTime, delayBetweenEmails, hourlyLimit } = parseResult.data;

    // Deduplicate recipients list
    const uniqueRecipients = Array.from(new Set(recipients));

    // Create Campaign ID
    const campaignId = randomUUID();

    // Statically allocate email schedule times to satisfy the rate limit and spacing constraints
    const emailJobsToCreate = uniqueRecipients.map((recipient, index) => {
      const block = Math.floor(index / hourlyLimit);
      const pos = index % hourlyLimit;

      // 1 hour is 3600 seconds. Each block shifts the time by 1 hour.
      const blockTimeMs = startTime.getTime() + block * 3600 * 1000;
      const offsetMs = pos * delayBetweenEmails * 1000;
      const scheduledAt = new Date(blockTimeMs + offsetMs);

      return {
        id: randomUUID(),
        campaignId,
        recipient,
        subject,
        body,
        scheduledAt,
        status: 'scheduled' as const,
      };
    });

    // Write database records atomically in a transaction
    const campaign = await prisma.$transaction(async (tx: any) => {
      // 1. Create the campaign
      const createdCampaign = await tx.emailCampaign.create({
        data: {
          id: campaignId,
          userId,
          subject,
          body,
          senderName: senderName || null,
          attachments: attachments && attachments.length > 0 ? (attachments as any) : undefined,
          startTime,
          delayBetweenEmails,
          hourlyLimit,
        },
      });

      // 2. Create the associated email jobs
      await tx.emailJob.createMany({
        data: emailJobsToCreate,
      });

      return createdCampaign;
    });

    // Enqueue jobs in BullMQ
    const now = Date.now();
    const enqueuePromises = emailJobsToCreate.map(async (job) => {
      const delayMs = Math.max(0, job.scheduledAt.getTime() - now);

      // Using the database record ID as the BullMQ jobId is critical.
      // This enforces idempotency and handles server restarts cleanly.
      return emailQueue.add(
        'send-email',
        { emailJobId: job.id },
        {
          jobId: job.id,
          delay: delayMs,
        }
      );
    });

    await Promise.all(enqueuePromises);

    console.log(`[Campaign] Scheduled Campaign ${campaign.id} with ${uniqueRecipients.length} jobs.`);

    return res.status(201).json({
      message: 'Campaign scheduled successfully',
      campaignId: campaign.id,
      recipientCount: uniqueRecipients.length,
      firstJobScheduledAt: emailJobsToCreate[0]?.scheduledAt,
      lastJobScheduledAt: emailJobsToCreate[emailJobsToCreate.length - 1]?.scheduledAt,
    });
  } catch (error: any) {
    console.error('[Campaign] Scheduling error:', error);
    return res.status(500).json({ error: 'Failed to schedule campaign due to server error.' });
  }
}

/**
 * GET /api/emails/scheduled
 * Fetches jobs that are 'scheduled' or 'processing' for the active user.
 */
export async function getScheduledEmails(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { page = '1', limit = '10', search = '' } = req.query;
    const skip = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
    const take = parseInt(String(limit), 10);

    const whereClause: any = {
      campaign: { userId },
      status: { in: ['scheduled', 'processing'] },
    };

    if (search) {
      whereClause.OR = [
        { recipient: { contains: String(search), mode: 'insensitive' } },
        { subject: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.emailJob.findMany({
        where: whereClause,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take,
        include: { campaign: true },
      }),
      prisma.emailJob.count({ where: whereClause }),
    ]);

    return res.json({
      emails,
      pagination: {
        total,
        page: parseInt(String(page), 10),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('[API] Error retrieving scheduled emails:', error);
    return res.status(500).json({ error: 'Failed to retrieve scheduled emails.' });
  }
}

/**
 * GET /api/emails/sent
 * Fetches jobs that are 'sent' or 'failed' for the active user.
 */
export async function getSentEmails(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { page = '1', limit = '10', search = '' } = req.query;
    const skip = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
    const take = parseInt(String(limit), 10);

    const whereClause: any = {
      campaign: { userId },
      status: { in: ['sent', 'failed'] },
    };

    if (search) {
      whereClause.OR = [
        { recipient: { contains: String(search), mode: 'insensitive' } },
        { subject: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.emailJob.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: { campaign: true },
      }),
      prisma.emailJob.count({ where: whereClause }),
    ]);

    return res.json({
      emails,
      pagination: {
        total,
        page: parseInt(String(page), 10),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('[API] Error retrieving sent emails:', error);
    return res.status(500).json({ error: 'Failed to retrieve sent emails.' });
  }
}

/**
 * GET /api/emails/stats
 * Aggregates email scheduler statistics (KPI numbers) for the dashboard.
 */
export async function getEmailStats(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ scheduled: 0, sent: 0, failed: 0, totalCampaigns: 0 });
    }

    try {
      const [scheduledCount, processingCount, sentCount, failedCount, totalCampaigns] = await Promise.all([
        prisma.emailJob.count({ where: { campaign: { userId }, status: 'scheduled' } }).catch(() => 0),
        prisma.emailJob.count({ where: { campaign: { userId }, status: 'processing' } }).catch(() => 0),
        prisma.emailJob.count({ where: { campaign: { userId }, status: 'sent' } }).catch(() => 0),
        prisma.emailJob.count({ where: { campaign: { userId }, status: 'failed' } }).catch(() => 0),
        prisma.emailCampaign.count({ where: { userId } }).catch(() => 0),
      ]);

      const totalScheduled = scheduledCount + processingCount;

      return res.json({
        scheduled: totalScheduled,
        sent: sentCount,
        failed: failedCount,
        totalCampaigns,
      });
    } catch {
      return res.json({ scheduled: 0, sent: 0, failed: 0, totalCampaigns: 0 });
    }
  } catch (error) {
    return res.json({ scheduled: 0, sent: 0, failed: 0, totalCampaigns: 0 });
  }
}

/**
 * GET /api/campaigns
 * Retrieves list of all email campaigns.
 */
export async function getCampaigns(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ campaigns: [] });
    }

    try {
      const campaigns = await prisma.emailCampaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { jobs: true },
          },
        },
      });

      return res.json({ campaigns: campaigns || [] });
    } catch {
      return res.json({ campaigns: [] });
    }
  } catch (error) {
    return res.json({ campaigns: [] });
  }
}

// ========== SMTP Settings Endpoints ==========

/**
 * GET /api/emails/smtp-settings
 * Retrieves the current user's SMTP configuration (password masked).
 */
export async function getSmtpSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        refreshToken: true,
        smtpEmail: true,
        smtpAppPassword: true,
        smtpConfigured: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Mask the password for display
    const maskedPassword = user.smtpAppPassword
      ? user.smtpAppPassword.substring(0, 4) + ' •••• •••• ••••'
      : null;

    return res.json({
      email: user.email,
      oauthConfigured: !!user.refreshToken,
      smtpEmail: user.smtpEmail,
      smtpAppPassword: maskedPassword,
      smtpConfigured: user.smtpConfigured || !!user.refreshToken,
      userName: user.name,
    });
  } catch (error) {
    console.error('[API] Error fetching SMTP settings:', error);
    return res.status(500).json({ error: 'Failed to fetch SMTP settings.' });
  }
}

/**
 * PUT /api/emails/smtp-settings
 * Saves or updates the user's Gmail SMTP credentials.
 */
export async function saveSmtpSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { smtpEmail, smtpAppPassword } = req.body;

    if (!smtpEmail || !smtpAppPassword) {
      return res.status(400).json({ error: 'Both Gmail address and App Password are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(smtpEmail)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    // Clear cached transporter for old email
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { smtpEmail: true },
    });
    if (existingUser?.smtpEmail) {
      clearTransporterCache(existingUser.smtpEmail);
    }

    // Save credentials
    await prisma.user.update({
      where: { id: userId },
      data: {
        smtpEmail,
        smtpAppPassword,
        smtpConfigured: true,
      },
    });

    console.log(`[SMTP Settings] User ${userId} saved SMTP credentials for: ${smtpEmail}`);

    return res.json({
      message: 'SMTP settings saved successfully.',
      smtpEmail,
      smtpConfigured: true,
    });
  } catch (error) {
    console.error('[API] Error saving SMTP settings:', error);
    return res.status(500).json({ error: 'Failed to save SMTP settings.' });
  }
}

/**
 * POST /api/emails/smtp-test
 * Tests SMTP credentials by attempting to verify the connection.
 */
export async function testSmtpConnection(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { smtpEmail, smtpAppPassword } = req.body;

    if (!smtpEmail || !smtpAppPassword) {
      return res.status(400).json({ error: 'Both Gmail address and App Password are required.' });
    }

    const isValid = await verifySmtpCredentials(smtpEmail, smtpAppPassword);

    if (isValid) {
      return res.json({ success: true, message: 'SMTP connection verified successfully!' });
    } else {
      return res.status(400).json({
        success: false,
        error: 'SMTP connection failed. Please check your Gmail address and App Password.',
      });
    }
  } catch (error) {
    console.error('[API] Error testing SMTP connection:', error);
    return res.status(500).json({ error: 'Failed to test SMTP connection.' });
  }
}
