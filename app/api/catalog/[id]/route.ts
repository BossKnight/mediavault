import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { catalogEntryInclude, toCatalogEntry } from "@/lib/catalog";

const updateCatalogSchema = z.object({
  status: z
    .enum(["PLAN_TO_WATCH", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "DROPPED"])
    .optional(),
  ownership: z.enum(["OWNED", "WISHLIST"]).optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  reviewNotes: z.string().max(4000).nullable().optional(),
  ownedSeasons: z.array(z.number().int().min(1)).optional(),
  completeSeries: z.boolean().optional(),
  platform: z.string().max(60).nullable().optional(),
  hoursPlayed: z.number().min(0).nullable().optional(),
});

async function loadOwnedEntry(id: string, userId: string) {
  const entry = await prisma.userMediaProgress.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) return null;
  return entry;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await loadOwnedEntry(id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCatalogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Stamp start/completion times the first time a status implies them, so
  // the user isn't required to set these manually.
  const timestamps: { startedAt?: Date; completedAt?: Date } = {};
  if (data.status === "IN_PROGRESS" && !existing.startedAt) {
    timestamps.startedAt = new Date();
  }
  if (data.status === "COMPLETED" && !existing.completedAt) {
    timestamps.completedAt = new Date();
  }

  const updated = await prisma.userMediaProgress.update({
    where: { id },
    data: { ...data, ...timestamps },
    include: catalogEntryInclude,
  });

  return NextResponse.json({ entry: toCatalogEntry(updated) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await loadOwnedEntry(id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userMediaProgress.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
