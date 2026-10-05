import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const competitions = await prisma.competition.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(competitions);
}

export async function POST(request: NextRequest) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";

  if (!name || !date) {
    return NextResponse.json({ error: "Navn og dato er påkrevd" }, { status: 400 });
  }

  const competition = await prisma.competition.create({
    data: {
      userId: user.id,
      name,
      date,
      priority: typeof body.priority === "string" ? body.priority : "A",
      discipline: body.discipline?.trim() || null,
      goal: body.goal?.trim() || null,
      result: body.result?.trim() || null,
      notes: body.notes?.trim() || null,
      garminActivityId: body.garminActivityId?.trim() || null,
    },
  });

  return NextResponse.json(competition, { status: 201 });
}