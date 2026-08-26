const UPCITEMDB_TRIAL_URL = "https://api.upcitemdb.com/prod/trial/lookup";

class UpcLookupError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "UpcLookupError";
  }
}

/**
 * Looks up a UPC/EAN barcode against UPCitemdb's free trial endpoint and
 * returns the matched product's name — a movie, TV boxset, or game's UPC
 * doesn't encode a title directly, so this name is what gets fed into the
 * existing title search to find the actual catalog match. Returns null
 * when nothing matches.
 *
 * The trial tier needs no API key (it's rate-limited by IP to 100 lookups
 * a day). Swap in a paid key and /prod/v1/lookup if that limit becomes a
 * real problem.
 */
export async function lookupUpc(code: string): Promise<string | null> {
  const url = new URL(UPCITEMDB_TRIAL_URL);
  url.searchParams.set("upc", code);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new UpcLookupError(`UPC lookup failed with status ${response.status}`, response.status);
  }

  const data = (await response.json()) as { items?: { title?: string }[] };
  return data.items?.[0]?.title?.trim() || null;
}
