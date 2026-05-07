import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Select } from "./Select";

const meta = {
  title: "React/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => {
    const [v, setV] = useState<string | undefined>();
    return (
      <div className="w-72">
        <Select
          options={[
            { value: "a", label: "选项 A" },
            { value: "b", label: "选项 B" },
          ]}
          value={v}
          onChange={setV}
          placeholder="请选择"
        />
      </div>
    );
  },
};
