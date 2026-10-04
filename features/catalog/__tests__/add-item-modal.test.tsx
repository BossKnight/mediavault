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

// jsdom has no AnimationEvent, so React listens for the prefixed name.
function shakeEnds(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new Event("webkitAnimationEnd", { bubbles: true }));
    element.dispatchEvent(new Event("animationend", { bubbles: true }));
  });
}

describe("AddItemModal save button", () => {
  const celeste = result("Celeste", "GAME");
  const entry = { id: "e1", status: "PLAN_TO_WATCH", ownership: "OWNED", platforms: [], mediaItem: celeste };

  function renderConfirm(respond: () => Response | Promise<Response>) {
    vi.stubGlobal("fetch", vi.fn(async () => respond()));
    render(
      <AddItemModal
        open
        onOpenChange={() => {}}
        returnFocusTo={{ current: null }}
        onAdded={() => {}}
        draft={{ result: celeste, platforms: [] }}
      />,
    );
    return screen.getByRole("button", { name: "Add to vault" });
  }

  beforeEach(() => sessionStorage.clear());

  it("shows loading, then a check, then moves on to the confirmation", async () => {
    let finish!: (response: Response) => void;
    const save = renderConfirm(() => new Promise((resolve) => (finish = resolve)));
    save.focus();

    fireEvent.click(save);
    expect(save).toHaveAttribute("data-state", "loading");
    expect(save).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Saving “Celeste”...");
    // A second click while saving doesn't post again.
    fireEvent.click(save);
    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => finish(new Response(JSON.stringify({ entry }), { status: 201 })));
    expect(save).toHaveAttribute("data-state", "success");
    expect(screen.getByRole("status")).toHaveTextContent("Added “Celeste” to your vault.");
    expect(screen.queryByRole("button", { name: "Add another" })).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(320));
    expect(screen.getByRole("button", { name: "Add another" })).toBeInTheDocument();
  });

  it("shakes for rejected input, but not for a duplicate", async () => {
    let status = 400;
    const save = renderConfirm(() => new Response(JSON.stringify({ error: "Too many platforms" }), { status }));

    fireEvent.click(save);
    await screen.findByRole("alert");
    expect(save).toHaveAttribute("data-state", "error");
    shakeEnds(save);
    expect(save).toHaveAttribute("data-state", "idle");

    status = 409;
    fireEvent.click(save);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(save).toHaveAttribute("data-state", "idle");
  });
});

describe("AddItemModal repeat adds", () => {
  const ttyd2004 = { ...result("Paper Mario: The Thousand-Year Door", "GAME"), externalId: "1", releaseDate: "2004-07-22", availablePlatforms: ["GameCube"] };
  const ttyd2024 = { ...result("Paper Mario: The Thousand-Year Door", "GAME"), externalId: "2", releaseDate: "2024-05-23", availablePlatforms: ["Switch"] };

  function renderGames() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({ entry: { id: body.externalId, status: "PLAN_TO_WATCH", ownership: body.ownership, platforms: body.platforms, mediaItem: body } }),
            { status: 201 },
          );
        }
        const type = new URL(url, "http://test").searchParams.get("type");
        return new Response(JSON.stringify({ results: type === "game" ? [ttyd2004, ttyd2024] : [] }));
      }),
    );
    const view = render(
      <AddItemModal open onOpenChange={() => {}} returnFocusTo={{ current: null }} onAdded={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Game" }));
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "Paper Mario" } });
    return view;
  }

  beforeEach(() => sessionStorage.clear());

  it("tells same-named games apart by year and platform", async () => {
    renderGames();
    await act(() => vi.advanceTimersByTimeAsync(350));

    expect(await screen.findByRole("button", { name: /2004 · GameCube/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2024 · Switch/ })).toBeInTheDocument();
  });

  it("keeps the search after Add another, selected, and marks what was added", async () => {
    renderGames();
    await act(() => vi.advanceTimersByTimeAsync(350));
    fireEvent.click(await screen.findByRole("button", { name: /2004 · GameCube/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "GameCube" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to vault" }));
    await act(() => vi.advanceTimersByTimeAsync(400));

    fireEvent.click(screen.getByRole("button", { name: "Add another" }));
    const input = screen.getByLabelText("Search") as HTMLInputElement;
    expect(input.value).toBe("Paper Mario");
    expect(input).toHaveFocus();
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, "Paper Mario".length]);
    // The kept results are back at once, without searching again.
    expect(screen.getByRole("button", { name: /2004 · GameCube.*In your vault/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2024 · Switch/ })).not.toHaveTextContent("In your vault");
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => !init?.method).length).toBe(1);
  });
});
