# @component-ai/ai-chat

React AI chat: OpenAI-compatible streaming via `useChat`, plus composable UI (`Chat`, `MessageList`, `Message`, `Composer`).

## Install

```bash
npm install @component-ai/ai-chat react react-dom
```

Import styles in your app entry:

```ts
import "@component-ai/ai-chat/style.css";
```

## Authentication: proxy vs browser `apiKey`

**Production (recommended): proxy mode**

Point `apiUrl` at your own backend. Keep API keys on the server; use `headers` for session cookies or gateway tokens. Do not expose provider keys in the browser.

```tsx
import { Chat, Composer, MessageList } from "@component-ai/ai-chat";

<Chat apiUrl="/api/chat" headers={{ Authorization: "Bearer <session-token>" }}>
  <MessageList />
  <Composer />
</Chat>
```

**Local / demos only: client `apiKey`**

You may pass `apiKey` for quick local testing or Storybook against a provider endpoint. **Never ship a real API key in client-side code** — anyone can extract it from bundled JavaScript or network requests.

```tsx
<Chat
  apiUrl="https://api.openai.com/v1/chat/completions"
  apiKey={process.env.OPENAI_API_KEY}
  model="gpt-4o-mini"
>
  <MessageList />
  <Composer />
</Chat>
```

For Storybook and unit tests, inject a mock `transport` instead of calling a real API (see `Chat.stories.tsx`).

## `useChat` (headless)

```tsx
import { useChat } from "@component-ai/ai-chat";

function MyChat() {
  const chat = useChat({
    apiUrl: "/api/chat",
    model: "gpt-4o-mini",
  });

  return (
    <>
      <ul>
        {chat.messages.map((message) => (
          <li key={message.id}>
            {message.role}: {message.content}
          </li>
        ))}
      </ul>
      <input
        value={chat.input}
        onChange={(event) => chat.setInput(event.target.value)}
      />
      <button type="button" onClick={() => void chat.send()}>
        Send
      </button>
      {chat.status === "streaming" ? (
        <button type="button" onClick={chat.stop}>
          Stop
        </button>
      ) : null}
      {chat.status === "error" ? (
        <button type="button" onClick={() => void chat.retry()}>
          Retry
        </button>
      ) : null}
    </>
  );
}
```

## `<Chat>` (composed UI)

```tsx
import { Chat, Composer, MessageList } from "@component-ai/ai-chat";
import "@component-ai/ai-chat/style.css";

export function AssistantPanel() {
  return (
    <div className="flex h-[480px] flex-col rounded-lg border border-slate-200">
      <Chat apiUrl="/api/chat" className="flex h-full min-h-0 flex-col">
        <MessageList className="min-h-0 flex-1" />
        <Composer />
      </Chat>
    </div>
  );
}
```

## Custom transport

Implement `ChatTransport` to swap SSE providers or use mocks in tests:

```ts
import type { ChatTransport } from "@component-ai/ai-chat";

const mockTransport: ChatTransport = {
  async stream(_request, handlers) {
    handlers.onToken("Hello");
    handlers.onDone();
  },
};
```

## Notes

- Default model: `gpt-4o-mini`
- `stop` aborts the stream and keeps partial assistant text
- `retry` re-sends after the last assistant message failed
- Button styling aligns with `@component-ai/react-ui` Button; this package ships a lightweight `ChatButton` so `react-ui` remains an optional peer
