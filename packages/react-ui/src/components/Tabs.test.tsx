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

    const panelForText = (text: string) =>
      screen.getByText(text).closest('[role="tabpanel"]') as HTMLElement;

    let panelA = panelForText("面板 A");
    let panelB = panelForText("面板 B");
    expect(panelA).not.toHaveAttribute("hidden");
    expect(panelB).toHaveAttribute("hidden");

    await user.click(tabB);
    expect(tabB).toHaveAttribute("aria-selected", "true");
    panelA = panelForText("面板 A");
    panelB = panelForText("面板 B");
    expect(panelA).toHaveAttribute("hidden");
    expect(panelB).not.toHaveAttribute("hidden");
  });

  it("moves selection with ArrowRight and skips disabled", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b" disabled>
            B
          </TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsPanel value="a">PA</TabsPanel>
        <TabsPanel value="b">PB</TabsPanel>
        <TabsPanel value="c">PC</TabsPanel>
      </Tabs>,
    );
    const tabA = screen.getByRole("tab", { name: "A" });
    tabA.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "C" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
