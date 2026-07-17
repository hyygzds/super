import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UseChatReturn } from "../useChat";
import { Composer } from "./Composer";

function createChat(overrides: Partial<UseChatReturn> = {}): UseChatReturn {
  return {
    messages: [],
    input: "",
    setInput: vi.fn(),
    status: "idle",
    error: undefined,
    send: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    retry: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("Composer", () => {
  it("shows 发送 as the main action label when idle", () => {
    render(<Composer chat={createChat()} />);

    expect(screen.getByRole("button", { name: "发送" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "停止" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重试" })).not.toBeInTheDocument();
  });

  it("shows 停止 as the main action label while streaming and calls stop on click", () => {
    const chat = createChat({ status: "streaming" });
    render(<Composer chat={chat} />);

    const stopButton = screen.getByRole("button", { name: "停止" });
    fireEvent.click(stopButton);

    expect(chat.stop).toHaveBeenCalledTimes(1);
  });

  it("shows a 重试 button and an alert with the error message when errored", () => {
    const chat = createChat({ status: "error", error: new Error("boom") });
    render(<Composer chat={chat} />);

    expect(screen.getByRole("alert")).toHaveTextContent("boom");

    const retryButton = screen.getByRole("button", { name: "重试" });
    fireEvent.click(retryButton);

    expect(chat.retry).toHaveBeenCalledTimes(1);
  });

  it("calls send with current input on submit when idle", () => {
    const chat = createChat({ input: "hello" });
    render(<Composer chat={chat} />);

    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(chat.send).toHaveBeenCalledTimes(1);
  });

  it("updates input via setInput on typing", () => {
    const chat = createChat();
    render(<Composer chat={chat} />);

    fireEvent.change(screen.getByPlaceholderText("输入消息…"), {
      target: { value: "hi" },
    });

    expect(chat.setInput).toHaveBeenCalledWith("hi");
  });
});
