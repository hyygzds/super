import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Checkbox, CheckboxGroup } from "./Checkbox";

const meta = {
  title: "React/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: function Render() {
    const [checked, setChecked] = useState(false);
    return (
      <Checkbox checked={checked} onCheckedChange={setChecked}>
        同意条款
      </Checkbox>
    );
  },
};

export const Indeterminate: Story = {
  render: function Render() {
    const [checked, setChecked] = useState(false);
    const [indeterminate, setIndeterminate] = useState(true);
    return (
      <Checkbox
        checked={checked}
        indeterminate={indeterminate}
        onCheckedChange={(next) => {
          setChecked(next);
          setIndeterminate(false);
        }}
      >
        全选
      </Checkbox>
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true, children: "不可用" },
};

export const GroupVertical: Story = {
  render: function Render() {
    const [value, setValue] = useState<string[]>(["apple"]);
    return (
      <CheckboxGroup
        value={value}
        onValueChange={setValue}
        aria-label="水果"
        orientation="vertical"
      >
        <Checkbox value="apple">苹果</Checkbox>
        <Checkbox value="banana">香蕉</Checkbox>
        <Checkbox value="orange">橙子</Checkbox>
      </CheckboxGroup>
    );
  },
};

export const GroupHorizontal: Story = {
  render: function Render() {
    const [value, setValue] = useState<string[]>([]);
    return (
      <CheckboxGroup
        value={value}
        onValueChange={setValue}
        aria-label="标签"
        orientation="horizontal"
      >
        <Checkbox value="a">A</Checkbox>
        <Checkbox value="b">B</Checkbox>
        <Checkbox value="c">C</Checkbox>
      </CheckboxGroup>
    );
  },
};
