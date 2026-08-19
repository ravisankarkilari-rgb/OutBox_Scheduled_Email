import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretreachinboxschedulerkey123456!';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL
);

/**
 * GET /api/auth/google
 * Redirects the user to Google's OAuth consent screen.
 */
router.get('/google', (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'Google OAuth configuration missing. Please check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
    });
  }

  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });

  return res.redirect(authorizeUrl);
});

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth callback, exchanges code for user profile,
 * creates/updates user in PostgreSQL, signs a JWT, and redirects to frontend.
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${FRONTEND_URL}/auth-error?error=${encodeURIComponent(String(error))}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/auth-error?error=missing_code`);
  }

  try {
    // Exchange auth code for tokens
    const { tokens } = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokens);

    // Fetch user details from Google userinfo API
    const ticket = await oauth2Client.request<{
      id: string;
      email: string;
      name: string;
      picture?: string;
    }>({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });

    const profile = ticket.data;

    if (!profile.email) {
      return res.redirect(`${FRONTEND_URL}/auth-error?error=email_not_provided`);
    }

    const updateData: any = {
      name: profile.name || 'Google User',
      avatar: profile.picture || null,
    };
    if (tokens.refresh_token) {
      updateData.refreshToken = tokens.refresh_token;
    }
    if (tokens.access_token) {
      updateData.accessToken = tokens.access_token;
    }

    // Find or create user in PostgreSQL
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: updateData,
      create: {
        googleId: profile.id,
        email: profile.email,
        name: profile.name || 'Google User',
        avatar: profile.picture || null,
        refreshToken: tokens.refresh_token || null,
        accessToken: tokens.access_token || null,
      },
    });

    // Create JWT token (valid for 7 days)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend auth handler page
    return res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err: any) {
    console.error('Failed to exchange code and log in user:', err);
    return res.redirect(`${FRONTEND_URL}/auth-error?error=token_exchange_failed`);
  }
});

import { authenticate } from '../middleware/authMiddleware';
import { AuthenticatedRequest } from '../types';

/**
 * GET /api/auth/me
 * Retrieves the current session user info from the JWT payload.
 */
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

/**
 * POST /api/auth/logout
 * Acknowledges user logout. Client deletes token from storage.
 */
router.post('/logout', (req: Request, res: Response) => {
  return res.json({ message: 'Logout successful' });
});

export default router;
