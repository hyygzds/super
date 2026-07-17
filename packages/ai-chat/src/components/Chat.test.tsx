import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMessageIdSeq } from "../core/id";
import type {
  ChatTransport,
  ChatTransportHandlers,
  ChatTransportRequest,
} from "../core/types";
import { Chat } from "./Chat";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";

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

describe("Chat", () => {
  it("sends a typed message and renders the streamed assistant reply", async () => {
    const { transport, calls } = createControllableTransport();
    const user = userEvent.setup();

    render(
      <Chat apiUrl="https://api.example.com/chat" transport={transport}>
        <MessageList />
        <Composer />
      </Chat>,
    );

    await user.type(screen.getByPlaceholderText("输入消息…"), "hi there");
    await user.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(screen.getByText("hi there")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "停止" })).toBeInTheDocument();

    act(() => {
      calls[0]?.handlers.onToken("Hello");
      calls[0]?.handlers.onToken(" world");
    });

    expect(screen.getByText("Hello world")).toBeInTheDocument();

    act(() => {
      calls[0]?.handlers.onDone();
      calls[0]?.resolve();
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "发送" })).toBeInTheDocument(),
    );
  });

  it("shows retry after an error and successfully re-sends", async () => {
    const { transport, calls } = createControllableTransport();
    const user = userEvent.setup();

    render(
      <Chat apiUrl="https://api.example.com/chat" transport={transport}>
        <MessageList />
        <Composer />
      </Chat>,
    );

    await user.type(screen.getByPlaceholderText("输入消息…"), "hi");
    await user.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(calls).toHaveLength(1));

    act(() => {
      calls[0]?.handlers.onError(new Error("network down"));
      calls[0]?.resolve();
    });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("network down"));

    await user.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => expect(calls).toHaveLength(2));

    act(() => {
      calls[1]?.handlers.onToken("recovered");
      calls[1]?.handlers.onDone();
      calls[1]?.resolve();
    });

    expect(screen.getByText("recovered")).toBeInTheDocument();
  });
});
