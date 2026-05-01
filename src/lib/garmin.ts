import { GarminConnect } from "garmin-connect";
import { prisma } from "./prisma";
import { StravaActivity } from "@/types/strava";

export async function createGarminClient(email: string): Promise<GarminConnect> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.garminSession) {
    throw new Error("No Garmin session found");
  }

  const gc = new GarminConnect({
    username: email,
    password: "",
  });

  const session = JSON.parse(user.garminSession);
  await gc.loadToken(session.oauth1, session.oauth2);
  return gc;
}

export async function loginToGarmin(
  email: string,
  password: string
): Promise<{ firstName: string }> {
  const gc = new GarminConnect({ username: email, password });
  await gc.login();

  const token = await gc.exportToken();

  let firstName: string = email.split("@")[0];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile: any = await gc.getUserProfile();
    const name = profile?.firstName || profile?.displayName || profile?.fullName;
    if (name && !name.match(/^[0-9a-f-]{36}$/)) {
      firstName = name;
    }
  } catch {
    // empty
  }

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      firstName,
      garminSession: JSON.stringify(token),
    },
    update: {
      firstName,
      garminSession: JSON.stringify(token),
    },
  });

  return { firstName };
}

export async function getAllActivities(email: string): Promise<StravaActivity[]> {
  const gc = await createGarminClient(email);

  const allActivities: StravaActivity[] = [];
  let start = 0;
  const limit = 100;

  while (true) {
    const activities = await gc.getActivities(start, limit);
    if (!activities || activities.length === 0) break;

    for (const act of activities) {
      allActivities.push(mapGarminActivity(act));
    }

    if (activities.length < limit) break;
    start += limit;
  }

  const threshold = await fetchThresholdData(gc);
  await storeThresholdSnapshot(email, threshold);

  const token = await gc.exportToken();
  await prisma.user.update({
    where: { email },
    data: { garminSession: JSON.stringify(token) },
  });

  return allActivities;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGarminActivity(act: any): StravaActivity {
  return {
    id: act.activityId,
    name: act.activityName || "Aktivitet",
    type: mapActivityType(act.activityType?.typeKey || "other"),
    sport_type: act.activityType?.typeKey || "other",
    start_date: act.startTimeGMT || "",
    start_date_local: act.startTimeLocal || act.startTimeGMT || "",
    elapsed_time: act.elapsedDuration || act.duration || 0,
    moving_time: act.movingDuration || act.duration || 0,
    distance: act.distance || 0,
    total_elevation_gain: act.elevationGain || 0,
    elevation_loss: act.elevationLoss || undefined,
    average_speed: act.averageSpeed || 0,
    max_speed: act.maxSpeed || 0,
    average_heartrate: act.averageHR || undefined,
    max_heartrate: act.maxHR || undefined,
    has_heartrate: !!(act.averageHR && act.maxHR),
    suffer_score: undefined,
    calories: act.calories || undefined,
    aerobic_training_effect: act.aerobicTrainingEffect || undefined,
    anaerobic_training_effect: act.anaerobicTrainingEffect || undefined,
    vo2max: act.vO2MaxValue || undefined,
    training_load: act.activityTrainingLoad || undefined,
    avg_running_cadence: act.averageRunningCadenceInStepsPerMinute || undefined,
    avg_stride_length: act.avgStrideLength || undefined,
    avg_ground_contact_time: act.avgGroundContactTime || undefined,
    avg_vertical_oscillation: act.avgVerticalOscillation || undefined,
    hr_time_in_zone_1: act.hrTimeInZone_1 || undefined,
    hr_time_in_zone_2: act.hrTimeInZone_2 || undefined,
    hr_time_in_zone_3: act.hrTimeInZone_3 || undefined,
    hr_time_in_zone_4: act.hrTimeInZone_4 || undefined,
    hr_time_in_zone_5: act.hrTimeInZone_5 || undefined,
  };
}

function mapActivityType(garminType: string): string {
  const typeMap: Record<string, string> = {
    running: "Run",
    cycling: "Sykkel",
    swimming: "Swim",
    walking: "Walking",
    hiking: "Walking",
    strength_training: "Styrke",
    fitness_equipment: "Styrke",
    yoga: "Yoga",
    pilates: "Styrke",
    cardio: "Workout",
    breathwork: "Pusteøvelse",
    rowing_v2: "Roing",
    cross_country_skiing: "Skiing",
    cross_country_skiing_ws: "Skiing",
    skate_skiing_ws: "Skiing",
    resort_skiing: "AlpineSki",
    resort_skiing_snowboarding_ws: "Skiing",
    rock_climbing: "RockClimbing",
    indoor_climbing: "Klatring",
    virtual_ride: "Sykkel",
    treadmill_running: "Run",
    track_running: "Run",
    street_running: "Run",
    indoor_cycling: "Sykkel",
    mountain_biking: "Sykkel",
    trail_running: "Run",
    open_water_swimming: "Swim",
    lap_swimming: "Swim",
  };
  return typeMap[garminType] || garminType;
}

export interface ThresholdData {
  lactateThresholdHR?: number;
  lactateThresholdPace?: string; // mm:ss /km
  vo2MaxRunning?: number;
  vo2MaxCycling?: number;
}

async function fetchThresholdData(gc: GarminConnect): Promise<ThresholdData | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: any = await gc.getUserSettings();
    const userData = settings?.userData;
    if (!userData) return null;

    let lactateThresholdPace: string | undefined;
    if (userData.lactateThresholdSpeed && userData.lactateThresholdSpeed > 0) {
      const paceSecsPerKm = 1000 / userData.lactateThresholdSpeed;
      const mins = Math.floor(paceSecsPerKm / 60);
      const secs = Math.round(paceSecsPerKm % 60);
      lactateThresholdPace = `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    return {
      lactateThresholdHR: userData.lactateThresholdHeartRate || undefined,
      lactateThresholdPace,
      vo2MaxRunning: userData.vo2MaxRunning || undefined,
      vo2MaxCycling: userData.vo2MaxCycling || undefined,
    };
  } catch {
    return null;
  }
}

async function storeThresholdSnapshot(
  email: string,
  threshold: ThresholdData | null
): Promise<void> {
  if (!threshold) return;

  const hasAnyValue =
    threshold.lactateThresholdHR != null ||
    threshold.lactateThresholdPace != null ||
    threshold.vo2MaxRunning != null ||
    threshold.vo2MaxCycling != null;

  if (!hasAnyValue) return;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      thresholdSnapshots: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) return;

  const latest = user.thresholdSnapshots[0];
  const unchanged =
    latest != null &&
    latest.lactateThresholdHR === (threshold.lactateThresholdHR ?? null) &&
    latest.lactateThresholdPace === (threshold.lactateThresholdPace ?? null) &&
    latest.vo2MaxRunning === (threshold.vo2MaxRunning ?? null) &&
    latest.vo2MaxCycling === (threshold.vo2MaxCycling ?? null);

  if (unchanged) return;

  await prisma.thresholdSnapshot.create({
    data: {
      userId: user.id,
      lactateThresholdHR: threshold.lactateThresholdHR,
      lactateThresholdPace: threshold.lactateThresholdPace,
      vo2MaxRunning: threshold.vo2MaxRunning,
      vo2MaxCycling: threshold.vo2MaxCycling,
    },
  });
}

export async function getThresholdData(email: string): Promise<ThresholdData | null> {
  const gc = await createGarminClient(email);
  return fetchThresholdData(gc);
}

export async function getThresholdHistory(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return [];

  return prisma.thresholdSnapshot.findMany({
    where: { userId: user.id },
    orderBy: { recordedAt: "asc" },
  });
}
