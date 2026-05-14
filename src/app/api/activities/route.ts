import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { getAllActivities } from "@/lib/garmin";
import { prisma } from "@/lib/prisma";
import type { Activity } from "@/generated/prisma/client";
import type { StravaActivity } from "@/types/strava";

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

function mapDbToActivity(row: Activity): StravaActivity & { comment?: string } {
  return {
    id: Number(row.garminId),
    name: row.name,
    type: row.type,
    sport_type: row.type,
    start_date: row.startDate,
    start_date_local: row.startDateLocal,
    elapsed_time: row.elapsedTime,
    moving_time: row.movingTime,
    distance: row.distance,
    total_elevation_gain: row.totalElevationGain,
    elevation_loss: row.elevationLoss ?? undefined,
    average_speed: row.averageSpeed,
    max_speed: row.maxSpeed,
    average_heartrate: row.averageHeartrate ?? undefined,
    max_heartrate: row.maxHeartrate ?? undefined,
    has_heartrate: row.hasHeartrate,
    suffer_score: row.sufferScore ?? undefined,
    calories: row.calories ?? undefined,
    aerobic_training_effect: row.aerobicTrainingEffect ?? undefined,
    anaerobic_training_effect: row.anaerobicTrainingEffect ?? undefined,
    vo2max: row.vo2max ?? undefined,
    training_load: row.trainingLoad ?? undefined,
    avg_running_cadence: row.avgRunningCadence ?? undefined,
    avg_stride_length: row.avgStrideLength ?? undefined,
    avg_ground_contact_time: row.avgGroundContactTime ?? undefined,
    avg_vertical_oscillation: row.avgVerticalOscillation ?? undefined,
    hr_time_in_zone_1: row.hrTimeInZone1 ?? undefined,
    hr_time_in_zone_2: row.hrTimeInZone2 ?? undefined,
    hr_time_in_zone_3: row.hrTimeInZone3 ?? undefined,
    hr_time_in_zone_4: row.hrTimeInZone4 ?? undefined,
    hr_time_in_zone_5: row.hrTimeInZone5 ?? undefined,
    comment: row.comment ?? undefined,
  };
}

function mapActivityToDb(activity: StravaActivity, userId: number) {
  return {
    userId,
    garminId: String(activity.id),
    name: activity.name,
    type: activity.type,
    startDate: activity.start_date,
    startDateLocal: activity.start_date_local,
    elapsedTime: activity.elapsed_time,
    movingTime: activity.moving_time,
    distance: activity.distance,
    totalElevationGain: activity.total_elevation_gain,
    elevationLoss: activity.elevation_loss ?? null,
    averageSpeed: activity.average_speed,
    maxSpeed: activity.max_speed,
    averageHeartrate: activity.average_heartrate ?? null,
    maxHeartrate: activity.max_heartrate ?? null,
    hasHeartrate: activity.has_heartrate,
    sufferScore: activity.suffer_score ?? null,
    calories: activity.calories ?? null,
    aerobicTrainingEffect: activity.aerobic_training_effect ?? null,
    anaerobicTrainingEffect: activity.anaerobic_training_effect ?? null,
    vo2max: activity.vo2max ?? null,
    trainingLoad: activity.training_load ?? null,
    avgRunningCadence: activity.avg_running_cadence ?? null,
    avgStrideLength: activity.avg_stride_length ?? null,
    avgGroundContactTime: activity.avg_ground_contact_time ?? null,
    avgVerticalOscillation: activity.avg_vertical_oscillation ?? null,
    hrTimeInZone1: activity.hr_time_in_zone_1 ?? null,
    hrTimeInZone2: activity.hr_time_in_zone_2 ?? null,
    hrTimeInZone3: activity.hr_time_in_zone_3 ?? null,
    hrTimeInZone4: activity.hr_time_in_zone_4 ?? null,
    hrTimeInZone5: activity.hr_time_in_zone_5 ?? null,
    syncedAt: new Date(),
  };
}

export async function GET(request: NextRequest) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!forceRefresh) {
    const mostRecent = await prisma.activity.findFirst({
      where: { userId: user.id },
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    });

    if (mostRecent) {
      const age = Date.now() - mostRecent.syncedAt.getTime();
      if (age < CACHE_TTL_MS) {
        const rows = await prisma.activity.findMany({
          where: { userId: user.id },
          orderBy: { startDateLocal: "desc" },
        });
        return NextResponse.json(rows.map(mapDbToActivity));
      }
    }
  }

  try {
    const rawActivities = await getAllActivities(email);
    const normalizedActivities = normalizeActivityTypes(rawActivities) as StravaActivity[];

    await prisma.$transaction(
      normalizedActivities.map((activity) => {
        const data = mapActivityToDb(activity, user.id);
        return prisma.activity.upsert({
          where: { userId_garminId: { userId: user.id, garminId: String(activity.id) } },
          create: data,
          update: {
            name: data.name,
            type: data.type,
            startDate: data.startDate,
            startDateLocal: data.startDateLocal,
            elapsedTime: data.elapsedTime,
            movingTime: data.movingTime,
            distance: data.distance,
            totalElevationGain: data.totalElevationGain,
            elevationLoss: data.elevationLoss,
            averageSpeed: data.averageSpeed,
            maxSpeed: data.maxSpeed,
            averageHeartrate: data.averageHeartrate,
            maxHeartrate: data.maxHeartrate,
            hasHeartrate: data.hasHeartrate,
            sufferScore: data.sufferScore,
            calories: data.calories,
            aerobicTrainingEffect: data.aerobicTrainingEffect,
            anaerobicTrainingEffect: data.anaerobicTrainingEffect,
            vo2max: data.vo2max,
            trainingLoad: data.trainingLoad,
            avgRunningCadence: data.avgRunningCadence,
            avgStrideLength: data.avgStrideLength,
            avgGroundContactTime: data.avgGroundContactTime,
            avgVerticalOscillation: data.avgVerticalOscillation,
            hrTimeInZone1: data.hrTimeInZone1,
            hrTimeInZone2: data.hrTimeInZone2,
            hrTimeInZone3: data.hrTimeInZone3,
            hrTimeInZone4: data.hrTimeInZone4,
            hrTimeInZone5: data.hrTimeInZone5,
            syncedAt: data.syncedAt,
          },
        });
      })
    );

    // Also update the old User.activities cache
    await prisma.user.update({
      where: { email },
      data: {
        activities: JSON.stringify(normalizedActivities),
        activitiesCachedAt: new Date(),
      },
    });

    const rows = await prisma.activity.findMany({
      where: { userId: user.id },
      orderBy: { startDateLocal: "desc" },
    });
    return NextResponse.json(rows.map(mapDbToActivity));
  } catch (error) {
    // Fall back to Activity table if available
    const rows = await prisma.activity.findMany({
      where: { userId: user.id },
      orderBy: { startDateLocal: "desc" },
    });
    if (rows.length > 0) {
      return NextResponse.json(rows.map(mapDbToActivity));
    }
    // Fall back to old cache
    if (user?.activities) {
      return NextResponse.json(normalizeActivityTypes(JSON.parse(user.activities)));
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}