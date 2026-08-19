import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const emailQueue = new Queue('emailQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry failed emails automatically up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds initial delay for exponential retries
    },
    removeOnComplete: true, // Clean up completed jobs to prevent Redis storage leaks
    removeOnFail: false,   // Keep failed jobs for reporting in UI
  },
});
