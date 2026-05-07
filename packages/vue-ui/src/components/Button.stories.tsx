import type { Meta, StoryObj } from "@storybook/vue3";
import Button from "./Button";

const meta = {
  title: "Vue/Button",
  component: Button,
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  render: () => <Button variant="primary">Primary</Button>,
};
