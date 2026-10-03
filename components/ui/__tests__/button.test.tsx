// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders plain children when it has no state", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).not.toHaveAttribute("data-state");
    expect(button.querySelector(".btn-spinner")).toBeNull();
  });

  it("keeps focus and its name while loading, and ignores clicks", () => {
    const onClick = vi.fn();
    render(
      <Button state="loading" onClick={onClick}>
        Add to vault
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Add to vault" });
    button.focus();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("data-state", "loading");
  });

  it("ignores clicks while showing success, and accepts them when idle or after an error", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button state="success" onClick={onClick}>
        Add to vault
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();

    for (const state of ["idle", "error"] as const) {
      rerender(
        <Button state={state} onClick={onClick}>
          Add to vault
        </Button>,
      );
      fireEvent.click(screen.getByRole("button"));
    }
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("ignores clicks when aria-disabled, without leaving the tab order", () => {
    const onClick = vi.fn();
    render(
      <Button aria-disabled onClick={onClick}>
        Back
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Back" })).not.toBeDisabled();
  });
});
