import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { Form, FormItem } from "./Form";

const inputClass =
  "w-full rounded border border-slate-300 px-2 py-1 text-sm";

const meta = {
  title: "Vue/Form",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => {
    const submitted = ref<string | null>(null);
    return () => (
      <div class="max-w-md">
        <Form
          initialValues={{ email: "" }}
          onFinish={(values) => {
            submitted.value = JSON.stringify(values, null, 2);
            alert(JSON.stringify(values));
          }}
        >
          <FormItem
            name="email"
            label="邮箱"
            rules={[{ required: true, message: "请输入邮箱" }]}
          >
            <input
              class={inputClass}
              type="email"
              placeholder="you@example.com"
            />
          </FormItem>
          <button
            type="submit"
            class="rounded bg-slate-800 px-4 py-2 text-sm text-white"
          >
            提交
          </button>
        </Form>
        {submitted.value ? (
          <pre class="mt-4 rounded bg-slate-100 p-3 text-xs">{submitted.value}</pre>
        ) : null}
      </div>
    );
  },
};

export const Horizontal: Story = {
  render: () => {
    const submitted = ref<string | null>(null);
    return () => (
      <div class="max-w-lg">
        <Form
          layout="horizontal"
          labelWidth={80}
          initialValues={{ name: "", email: "" }}
          onFinish={(values) => {
            submitted.value = JSON.stringify(values, null, 2);
          }}
        >
          <FormItem
            name="name"
            label="姓名"
            rules={[{ required: true, message: "请输入姓名" }]}
          >
            <input class={inputClass} placeholder="张三" />
          </FormItem>
          <FormItem
            name="email"
            label="邮箱"
            rules={[{ required: true, message: "请输入邮箱" }]}
          >
            <input
              class={inputClass}
              type="email"
              placeholder="you@example.com"
            />
          </FormItem>
          <button
            type="submit"
            class="ml-[92px] rounded bg-slate-800 px-4 py-2 text-sm text-white"
          >
            提交
          </button>
        </Form>
        {submitted.value ? (
          <pre class="mt-4 rounded bg-slate-100 p-3 text-xs">{submitted.value}</pre>
        ) : null}
      </div>
    );
  },
};

export const BlurValidation: Story = {
  render: () => () => (
    <div class="max-w-md">
      <p class="mb-4 text-sm text-slate-600">
        离开「邮箱」输入框时会触发 blur 单字段校验；必填未填则显示错误。
      </p>
      <Form>
        <FormItem
          name="email"
          label="邮箱"
          rules={[{ required: true, message: "请输入邮箱" }]}
          help="失焦后校验"
        >
          <input class={inputClass} type="email" placeholder="失焦试试" />
        </FormItem>
      </Form>
    </div>
  ),
};
