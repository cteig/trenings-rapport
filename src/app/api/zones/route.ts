import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/auth";
import { getAthleteZones } from "@/lib/strava";

export async function GET() {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const zones = await getAthleteZones();
    return NextResponse.json(zones);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
