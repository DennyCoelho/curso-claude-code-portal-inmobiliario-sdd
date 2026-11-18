BEGIN;

CREATE TABLE "EmailChange" (
    "tokenHash" VARCHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "previousEmail" VARCHAR(254) NOT NULL,
    "newEmail" VARCHAR(254) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailChange_pkey" PRIMARY KEY ("tokenHash"),
    CONSTRAINT "EmailChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EmailChange_userId_key" ON "EmailChange"("userId");
CREATE INDEX "EmailChange_expiresAt_idx" ON "EmailChange"("expiresAt");

COMMIT;
