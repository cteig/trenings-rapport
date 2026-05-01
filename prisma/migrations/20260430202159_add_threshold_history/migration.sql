-- CreateTable
CREATE TABLE "ThresholdSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "lactateThresholdHR" INTEGER,
    "lactateThresholdPace" TEXT,
    "vo2MaxRunning" REAL,
    "vo2MaxCycling" REAL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThresholdSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ThresholdSnapshot_userId_recordedAt_idx" ON "ThresholdSnapshot"("userId", "recordedAt");
