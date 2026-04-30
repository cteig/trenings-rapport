-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stravaId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" INTEGER NOT NULL,
    "activities" TEXT,
    "activitiesCachedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accessToken", "activities", "activitiesCachedAt", "createdAt", "id", "refreshToken", "stravaId", "tokenExpiresAt", "updatedAt") SELECT "accessToken", "activities", "activitiesCachedAt", "createdAt", "id", "refreshToken", "stravaId", "tokenExpiresAt", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_stravaId_key" ON "User"("stravaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
