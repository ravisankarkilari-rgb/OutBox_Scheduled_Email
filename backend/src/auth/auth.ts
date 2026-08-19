import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { authenticate } from '../middleware/authMiddleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretreachinboxschedulerkey123456!';
const DEFAULT_CALLBACK_URL = 'https://out-box-scheduled-email-c47jvzj2i.vercel.app/api/auth/google/callback';
const DEFAULT_FRONTEND_URL = 'https://frontend-theta-three-62.vercel.app';

function getCallbackUrl(req: Request): string {
  if (process.env.GOOGLE_CALLBACK_URL && process.env.GOOGLE_CALLBACK_URL.trim()) {
    return process.env.GOOGLE_CALLBACK_URL.trim();
  }
  const host = req.get('host');
  if (host && !host.includes('localhost')) {
    return `https://${host}/api/auth/google/callback`;
  }
  return DEFAULT_CALLBACK_URL;
}

/**
 * GET /api/auth/google
 * Redirects the user to Google's OAuth consent screen.
 */
router.get('/google', (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'Google OAuth credentials missing on backend. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
  }

  const callbackUrl = getCallbackUrl(req);
  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, callbackUrl);

  const authorizeUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
    redirect_uri: callbackUrl,
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
  const targetFrontendUrl = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;

  if (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${targetFrontendUrl}/auth-error?error=${encodeURIComponent(String(error))}`);
  }

  if (!code) {
    return res.redirect(`${targetFrontendUrl}/auth-error?error=missing_code`);
  }

  try {
    const callbackUrl = getCallbackUrl(req);
    const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, callbackUrl);

    // Exchange auth code for tokens
    const { tokens } = await client.getToken({
      code: String(code),
      redirect_uri: callbackUrl,
    });
    client.setCredentials(tokens);

    // Fetch user details from Google userinfo API
    const ticket = await client.request<{
      id: string;
      email: string;
      name: string;
      picture?: string;
    }>({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });

    const profile = ticket.data;

    if (!profile.email) {
      return res.redirect(`${targetFrontendUrl}/auth-error?error=email_not_provided`);
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
    return res.redirect(`${targetFrontendUrl}/auth/callback?token=${token}`);
  } catch (err: any) {
    console.error('Failed to exchange code and log in user:', err);
    return res.redirect(`${targetFrontendUrl}/auth-error?error=token_exchange_failed`);
  }
});

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
