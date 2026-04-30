import { StravaActivity, StravaZones } from "@/types/strava";
import { getValidAccessToken } from "./auth";

const BASE_URL = "https://www.strava.com/api/v3";

async function stravaFetch<T>(path: string): Promise<T> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    throw new Error("Rate limited by Strava. Try again later.");
  }

  if (!res.ok) {
    throw new Error(`Strava API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function getActivities(
  page: number = 1,
  perPage: number = 200
): Promise<StravaActivity[]> {
  return stravaFetch<StravaActivity[]>(`/athlete/activities?page=${page}&per_page=${perPage}`);
}

export async function getAllActivities(): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  let page = 1;

  while (true) {
    const batch = await getActivities(page, 200);
    all.push(...batch);
    if (batch.length < 200) break;
    page++;
  }

  return all;
}

export async function getAthleteZones(): Promise<StravaZones> {
  return stravaFetch<StravaZones>("/athlete/zones");
}

export interface ActivityZoneData {
  distribution_buckets: Array<{
    min: number;
    max: number;
    time: number; // seconds in zone
  }>;
  type: string;
}

export async function getActivityZones(activityId: number): Promise<ActivityZoneData[]> {
  return stravaFetch<ActivityZoneData[]>(`/activities/${activityId}/zones`);
}
