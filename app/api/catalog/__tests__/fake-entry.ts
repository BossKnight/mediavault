// A stand-in for the Prisma rows the catalog routes read and write, with
// copies, for route tests that mock Prisma.

type CopyInput = { format?: string | null; edition?: string | null; seasons?: number[]; completeSeries?: boolean };

const storedCopy = (copy: CopyInput, index: number) => ({
  id: `copy-${index + 1}`,
  progressId: "entry-1",
  format: copy.format ?? null,
  edition: copy.edition ?? null,
  seasons: copy.seasons ?? [],
  completeSeries: copy.completeSeries ?? false,
  createdAt: new Date("2026-01-01"),
});

export function entryRow({
  mediaType = "MOVIE",
  copies = [],
  ...fields
}: { mediaType?: string; copies?: CopyInput[] } & Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    userId: "user-1",
    mediaItemId: "media-1",
    status: "PLAN_TO_WATCH",
    ownership: "OWNED",
    rating: null,
    reviewNotes: null,
    ownedSeasons: [],
    completeSeries: false,
    platforms: [],
    platform: null,
    hoursPlayed: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...fields,
    copies: copies.map(storedCopy),
    mediaItem: {
      id: "media-1",
      source: "TMDB",
      externalId: "1",
      mediaType,
      title: "Example",
      releaseDate: null,
      coverUrl: null,
      overview: null,
      genres: [],
      creator: null,
      isbn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

/** prisma.userMediaProgress.update over `current()`: applies fields and nested copy writes. */
export function fakeUpdate(current: () => ReturnType<typeof entryRow> | Promise<ReturnType<typeof entryRow>>) {
  return async ({ data }: { data: Record<string, unknown> & { copies?: { deleteMany?: object; create: CopyInput[] } } }) => {
    const row = await current();
    const { copies, ...fields } = data;
    const kept = copies?.deleteMany ? [] : row.copies;
    const added = (copies?.create ?? []).map((copy, index) => storedCopy(copy, kept.length + index));
    return { ...row, ...fields, copies: [...kept, ...added] };
  };
}
