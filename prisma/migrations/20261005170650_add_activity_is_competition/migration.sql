-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
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
    "isCompetition" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("aerobicTrainingEffect", "anaerobicTrainingEffect", "averageHeartrate", "averageSpeed", "avgGroundContactTime", "avgRunningCadence", "avgStrideLength", "avgVerticalOscillation", "calories", "comment", "distance", "elapsedTime", "elevationLoss", "garminId", "hasHeartrate", "hrTimeInZone1", "hrTimeInZone2", "hrTimeInZone3", "hrTimeInZone4", "hrTimeInZone5", "id", "maxHeartrate", "maxSpeed", "movingTime", "name", "startDate", "startDateLocal", "sufferScore", "syncedAt", "totalElevationGain", "trainingLoad", "type", "userId", "vo2max") SELECT "aerobicTrainingEffect", "anaerobicTrainingEffect", "averageHeartrate", "averageSpeed", "avgGroundContactTime", "avgRunningCadence", "avgStrideLength", "avgVerticalOscillation", "calories", "comment", "distance", "elapsedTime", "elevationLoss", "garminId", "hasHeartrate", "hrTimeInZone1", "hrTimeInZone2", "hrTimeInZone3", "hrTimeInZone4", "hrTimeInZone5", "id", "maxHeartrate", "maxSpeed", "movingTime", "name", "startDate", "startDateLocal", "sufferScore", "syncedAt", "totalElevationGain", "trainingLoad", "type", "userId", "vo2max" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE INDEX "Activity_userId_startDateLocal_idx" ON "Activity"("userId", "startDateLocal");
CREATE UNIQUE INDEX "Activity_userId_garminId_key" ON "Activity"("userId", "garminId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
