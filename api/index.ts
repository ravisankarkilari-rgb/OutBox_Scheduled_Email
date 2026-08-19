import dotenv from 'dotenv';
import path from 'path';

// Load environment variables for Vercel serverless functions
dotenv.config();

import app from '../backend/src/app';

export default app;
