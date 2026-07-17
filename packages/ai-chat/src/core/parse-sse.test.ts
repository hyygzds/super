import { describe, expect, it } from "vitest";
import { extractDeltaFromSseChunk } from "./parse-sse";

describe("extractDeltaFromSseChunk", () => {
  it("extracts concatenated delta contents from data lines", () => {
    const chunk = [
      'data: {"choices":[{"delta":{"content":"Hel"}}]}',
      "",
      'data: {"choices":[{"delta":{"content":"lo"}}]}',
      "",
      "data: [DONE]",
      "",
    ].join("\n");
    expect(extractDeltaFromSseChunk(chunk)).toBe("Hello");
  });

  it("ignores lines without content delta", () => {
    const chunk = 'data: {"choices":[{"delta":{}}]}\n\n';
    expect(extractDeltaFromSseChunk(chunk)).toBe("");
  });

  it("skips malformed JSON lines", () => {
    const chunk = "data: not-json\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"x\"}}]}\n\n";
    expect(extractDeltaFromSseChunk(chunk)).toBe("x");
  });
});
