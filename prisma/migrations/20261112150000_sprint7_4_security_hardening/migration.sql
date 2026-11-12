CREATE TABLE "RateLimit" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

CREATE TABLE "ApiRateLimit" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "ApiRateLimit_expiresAt_idx" ON "ApiRateLimit"("expiresAt");
