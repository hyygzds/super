import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "./Tabs";

const meta = {
  title: "React/Tabs",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[480px]">
      <Tabs defaultValue="a">
        <TabsList aria-label="示例标签">
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsPanel value="a">内容 A</TabsPanel>
        <TabsPanel value="b">内容 B</TabsPanel>
      </Tabs>
    </div>
  ),
};
