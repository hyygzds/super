import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "./Tooltip";

describe("Tooltip (React)", () => {
  it("shows content on hover and hides on leave", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="完整内容">
        <span>截断文本</span>
      </Tooltip>,
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.hover(screen.getByText("截断文本"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("完整内容");

    await user.unhover(screen.getByText("截断文本"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("respects controlled open and reports onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Tooltip content="提示" open={false} onOpenChange={onOpenChange}>
        <span>触发</span>
      </Tooltip>,
    );

    await user.hover(screen.getByText("触发"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("skips opening when onlyIfOverflow and the trigger is not overflowing", async () => {
    const user = userEvent.setup();
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return 40;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 80;
      },
    });
    render(
      <Tooltip content="完整内容" onlyIfOverflow>
        <span>短文本</span>
      </Tooltip>,
    );

    await user.hover(screen.getByText("短文本"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("closes on ancestor scroll so a fixed popup does not linger", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="完整内容">
        <span>截断文本</span>
      </Tooltip>,
    );

    await user.hover(screen.getByText("截断文本"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.scroll(window);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens onlyIfOverflow when a nested truncated child overflows", async () => {
    const user = userEvent.setup();
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return (this as HTMLElement).dataset.overflow === "true" ? 240 : 80;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 80;
      },
    });
    render(
      <Tooltip content="完整内容" onlyIfOverflow>
        <span data-overflow="true">很长的嵌套文本</span>
      </Tooltip>,
    );

    await user.hover(screen.getByText("很长的嵌套文本"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("完整内容");
  });

  it("does not force block or truncate layout on the trigger", () => {
    render(
      <Tooltip content="提示">
        <button type="button">按钮</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "按钮" }).parentElement;
    expect(trigger?.className).not.toMatch(/\btruncate\b/);
    expect(trigger?.className).not.toMatch(/\bblock\b/);
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="提示" disabled>
        <span>触发</span>
      </Tooltip>,
    );

    await user.hover(screen.getByText("触发"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
