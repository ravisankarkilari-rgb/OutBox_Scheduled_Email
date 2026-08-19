import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import app from './app';
import { startEmailWorker } from './workers/emailWorker';
import { prisma } from './config/db';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function bootstrap() {
  try {
    // 1. Verify connection to PostgreSQL database
    console.log('[Server] Connecting to database...');
    await prisma.$connect();
    console.log('[Server] Database connection established successfully.');

    // 2. Start BullMQ worker processor
    console.log('[Server] Initializing workers...');
    startEmailWorker();

    // 3. Start the Express server
    app.listen(PORT, () => {
      console.log(`[Server] ReachInbox Scheduler Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Critical: Bootstrap failed to initialize:', error);
    process.exit(1);
  }
}

bootstrap();
