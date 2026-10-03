// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddItemModal } from "@/features/catalog/add-item-modal";
import { parseAddDraft } from "@/lib/add-draft";
import type { UnifiedSearchResult } from "@/types/media";

function result(title: string, mediaType: UnifiedSearchResult["mediaType"]): UnifiedSearchResult {
  return {
    source: mediaType === "GAME" ? "RAWG" : "TMDB",
    externalId: title,
    mediaType,
    title,
    releaseDate: "2018-01-25",
    coverUrl: null,
    overview: null,
    genres: [],
    creator: null,
    isbn: null,
  };
}

// Search responses by type; a number is an HTTP error status.
let responses: Record<string, UnifiedSearchResult[] | number>;
const fetchMock = vi.fn(async (url: string) => {
  const type = new URL(url, "http://test").searchParams.get("type")!;
  const response = responses[type] ?? [];
  return typeof response === "number"
    ? new Response(JSON.stringify({ error: "nope" }), { status: response })
    : new Response(JSON.stringify({ results: response }), { status: 200 });
});
const searchedTypes = () =>
  fetchMock.mock.calls.map(([url]) => new URL(url, "http://test").searchParams.get("type"));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function search(text: string) {
  render(
    <AddItemModal open onOpenChange={() => {}} returnFocusTo={{ current: null }} onAdded={() => {}} />,
  );
  fireEvent.change(screen.getByLabelText("Search"), { target: { value: text } });
  // Past the search box's 300 ms debounce.
  await act(() => vi.advanceTimersByTimeAsync(350));
}

describe("AddItemModal search with no results in the chosen type", () => {
  it("points to the types that do have results, and switches without searching again", async () => {
    responses = { movie: [], tv: [], game: [result("Celeste", "GAME")], book: [] };
    await search("Celeste");

    expect(await screen.findByText("No movies match “Celeste”.")).toBeInTheDocument();
    const games = await screen.findByRole("button", { name: "Games (1)" });
    expect(screen.queryByRole("button", { name: /TV shows|Books/ })).not.toBeInTheDocument();
    expect(searchedTypes().sort()).toEqual(["book", "game", "movie", "tv"]);

    fireEvent.click(games);
    expect(await screen.findByRole("button", { name: /Celeste/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Game", pressed: true })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(screen.getByLabelText("Search")).toHaveFocus();
  });

  it("says so when no type has results", async () => {
    responses = { movie: [], tv: [], game: [], book: [] };
    await search("zzzz");

    expect(
      await screen.findByText("Nothing in other types either. Check the spelling, or scan the barcode."),
    ).toBeInTheDocument();
  });

  it("leaves out a type whose search failed", async () => {
    responses = { movie: [], tv: 502, game: [result("Celeste", "GAME")], book: [] };
    await search("Celeste");

    expect(await screen.findByRole("button", { name: "Games (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /TV shows/ })).not.toBeInTheDocument();
  });

  it("doesn't search other types when the chosen one has results", async () => {
    responses = { movie: [result("Arrival", "MOVIE")] };
    await search("Arrival");

    expect(await screen.findByRole("button", { name: /Arrival/ })).toBeInTheDocument();
    expect(searchedTypes()).toEqual(["movie"]);
  });
});

const readAddDraft = () => parseAddDraft(sessionStorage.getItem("mediavault:add-draft"));

describe("AddItemModal drafts", () => {
  const celeste = { ...result("Celeste", "GAME"), availablePlatforms: ["Switch", "PC"] };

  function renderWithDraft() {
    render(
      <AddItemModal
        open
        onOpenChange={() => {}}
        returnFocusTo={{ current: null }}
        onAdded={() => {}}
        draft={{ result: celeste, platforms: ["PC"] }}
      />,
    );
  }

  beforeEach(() => sessionStorage.clear());

  it("opens a draft on the confirm step, with its platforms, and keeps it while unsaved", () => {
    renderWithDraft();

    expect(screen.getByText("Celeste")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "PC" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Switch" }));
    expect(readAddDraft()?.platforms).toEqual(["PC", "Switch"]);
  });

  it("drops the draft on Back", () => {
    renderWithDraft();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(readAddDraft()).toBeNull();
  });

  it("drops the draft once saved, and keeps it when the session has expired", async () => {
    let status = 401;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        status === 401
          ? new Response(JSON.stringify({ error: "Unauthorized" }), { status })
          : new Response(JSON.stringify({
              entry: { id: "e1", status: "PLAN_TO_WATCH", ownership: "OWNED", platforms: ["PC"], mediaItem: celeste },
            }), {
              status,
            }),
      ),
    );
    renderWithDraft();

    fireEvent.click(screen.getByRole("button", { name: "Add to vault" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("session expired");
    expect(readAddDraft()?.result.title).toBe("Celeste");

    status = 201;
    fireEvent.click(screen.getByRole("button", { name: "Add to vault" }));
    expect(await screen.findByRole("button", { name: "Add another" })).toBeInTheDocument();
    expect(readAddDraft()).toBeNull();
  });
});
