import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function GET() {
  await clearSession();
  return NextResponse.redirect(new URL("/", "http://localhost:3000"));
}
