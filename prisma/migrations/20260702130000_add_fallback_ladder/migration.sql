ALTER TABLE "Shipment"
ADD COLUMN "recoveryToken" TEXT,
ADD COLUMN "fallbackStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "lastFallbackAt" TIMESTAMP(3),
ADD COLUMN "smsFollowupLink" TEXT,
ADD COLUMN "manualReviewReason" TEXT;

ALTER TABLE "CallExecution"
ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "Shipment_recoveryToken_key" ON "Shipment"("recoveryToken");
