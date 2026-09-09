import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Transfer } from "./Transfer";

const ITEMS = [
  { key: "a", title: "Alpha" },
  { key: "b", title: "Beta" },
  { key: "c", title: "Gamma", disabled: true },
  { key: "d", title: "Delta" },
];

describe("Transfer (React)", () => {
  it("puts defaultTargetKeys on the right panel", () => {
    render(
      <Transfer
        dataSource={ITEMS}
        defaultTargetKeys={["b"]}
        titles={["源", "目标"]}
      />,
    );
    const source = screen.getByRole("listbox", { name: "源" });
    const target = screen.getByRole("listbox", { name: "目标" });
    expect(source).toHaveTextContent("Alpha");
    expect(source).not.toHaveTextContent("Beta");
    expect(target).toHaveTextContent("Beta");
  });

  it("moves checked source items to the right and calls onTargetKeysChange", async () => {
    const user = userEvent.setup();
    const onTargetKeysChange = vi.fn();
    render(
      <Transfer
        dataSource={ITEMS}
        defaultTargetKeys={[]}
        onTargetKeysChange={onTargetKeysChange}
        titles={["源", "目标"]}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Alpha" }));
    await user.click(screen.getByRole("button", { name: "移到右侧" }));
    expect(onTargetKeysChange).toHaveBeenCalledWith(["a"]);
    expect(screen.getByRole("listbox", { name: "目标" })).toHaveTextContent(
      "Alpha",
    );
  });

  it("does not move disabled items and keeps controlled targetKeys", async () => {
    const user = userEvent.setup();
    const onTargetKeysChange = vi.fn();
    render(
      <Transfer
        dataSource={ITEMS}
        targetKeys={[]}
        onTargetKeysChange={onTargetKeysChange}
        titles={["源", "目标"]}
      />,
    );
    const gamma = screen.getByRole("checkbox", { name: "Gamma" });
    expect(gamma).toBeDisabled();
    await user.click(gamma);
    await user.click(screen.getByRole("button", { name: "移到右侧" }));
    expect(onTargetKeysChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox", { name: "源" })).toHaveTextContent(
      "Gamma",
    );
  });

  it("moves target items back to the left", async () => {
    const user = userEvent.setup();
    const onTargetKeysChange = vi.fn();
    render(
      <Transfer
        dataSource={ITEMS}
        defaultTargetKeys={["a", "b"]}
        onTargetKeysChange={onTargetKeysChange}
        titles={["源", "目标"]}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Alpha" }));
    await user.click(screen.getByRole("button", { name: "移到左侧" }));
    expect(onTargetKeysChange).toHaveBeenCalledWith(["b"]);
    expect(screen.getByRole("listbox", { name: "源" })).toHaveTextContent(
      "Alpha",
    );
  });

  it("check-all selects enabled items in a panel", async () => {
    const user = userEvent.setup();
    render(
      <Transfer
        dataSource={ITEMS}
        defaultTargetKeys={[]}
        titles={["源", "目标"]}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "源全选" }));
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Gamma" })).not.toBeChecked();
  });
});
