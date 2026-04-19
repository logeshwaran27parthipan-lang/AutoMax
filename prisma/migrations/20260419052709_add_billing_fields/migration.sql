-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "plan_id" TEXT,
ADD COLUMN     "subscription_id" TEXT,
ADD COLUMN     "subscription_status" TEXT DEFAULT 'free';
