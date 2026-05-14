import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const { comment } = await request.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const activity = await prisma.activity.findUnique({
    where: { userId_garminId: { userId: user.id, garminId: id } },
  });
  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const updated = await prisma.activity.update({
    where: { userId_garminId: { userId: user.id, garminId: id } },
    data: { comment: comment ?? null },
  });

  return NextResponse.json({ comment: updated.comment });
}
