import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const defaultDatabaseUrl =
  process.env.NODE_ENV === "production"
    ? "file:/var/lib/trenings-rapport/dev.db"
    : "file:prisma/dev.db";

const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;
const adapter = new PrismaLibSql({ url: databaseUrl });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
