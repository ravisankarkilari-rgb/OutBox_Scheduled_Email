import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

export function createRedisClient(): Redis {
  if (redisUrl && redisUrl.trim()) {
    return new Redis(redisUrl.trim(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: redisUrl.trim().startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });
  }

  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD || undefined;

  return new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,
  });
}

// Reusable connections for BullMQ and application cache
export const redisConnection = createRedisClient();
export const redisClient = createRedisClient();
