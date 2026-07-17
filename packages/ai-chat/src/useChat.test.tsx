import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMessageIdSeq } from "./core/id";
import type {
  ChatTransport,
  ChatTransportHandlers,
  ChatTransportRequest,
} from "./core/types";
import { useChat } from "./useChat";

type ControllableCall = {
  request: ChatTransportRequest;
  handlers: ChatTransportHandlers;
  resolve: () => void;
};

function createControllableTransport() {
  const calls: ControllableCall[] = [];
  const stream = vi.fn(
    (request: ChatTransportRequest, handlers: ChatTransportHandlers) =>
      new Promise<void>((resolve) => {
        calls.push({ request, handlers, resolve });
      }),
  );
  const transport: ChatTransport = { stream };
  return { transport, calls };
}

beforeEach(() => {
  resetMessageIdSeq();
});

describe("useChat", () => {
  it("send appends user + streaming assistant, then streams tokens to done/idle", async () => {
    const { transport, calls } = createControllableTransport();
    const { result } = renderHook(() =>
      useChat({ apiUrl: "https://api.example.com/chat", transport }),
    );

    act(() => {
      result.current.setInput("hi");
    });

    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.send();
    });

    await waitFor(() => expect(calls).toHaveLength(1));

    expect(result.current.input).toBe("");
    expect(result.current.status).toBe("streaming");
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      role: "user",
      content: "hi",
    });
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "",
      status: "streaming",
    });
    expect(calls[0]?.request.messages).toEqual([{ role: "user", content: "hi" }]);

    act(() => {
      calls[0]?.handlers.onToken("Hel");
      calls[0]?.handlers.onToken("lo");
    });

    expect(result.current.messages[1]).toMatchObject({ content: "Hello" });

    act(() => {
      calls[0]?.handlers.onDone();
      calls[0]?.resolve();
    });
    await sendPromise;

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeUndefined();
    expect(result.current.messages[1]).toMatchObject({
      content: "Hello",
      status: "done",
    });
  });

  it("ignores send while already streaming", async () => {
    const { transport, calls } = createControllableTransport();
    const { result } = renderHook(() =>
      useChat({ apiUrl: "https://api.example.com/chat", transport }),
    );

    act(() => {
      void result.current.send("first");
    });
    await waitFor(() => expect(calls).toHaveLength(1));

    await act(async () => {
      await result.current.send("second");
    });

    expect(calls).toHaveLength(1);
    expect(result.current.messages).toHaveLength(2);

    act(() => {
      calls[0]?.handlers.onDone();
      calls[0]?.resolve();
    });
  });

  it("stop aborts the request, keeps partial text, and marks assistant done", async () => {
    const { transport, calls } = createControllableTransport();
    const { result } = renderHook(() =>
      useChat({ apiUrl: "https://api.example.com/chat", transport }),
    );

    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.send("hi");
    });
    await waitFor(() => expect(calls).toHaveLength(1));

    act(() => {
      calls[0]?.handlers.onToken("partial");
    });
    expect(result.current.messages[1]).toMatchObject({ content: "partial" });

    act(() => {
      result.current.stop();
    });

    expect(calls[0]?.request.signal?.aborted).toBe(true);
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeUndefined();
    expect(result.current.messages[1]).toMatchObject({
      content: "partial",
      status: "done",
    });

    act(() => {
      calls[0]?.resolve();
    });
    await sendPromise;
  });

  it("onError sets error status; retry removes failed assistant and re-requests", async () => {
    const { transport, calls } = createControllableTransport();
    const { result } = renderHook(() =>
      useChat({ apiUrl: "https://api.example.com/chat", transport }),
    );

    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.send("hi");
    });
    await waitFor(() => expect(calls).toHaveLength(1));

    act(() => {
      calls[0]?.handlers.onError(new Error("boom"));
      calls[0]?.resolve();
    });
    await sendPromise;

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      status: "error",
      error: "boom",
    });

    let retryPromise!: Promise<void>;
    act(() => {
      retryPromise = result.current.retry();
    });
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      content: "",
      status: "streaming",
    });
    expect(calls[1]?.request.messages).toEqual([{ role: "user", content: "hi" }]);

    act(() => {
      calls[1]?.handlers.onToken("ok now");
      calls[1]?.handlers.onDone();
      calls[1]?.resolve();
    });
    await retryPromise;

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeUndefined();
    expect(result.current.messages[1]).toMatchObject({
      content: "ok now",
      status: "done",
    });
  });

  it("reload after success removes last assistant and regenerates", async () => {
    const { transport, calls } = createControllableTransport();
    const { result } = renderHook(() =>
      useChat({ apiUrl: "https://api.example.com/chat", transport }),
    );

    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.send("hi");
    });
    await waitFor(() => expect(calls).toHaveLength(1));

    act(() => {
      calls[0]?.handlers.onToken("first answer");
      calls[0]?.handlers.onDone();
      calls[0]?.resolve();
    });
    await sendPromise;

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      content: "first answer",
      status: "done",
    });

    let reloadPromise!: Promise<void>;
    act(() => {
      reloadPromise = result.current.reload();
    });
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({ role: "user", content: "hi" });
    expect(result.current.messages[1]).toMatchObject({
      content: "",
      status: "streaming",
    });
    expect(calls[1]?.request.messages).toEqual([{ role: "user", content: "hi" }]);

    act(() => {
      calls[1]?.handlers.onToken("second answer");
      calls[1]?.handlers.onDone();
      calls[1]?.resolve();
    });
    await reloadPromise;

    expect(result.current.messages[1]).toMatchObject({
      content: "second answer",
      status: "done",
    });
  });
});
