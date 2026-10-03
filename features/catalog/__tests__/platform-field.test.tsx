// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { PlatformField } from "@/features/catalog/platform-field";

let reported: string[] = [];

function Game({ initial = [], available }: { initial?: string[]; available?: string[] }) {
  const [value, setValue] = useState(initial);
  return (
    <PlatformField
      mediaType="GAME"
      value={value}
      availablePlatforms={available}
      onChange={(next) => {
        reported = next;
        setValue(next);
      }}
    />
  );
}

const box = (name: string) => screen.getByRole("checkbox", { name }) as HTMLInputElement;
const other = () => screen.getByRole("textbox", { name: "Other platforms" }) as HTMLInputElement;

describe("game platforms", () => {
  afterEach(cleanup);

  it("offers the game's own platforms, falling back to the common ones", () => {
    const { unmount } = render(<Game available={["PS2", "GameCube"]} />);
    expect(screen.getAllByRole("checkbox").map((el) => el.parentElement!.textContent)).toEqual([
      "PS2",
      "GameCube",
    ]);
    unmount();

    render(<Game />);
    expect(box("PS5")).toBeTruthy();
    expect(box("PC")).toBeTruthy();
  });

  it("keeps the entry's existing platforms as checked choices, under their short names", () => {
    render(<Game initial={["PlayStation 2", "Atari Lynx"]} available={["PS2", "PC"]} />);
    expect(box("PS2").checked).toBe(true);
    expect(box("PC").checked).toBe(false);
    expect(box("Atari Lynx").checked).toBe(true);
    expect(other().value).toBe("");
  });

  it("merges checked boxes and typed platforms", () => {
    render(<Game available={["PS2", "PC"]} />);
    fireEvent.click(box("PC"));
    fireEvent.change(other(), { target: { value: "Xbox, playstation 2" } });
    expect(reported).toEqual(["PC", "Xbox", "PS2"]);
    // A typed platform that's also a choice checks its box...
    expect(box("PS2").checked).toBe(true);
    // ...and unchecking the box takes it out of the text.
    fireEvent.click(box("PS2"));
    expect(other().value).toBe("Xbox");
    expect(reported).toEqual(["PC", "Xbox"]);
  });
});
