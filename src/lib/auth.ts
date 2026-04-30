import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "session_strava_id";

export async function getSessionUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return parseInt(raw, 10) || null;
}

export async function setSession(stravaId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, String(stravaId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getValidAccessToken(): Promise<string | null> {
  const stravaId = await getSessionUserId();
  if (!stravaId) return null;

  const user = await prisma.user.findUnique({ where: { stravaId } });
  if (!user) return null;

  const now = Math.floor(Date.now() / 1000);
  if (user.tokenExpiresAt > now + 60) {
    return user.accessToken;
  }

  const refreshed = await refreshAccessToken(user.refreshToken);
  if (!refreshed) return null;

  await prisma.user.update({
    where: { stravaId },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      tokenExpiresAt: refreshed.expires_at,
    },
  });

  return refreshed.access_token;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_at: number } | null> {
  const res = await fetch("https://www.strava.com/api/v3/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
}

export async function upsertUser(
  stravaId: number,
  firstName: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<void> {
  await prisma.user.upsert({
    where: { stravaId },
    create: { stravaId, firstName, accessToken, refreshToken, tokenExpiresAt: expiresAt },
    update: { firstName, accessToken, refreshToken, tokenExpiresAt: expiresAt },
  });
}
