import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken, getSessionUserId } from "@/lib/auth";
import { getAllActivities } from "@/lib/strava";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function GET(request: NextRequest) {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const stravaId = await getSessionUserId();
  if (!stravaId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const user = await prisma.user.findUnique({ where: { stravaId } });

  if (!forceRefresh && user?.activities && user.activitiesCachedAt) {
    const age = Date.now() - user.activitiesCachedAt.getTime();
    if (age < CACHE_TTL_MS) {
      return NextResponse.json(JSON.parse(user.activities));
    }
  }

  try {
    const activities = await getAllActivities();
    await prisma.user.update({
      where: { stravaId },
      data: {
        activities: JSON.stringify(activities),
        activitiesCachedAt: new Date(),
      },
    });
    return NextResponse.json(activities);
  } catch (error) {
    if (user?.activities) {
      return NextResponse.json(JSON.parse(user.activities));
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
