import type { ChatMessage } from "../core/types";

export type MessageProps = {
  message: ChatMessage;
};

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";

  const bubbleClass = isUser
    ? "bg-sky-600 text-white"
    : "bg-slate-100 text-slate-900";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
      data-role={message.role}
    >
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${bubbleClass} ${
          isError ? "border border-red-400" : ""
        }`.trim()}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming ? (
            <span
              className="ml-1 inline-block animate-pulse"
              aria-hidden="true"
            >
              ▍
            </span>
          ) : null}
        </p>
        {isError && message.error ? (
          <p className="mt-1 text-xs text-red-600">{message.error}</p>
        ) : null}
      </div>
    </div>
  );
}
