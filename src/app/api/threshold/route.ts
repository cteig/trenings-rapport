import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { getThresholdData, getThresholdHistory } from "@/lib/garmin";

export async function GET(request: NextRequest) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (request.nextUrl.searchParams.get("history") === "1") {
    const history = await getThresholdHistory(email);
    return NextResponse.json(history);
  }

  const data = await getThresholdData(email);
  if (!data) {
    return NextResponse.json({ error: "Could not fetch threshold data" }, { status: 500 });
  }

  return NextResponse.json(data);
}
