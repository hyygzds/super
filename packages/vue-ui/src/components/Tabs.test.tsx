import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "./Tabs";

describe("Tabs (Vue)", () => {
  it("activates first tab and switches on click", async () => {
    const wrapper = mount({
      components: { Tabs, TabsList, TabsTrigger, TabsPanel },
      template: `
        <Tabs>
          <TabsList aria-label="测试">
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsPanel value="a">面板 A</TabsPanel>
          <TabsPanel value="b">面板 B</TabsPanel>
        </Tabs>
      `,
    });
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0].attributes("aria-selected")).toBe("true");
    await tabs[1].trigger("click");
    expect(tabs[1].attributes("aria-selected")).toBe("true");
  });
});
