import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './auth/auth';
import emailRoutes from './routes/emailRoutes';

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security Headers
app.use(helmet());

// CORS config
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// Body Parsers (increased to 35mb for file/photo/video attachments)
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Routing API bindings
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Centralized Express Error Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Express Error Handler]:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  return res.status(status).json({
    error: message,
    details: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
});

export default app;
