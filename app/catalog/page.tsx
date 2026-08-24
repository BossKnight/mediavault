import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { catalogEntryInclude, toCatalogEntry } from "@/lib/catalog";
import { CatalogView } from "@/features/catalog/catalog-view";
import { SignOutButton } from "@/features/auth/sign-out-button";

export default async function CatalogPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const rows = await prisma.userMediaProgress.findMany({
    where: { userId },
    include: catalogEntryInclude,
    orderBy: { updatedAt: "desc" },
  });
  const entries = rows.map(toCatalogEntry);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Your catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Movies, TV shows, and games you own or plan to get to.
          </p>
        </div>
        <SignOutButton />
      </div>

      <CatalogView initialEntries={entries} />
    </main>
  );
}
