import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { getAllActivities } from "@/lib/garmin";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 1000 * 60 * 60;

export async function GET(request: NextRequest) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const user = await prisma.user.findUnique({ where: { email } });

  if (!forceRefresh && user?.activities && user.activitiesCachedAt) {
    const age = Date.now() - user.activitiesCachedAt.getTime();
    if (age < CACHE_TTL_MS) {
      return NextResponse.json(JSON.parse(user.activities));
    }
  }

  try {
    const activities = await getAllActivities(email);
    await prisma.user.update({
      where: { email },
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
