import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Radio, RadioGroup } from "./Radio";

const meta = {
  title: "React/Radio",
  component: RadioGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <RadioGroup defaultValue="a" name="basic">
      <Radio value="a">Apple</Radio>
      <Radio value="b">Banana</Radio>
      <Radio value="c">Cherry</Radio>
    </RadioGroup>
  ),
};

export const Options: Story = {
  args: {
    defaultValue: "red",
    name: "color",
    options: [
      { label: "Red", value: "red" },
      { label: "Green", value: "green" },
      { label: "Blue", value: "blue", disabled: true },
    ],
  },
};

export const Vertical: Story = {
  render: () => (
    <RadioGroup defaultValue="a" name="vertical" orientation="vertical">
      <Radio value="a">Apple</Radio>
      <Radio value="b">Banana</Radio>
      <Radio value="c">Cherry</Radio>
    </RadioGroup>
  ),
};

export const Controlled: Story = {
  render: function Render() {
    const [value, setValue] = useState("a");
    return (
      <div className="flex flex-col gap-2">
        <RadioGroup value={value} name="controlled" onChange={setValue}>
          <Radio value="a">Apple</Radio>
          <Radio value="b">Banana</Radio>
          <Radio value="c">Cherry</Radio>
        </RadioGroup>
        <p className="text-sm text-slate-600">当前：{value}</p>
      </div>
    );
  },
};
