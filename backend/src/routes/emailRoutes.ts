import { Router } from 'express';
import {
  scheduleCampaign,
  getScheduledEmails,
  getSentEmails,
  getEmailStats,
  getCampaigns,
  getSmtpSettings,
  saveSmtpSettings,
  testSmtpConnection,
} from '../controllers/emailController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to protect all email/scheduling routes
router.use(authenticate);

router.post('/schedule', scheduleCampaign);
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.get('/stats', getEmailStats);
router.get('/campaigns', getCampaigns);
router.get('/smtp-settings', getSmtpSettings);
router.put('/smtp-settings', saveSmtpSettings);
router.post('/smtp-test', testSmtpConnection);

export default router;
