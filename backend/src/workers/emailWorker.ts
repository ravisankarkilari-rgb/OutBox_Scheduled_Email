import { Worker, Job } from 'bullmq';
import { prisma } from '../config/db';
import { redisConnection, redisClient } from '../config/redis';
import { sendEmail } from '../services/emailService';
import { emailQueue } from '../queues/emailQueue';

/**
 * Initializes and starts the BullMQ worker for the 'emailQueue'.
 */
export function startEmailWorker() {
  const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

  const worker = new Worker(
    'emailQueue',
    async (job: Job) => {
      const { emailJobId } = job.data;
      if (!emailJobId) {
        console.error(`[Worker] Job ${job.id} is missing 'emailJobId' in payload`);
        return { error: 'missing_email_job_id' };
      }

      console.log(`[Worker] Processing email job: ${emailJobId} (BullMQ ID: ${job.id})`);

      try {
        // 1. IDEMPOTENCY CHECK: Atomically transition status from 'scheduled' to 'processing'
        // This database constraint protects against multiple workers attempting to send the same email.
        const emailJob = await prisma.$transaction(async (tx: any) => {
          const record = await tx.emailJob.findUnique({
            where: { id: emailJobId },
            include: { campaign: { include: { user: true } } },
          });

          if (!record) {
            console.error(`[Worker] Job record ${emailJobId} not found in database.`);
            return null;
          }

          if (record.status !== 'scheduled') {
            console.log(`[Worker] Job ${emailJobId} is already in state '${record.status}'. Skipping.`);
            return null;
          }

          return await tx.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: 'processing',
              attempts: record.attempts + 1,
              bullJobId: job.id || null,
            },
            include: { campaign: { include: { user: true } } },
          });
        });

        if (!emailJob) {
          return { status: 'skipped', reason: 'already_processed_or_not_found' };
        }

        const { campaign, recipient, subject, body } = emailJob;
        const campaignId = campaign.id;
        const hourlyLimit = campaign.hourlyLimit;

        // 2. HOURLY RATE LIMITING: Check sends for this campaign in the current hour window
        const currentHourStr = new Date().toISOString().substring(0, 13); // "YYYY-MM-DDTHH"
        const rateLimitKey = `rate-limit:campaign:${campaignId}:${currentHourStr}`;

        const currentCount = await redisClient.incr(rateLimitKey);
        if (currentCount === 1) {
          await redisClient.expire(rateLimitKey, 7200); // 2 hours expiration
        }

        if (currentCount > hourlyLimit) {
          console.log(`[Worker] Rate limit reached for campaign ${campaignId} (${currentCount} > ${hourlyLimit}). Rescheduling.`);
          
          // Re-update DB status back to scheduled
          await prisma.emailJob.update({
            where: { id: emailJobId },
            data: { status: 'scheduled' },
          });

          // Calculate delay until start of the next hour
          const now = new Date();
          const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
          const msUntilNextHour = nextHour.getTime() - now.getTime();

          // Re-enqueue the job with a delay
          const retryJobId = `email:${emailJobId}:reschedule:${nextHour.getTime()}`;
          await emailQueue.add(
            'send-email',
            { emailJobId },
            {
              jobId: retryJobId,
              delay: msUntilNextHour,
            }
          );

          console.log(`[Worker] Rescheduled job ${emailJobId} to execute in ${msUntilNextHour} ms (BullMQ ID: ${retryJobId})`);
          return { status: 'rescheduled', reason: 'rate_limit_reached' };
        }

        // 3. MINIMUM EMAIL DELAY: Enforce space between sends at worker level
        const minDelayMs = parseInt(process.env.EMAIL_DELAY_MS || '2000', 10);
        const lastSentStr = await redisClient.get('global-last-sent-time');
        const lastSent = lastSentStr ? parseInt(lastSentStr, 10) : 0;
        const nowMs = Date.now();
        const elapsed = nowMs - lastSent;

        if (elapsed < minDelayMs) {
          const waitTime = minDelayMs - elapsed;
          console.log(`[Worker] Spacing emails. Sleeping for ${waitTime} ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        await redisClient.set('global-last-sent-time', Date.now().toString());

        // 4. DELIVERY: Dispatch email through SMTP/OAuth2 service
        const campaignUser = campaign.user;
        const senderEmail = campaignUser.email || campaignUser.smtpEmail || undefined;
        const result = await sendEmail({
          to: recipient,
          subject,
          body,
          senderName: campaign.senderName || campaignUser.name || 'Outbox Campaign',
          senderEmail,
          senderRefreshToken: campaignUser.refreshToken || undefined,
          senderAppPassword: campaignUser.smtpAppPassword || undefined,
          attachments: (campaign.attachments as any) || undefined,
        });

        // Update database status to sent
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'sent',
            sentAt: new Date(),
            errorMessage: null,
            previewUrl: result.previewUrl || null,
          },
        });

        console.log(`[Worker] Successfully sent email to ${recipient}. Preview URL: ${result.previewUrl}`);
        return { status: 'sent', messageId: result.messageId, previewUrl: result.previewUrl };
      } catch (err: any) {
        console.error(`[Worker] Error sending email job ${emailJobId}:`, err);

        // Update database status to failed
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'failed',
            errorMessage: err.message || 'SMTP sending failed',
          },
        });

        // Throwing the error triggers BullMQ's automatic retry
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency,
    }
  );

  worker.on('active', (job) => {
    console.log(`[Worker] Job ${job.id} is now ACTIVE.`);
  });

  worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} COMPLETED. Result:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} FAILED with error:`, err.message);
  });

  console.log(`[Worker] BullMQ email processor worker started. Concurrency = ${concurrency}`);
  return worker;
}
