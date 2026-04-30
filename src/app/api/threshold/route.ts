import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { getThresholdData } from "@/lib/garmin";

export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const data = await getThresholdData(email);
  if (!data) {
    return NextResponse.json({ error: "Could not fetch threshold data" }, { status: 500 });
  }

  return NextResponse.json(data);
}
