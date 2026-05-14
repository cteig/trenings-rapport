import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { getWellnessData } from "@/lib/garmin";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 1000 * 60 * 60;

function sliceDays(data: unknown, days: number) {
  if (!Array.isArray(data)) return [];
  return data.slice(-days);
}

export async function GET(request: NextRequest) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const daysParam = Number(request.nextUrl.searchParams.get("days") || "30");
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 90) : 30;
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const user = await prisma.user.findUnique({ where: { email } });

  if (!forceRefresh && user?.wellness && user.wellnessCachedAt) {
    const age = Date.now() - user.wellnessCachedAt.getTime();
    if (age < CACHE_TTL_MS) {
      return NextResponse.json(sliceDays(JSON.parse(user.wellness), days));
    }
  }

  try {
    const data = await getWellnessData(email, 90);
    await prisma.user.update({
      where: { email },
      data: {
        wellness: JSON.stringify(data),
        wellnessCachedAt: new Date(),
      },
    });
    return NextResponse.json(sliceDays(data, days));
  } catch (error) {
    if (user?.wellness) {
      return NextResponse.json(sliceDays(JSON.parse(user.wellness), days));
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
