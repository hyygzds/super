import type { Meta, StoryObj } from "@storybook/react";
import type { ChatTransport } from "../core/types";
import "../style.css";
import { Chat } from "./Chat";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";

const meta = {
  title: "React/AIChat",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function ChatPanel({
  transport,
  className = "",
}: {
  transport?: ChatTransport;
  className?: string;
}) {
  return (
    <div
      className={`flex h-[480px] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`.trim()}
    >
      <Chat
        apiUrl="https://api.example.com/v1/chat/completions"
        transport={transport}
        className="flex h-full min-h-0 flex-col"
      >
        <MessageList className="min-h-0 flex-1" />
        <Composer />
      </Chat>
    </div>
  );
}

function createMockStreamTransport(tokens: string[], delayMs = 50): ChatTransport {
  return {
    stream: async (request, handlers) => {
      for (const token of tokens) {
        if (request.signal?.aborted) return;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (request.signal?.aborted) return;
        handlers.onToken(token);
      }
      handlers.onDone();
    },
  };
}

export const MockStream: Story = {
  render: () => (
    <ChatPanel
      transport={createMockStreamTransport([
        "Hello",
        ", ",
        "this ",
        "is ",
        "a ",
        "mock ",
        "stream ",
        "with ",
        "~50ms ",
        "tokens.",
      ])}
    />
  ),
};

export const ErrorRetry: Story = {
  render: function Render() {
    let attempt = 0;

    const transport: ChatTransport = {
      stream: async (_request, handlers) => {
        attempt += 1;
        if (attempt === 1) {
          handlers.onError(new Error("network down"));
          return;
        }
        handlers.onToken("Recovered after retry.");
        handlers.onDone();
      },
    };

    return <ChatPanel transport={transport} />;
  },
};

export const Stop: Story = {
  render: () => (
    <ChatPanel
      transport={createMockStreamTransport(
        "This is a long mock stream. ".repeat(40).split(""),
        50,
      )}
    />
  ),
};
