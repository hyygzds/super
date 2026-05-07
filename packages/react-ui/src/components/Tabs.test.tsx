import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "./Tabs";

describe("Tabs (React)", () => {
  it("activates first enabled tab by default and switches on click", async () => {
    const user = userEvent.setup();
    render(
      <Tabs>
        <TabsList aria-label="测试标签">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsPanel value="a">面板 A</TabsPanel>
        <TabsPanel value="b">面板 B</TabsPanel>
      </Tabs>,
    );

    const tabA = screen.getByRole("tab", { name: "A" });
    const tabB = screen.getByRole("tab", { name: "B" });
    expect(tabA).toHaveAttribute("aria-selected", "true");
    expect(tabB).toHaveAttribute("aria-selected", "false");

    let panelA = screen.getByRole("tabpanel", { name: "A" });
    let panelB = screen.getByRole("tabpanel", { name: "B" });
    expect(panelA).not.toHaveAttribute("hidden");
    expect(panelB).toHaveAttribute("hidden");

    await user.click(tabB);
    expect(tabB).toHaveAttribute("aria-selected", "true");
    panelA = screen.getByRole("tabpanel", { name: "A" });
    panelB = screen.getByRole("tabpanel", { name: "B" });
    expect(panelA).toHaveAttribute("hidden");
    expect(panelB).not.toHaveAttribute("hidden");
  });
});
