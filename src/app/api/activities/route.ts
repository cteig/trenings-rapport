import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { getAllActivities } from "@/lib/garmin";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 1000 * 60 * 60;

function normalizeActivityTypes(activities: unknown) {
  if (!Array.isArray(activities)) return activities;

  return activities.map((activity) => {
    if (!activity || typeof activity !== "object") return activity;

    const item = activity as Record<string, unknown>;
    if (
      item.type === "Ski" ||
      item.type === "NordicSki" ||
      item.type === "cross_country_skiing" ||
      item.type === "cross_country_skiing_ws" ||
      item.type === "skate_skiing_ws" ||
      item.type === "resort_skiing_snowboarding_ws"
    ) {
      return { ...item, type: "Skiing" };
    }

    if (
      item.type === "Ride" ||
      item.type === "VirtualRide" ||
      item.type === "mountain_biking" ||
      item.type === "cycling" ||
      item.type === "indoor_cycling"
    ) {
      return { ...item, type: "Sykkel" };
    }

    if (
      item.type === "WeightTraining" ||
      item.type === "strength_training" ||
      item.type === "pilates" ||
      item.type === "fitness_equipment"
    ) {
      return { ...item, type: "Styrke" };
    }

    if (item.type === "indoor_climbing") {
      return { ...item, type: "Klatring" };
    }

    if (
      item.type === "Walk" ||
      item.type === "Hike" ||
      item.type === "walking" ||
      item.type === "hiking"
    ) {
      return { ...item, type: "Walking" };
    }

    if (item.type === "rowing_v2") {
      return { ...item, type: "Roing" };
    }

    if (item.type === "breathwork") {
      return { ...item, type: "Pusteøvelse" };
    }

    if (item.type === "track_running" || item.type === "street_running") {
      return { ...item, type: "Run" };
    }

    return item;
  });
}

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
      return NextResponse.json(normalizeActivityTypes(JSON.parse(user.activities)));
    }
  }

  try {
    const activities = normalizeActivityTypes(await getAllActivities(email));
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
      return NextResponse.json(normalizeActivityTypes(JSON.parse(user.activities)));
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
