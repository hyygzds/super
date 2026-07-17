import { afterEach, describe, expect, it, vi } from "vitest";
import { openaiTransport } from "./openai-transport";
import type { ChatTransportRequest } from "./types";

function sseLine(content: string): string {
  return `data: {"choices":[{"delta":{"content":${JSON.stringify(content)}}}]}\n\n`;
}

function mockFetchStream(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;
      } else {
        controller.close();
      }
    },
  });
  return vi.fn().mockResolvedValue(
    new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
  );
}

function baseRequest(overrides: Partial<ChatTransportRequest> = {}): ChatTransportRequest {
  return {
    apiUrl: "https://api.example.com/v1/chat/completions",
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "hi" }],
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openaiTransport", () => {
  it("streams tokens then calls onDone", async () => {
    const fetchMock = mockFetchStream([sseLine("Hel"), sseLine("lo"), "data: [DONE]\n\n"]);
    vi.stubGlobal("fetch", fetchMock);

    const tokens: string[] = [];
    let done = false;

    await openaiTransport.stream(baseRequest(), {
      onToken: (text) => tokens.push(text),
      onDone: () => {
        done = true;
      },
      onError: () => {
        throw new Error("unexpected onError");
      },
    });

    expect(tokens).toEqual(["Hel", "lo"]);
    expect(done).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      stream: true,
    });
  });

  it("calls onError on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("fail", { status: 500 })),
    );

    const errors: Error[] = [];

    await openaiTransport.stream(baseRequest(), {
      onToken: () => {
        throw new Error("unexpected onToken");
      },
      onDone: () => {
        throw new Error("unexpected onDone");
      },
      onError: (err) => errors.push(err),
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe("Chat request failed: 500");
  });

  it("sends Authorization when apiKey set", async () => {
    const fetchMock = mockFetchStream([sseLine("ok")]);
    vi.stubGlobal("fetch", fetchMock);

    await openaiTransport.stream(baseRequest({ apiKey: "sk-test" }), {
      onToken: () => {},
      onDone: () => {},
      onError: () => {
        throw new Error("unexpected onError");
      },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
  });

  it("does not call onError when aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
    );

    const onError = vi.fn();

    await openaiTransport.stream(baseRequest({ signal: controller.signal }), {
      onToken: () => {},
      onDone: () => {},
      onError,
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it("reassembles SSE lines split across fetch chunks", async () => {
    const full = sseLine("Hi");
    const mid = Math.floor(full.length / 2);
    const fetchMock = mockFetchStream([full.slice(0, mid), full.slice(mid)]);
    vi.stubGlobal("fetch", fetchMock);

    const tokens: string[] = [];
    await openaiTransport.stream(baseRequest(), {
      onToken: (text) => tokens.push(text),
      onDone: () => {},
      onError: () => {
        throw new Error("unexpected onError");
      },
    });

    expect(tokens.join("")).toBe("Hi");
  });
});
