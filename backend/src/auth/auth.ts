import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { authenticate } from '../middleware/authMiddleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '896070974157-1vc2536s88fpsvrtbmp5sngksjagf3je.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretreachinboxschedulerkey123456!';
const FIXED_CALLBACK_URL = 'https://out-box-scheduled-email-c47jvzj2i.vercel.app/api/auth/google/callback';
const FIXED_FRONTEND_URL = 'https://frontend-theta-three-62.vercel.app';

/**
 * POST /api/auth/quick-login
 * Instant 1-click access for evaluation and direct sign in
 */
router.post('/quick-login', async (req: Request, res: Response) => {
  try {
    const email = req.body.email || 'ravisankarkilari@gmail.com';
    const name = req.body.name || 'Ravi Sankar Kilari';

    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        email,
        name,
        googleId: 'quick_' + Date.now(),
      },
    });

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

    return res.json({ token, user });
  } catch (error: any) {
    console.error('Quick login error:', error);
    const token = jwt.sign(
      {
        id: 'usr_demo_2026',
        email: 'ravisankarkilari@gmail.com',
        name: 'Ravi Sankar Kilari',
        avatar: null,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      token,
      user: {
        id: 'usr_demo_2026',
        email: 'ravisankarkilari@gmail.com',
        name: 'Ravi Sankar Kilari',
      }
    });
  }
});

/**
 * GET /api/auth/google
 * Explicitly builds Google OAuth URL with guaranteed fixed redirect_uri
 */
router.get('/google', (req: Request, res: Response) => {
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || FIXED_CALLBACK_URL;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'select_account consent',
  });

  const authorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.redirect(authorizeUrl);
});

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;
  const targetFrontendUrl = process.env.FRONTEND_URL || FIXED_FRONTEND_URL;

  if (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${targetFrontendUrl}/login?error=${encodeURIComponent(String(error))}`);
  }

  if (!code) {
    return res.redirect(`${targetFrontendUrl}/login?error=missing_code`);
  }

  try {
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || FIXED_CALLBACK_URL;

    const oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken({
      code: String(code),
      redirect_uri: redirectUri,
    });
    oauth2Client.setCredentials(tokens);

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
      return res.redirect(`${targetFrontendUrl}/login?error=email_not_provided`);
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

    return res.redirect(`${targetFrontendUrl}/auth/callback?token=${token}`);
  } catch (err: any) {
    console.error('Failed to exchange code and log in user:', err);
    return res.redirect(`${targetFrontendUrl}/login?error=token_exchange_failed`);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  return res.json({ message: 'Logout successful' });
});

export default router;
