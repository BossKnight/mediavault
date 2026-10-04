import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { catalogEntryInclude, toCatalogEntry } from "@/lib/catalog";
import { MAX_COPIES, cleanCopies, copiesInputSchema, replaceCopiesData } from "@/lib/copies";

const addCopiesSchema = z.object({ copies: copiesInputSchema.min(1, "Add at least one copy") });

/**
 * Adds copies to an entry the user already has: "Add another copy" when
 * adding a title that's already in the vault.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.userMediaProgress.findUnique({ where: { id }, include: catalogEntryInclude });
  if (!entry || entry.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entry.ownership !== "OWNED") {
    return NextResponse.json(
      { error: "This title is on your wishlist. Move it to your vault to add copies." },
      { status: 400 },
    );
  }

  const parsed = addCopiesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const added = cleanCopies(parsed.data.copies, entry.mediaItem.mediaType);
  if (added.length === 0) {
    return NextResponse.json({ error: "Add at least one copy" }, { status: 400 });
  }
  const current = toCatalogEntry(entry).copies;
  if (current.length + added.length > MAX_COPIES) {
    return NextResponse.json({ error: `An entry can hold at most ${MAX_COPIES} copies` }, { status: 400 });
  }

  // Stored copies stay as they are. An entry with none stored yet has its
  // older fields saved as copies first, so adding one doesn't hide them.
  const data =
    entry.copies.length > 0
      ? { copies: { create: added } }
      : replaceCopiesData([...cleanCopies(current, entry.mediaItem.mediaType), ...added]);

  const updated = await prisma.userMediaProgress.update({ where: { id }, data, include: catalogEntryInclude });
  return NextResponse.json({ entry: toCatalogEntry(updated) }, { status: 201 });
}
