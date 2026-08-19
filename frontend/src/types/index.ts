export interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar?: string | null;
  smtpEmail?: string | null;
  smtpConfigured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface EmailJob {
  id: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: JobStatus;
  attempts: number;
  bullJobId?: string | null;
  errorMessage?: string | null;
  previewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: EmailCampaign;
}

export interface EmailAttachment {
  filename: string;
  contentType?: string;
  content: string; // Base64
  size?: number;
}

export interface EmailCampaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  senderName?: string | null;
  attachments?: EmailAttachment[] | null;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    jobs: number;
  };
}

export interface DashboardStats {
  scheduled: number;
  sent: number;
  failed: number;
  totalCampaigns: number;
}

export interface SmtpSettings {
  email?: string;
  oauthConfigured?: boolean;
  smtpEmail: string | null;
  smtpAppPassword: string | null;
  smtpConfigured: boolean;
  userName: string;
}
