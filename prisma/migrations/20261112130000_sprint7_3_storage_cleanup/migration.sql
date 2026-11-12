CREATE TABLE "StorageCleanup" (
  "id" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorageCleanup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageCleanup_objectKey_key" ON "StorageCleanup"("objectKey");
CREATE INDEX "StorageCleanup_nextAttemptAt_idx" ON "StorageCleanup"("nextAttemptAt");
