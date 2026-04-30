import { NextRequest, NextResponse } from "next/server";
import { loginToGarmin } from "@/lib/garmin";
import { setSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "E-post og passord er påkrevd" }, { status: 400 });
    }

    const { firstName } = await loginToGarmin(email, password);
    await setSession(email);

    return NextResponse.json({ success: true, firstName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Innlogging feilet";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
