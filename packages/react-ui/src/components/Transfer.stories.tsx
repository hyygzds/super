import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Transfer } from "./Transfer";

const dataSource = [
  { key: "a", title: "Alpha" },
  { key: "b", title: "Beta" },
  { key: "c", title: "Gamma", disabled: true },
  { key: "d", title: "Delta" },
  { key: "e", title: "Epsilon" },
];

const meta = {
  title: "React/Transfer",
  component: Transfer,
  tags: ["autodocs"],
} satisfies Meta<typeof Transfer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    dataSource,
    defaultTargetKeys: ["b"],
  },
};

export const Controlled: Story = {
  args: { dataSource },
  render: function Render() {
    const [targetKeys, setTargetKeys] = useState<string[]>(["b", "d"]);
    return (
      <div className="space-y-2">
        <Transfer
          dataSource={dataSource}
          targetKeys={targetKeys}
          onTargetKeysChange={setTargetKeys}
        />
        <pre className="rounded bg-slate-100 p-2 text-xs">
          {JSON.stringify(targetKeys)}
        </pre>
      </div>
    );
  },
};

export const DisabledItems: Story = {
  args: {
    dataSource,
    defaultTargetKeys: ["c"],
  },
};
