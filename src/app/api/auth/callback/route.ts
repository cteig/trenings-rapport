import { NextRequest, NextResponse } from "next/server";
import { upsertUser, setSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  const tokenRes = await fetch("https://www.strava.com/api/v3/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/?error=token_failed", request.url));
  }

  const data = await tokenRes.json();
  const stravaId: number = data.athlete.id;
  const firstName: string = data.athlete.firstname || "";

  await upsertUser(stravaId, firstName, data.access_token, data.refresh_token, data.expires_at);
  await setSession(stravaId);

  return NextResponse.redirect(new URL("/", request.url));
}
