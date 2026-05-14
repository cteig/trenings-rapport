-- CreateTable
CREATE TABLE "Activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "garminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "startDateLocal" TEXT NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "distance" REAL NOT NULL,
    "totalElevationGain" REAL NOT NULL,
    "elevationLoss" REAL,
    "averageSpeed" REAL NOT NULL,
    "maxSpeed" REAL NOT NULL,
    "averageHeartrate" REAL,
    "maxHeartrate" REAL,
    "hasHeartrate" BOOLEAN NOT NULL DEFAULT false,
    "sufferScore" REAL,
    "calories" REAL,
    "aerobicTrainingEffect" REAL,
    "anaerobicTrainingEffect" REAL,
    "vo2max" REAL,
    "trainingLoad" REAL,
    "avgRunningCadence" REAL,
    "avgStrideLength" REAL,
    "avgGroundContactTime" REAL,
    "avgVerticalOscillation" REAL,
    "hrTimeInZone1" REAL,
    "hrTimeInZone2" REAL,
    "hrTimeInZone3" REAL,
    "hrTimeInZone4" REAL,
    "hrTimeInZone5" REAL,
    "comment" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Activity_userId_startDateLocal_idx" ON "Activity"("userId", "startDateLocal");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_userId_garminId_key" ON "Activity"("userId", "garminId");
