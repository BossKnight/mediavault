import { describe, expect, it } from "vitest";
import { SESSION_EXPIRED_MESSAGE, apiErrorMessage } from "@/lib/session-expired";

const response = (status: number) => new Response(null, { status });

describe("apiErrorMessage", () => {
  it("replaces the server's 401 text with the session-expired message", () => {
    expect(apiErrorMessage(response(401), { error: "Unauthorized" }, "Couldn't save.")).toBe(
      SESSION_EXPIRED_MESSAGE,
    );
  });

  it("uses the server's error for other failures", () => {
    expect(apiErrorMessage(response(409), { error: "Already in your vault." }, "Couldn't save.")).toBe(
      "Already in your vault.",
    );
  });

  it("falls back when the body has no usable error", () => {
    for (const data of [null, {}, { error: "" }, { error: 42 }]) {
      expect(apiErrorMessage(response(500), data, "Couldn't save.")).toBe("Couldn't save.");
    }
  });
});
