import { describe, expect, it } from "vitest";
import {
  createClientOpts,
  safeErrorMessage,
  toErrorContent,
  toJsonContent,
  truncateText,
} from "./index.js";

describe("common helpers", () => {
  it("creates client options only when an endpoint is provided", () => {
    expect(createClientOpts()).toBeUndefined();
    expect(createClientOpts("https://atbash.example")).toEqual({
      endpoint: "https://atbash.example",
    });
  });

  it("formats json and error content", () => {
    expect(toJsonContent({ ok: true })).toEqual({
      content: [{ type: "text", text: JSON.stringify({ ok: true }, null, 2) }],
    });

    expect(toErrorContent(new Error("boom"))).toEqual({
      content: [{ type: "text", text: "Error: boom" }],
      isError: true,
    });
    expect(safeErrorMessage("oops")).toBe("oops");
  });

  it("truncates text at the requested limit", () => {
    expect(truncateText("short", 10)).toBe("short");
    expect(truncateText("abcdefghijk", 8)).toBe("abcde...");
  });
});
