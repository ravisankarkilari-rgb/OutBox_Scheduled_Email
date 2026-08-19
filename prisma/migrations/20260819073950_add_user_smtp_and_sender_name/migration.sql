-- AlterTable
ALTER TABLE "EmailCampaign" ADD COLUMN     "senderName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "smtpAppPassword" TEXT,
ADD COLUMN     "smtpConfigured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtpEmail" TEXT;
