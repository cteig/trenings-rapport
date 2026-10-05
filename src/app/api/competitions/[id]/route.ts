import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedCompetition(email: string, id: number) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "User not found" as const, status: 404 };

  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition || competition.userId !== user.id) {
    return { error: "Competition not found" as const, status: 404 };
  }
  return { competition };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const owned = await getOwnedCompetition(email, Number(id));
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const body = await request.json();
  const data: Record<string, string | null> = {};
  for (const field of ["name", "date", "priority", "discipline", "goal", "result", "notes", "garminActivityId"] as const) {
    if (field in body) {
      const value = typeof body[field] === "string" ? body[field].trim() : body[field];
      // name/date/priority skal ikke kunne nulles ut
      if ((field === "name" || field === "date" || field === "priority") && !value) continue;
      data[field] = value || null;
    }
  }

  const updated = await prisma.competition.update({
    where: { id: Number(id) },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const owned = await getOwnedCompetition(email, Number(id));
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  await prisma.competition.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}