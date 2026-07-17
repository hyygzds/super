import { useContext } from "react";
import type { FormEvent } from "react";
import type { UseChatReturn } from "../useChat";
import { ChatButton } from "./ChatButton";
import { ChatContext } from "./chat-context";

export type ComposerProps = {
  chat?: UseChatReturn;
  placeholder?: string;
  className?: string;
};

export function Composer({
  chat: chatProp,
  placeholder = "输入消息…",
  className = "",
}: ComposerProps) {
  const context = useContext(ChatContext);
  const chat = chatProp ?? context;

  if (!chat) {
    throw new Error(
      "Composer must be rendered within <Chat> or receive a `chat` prop.",
    );
  }

  const { input, setInput, status, error, send, stop, retry } = chat;
  const isStreaming = status === "streaming";
  const isError = status === "error";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isStreaming) return;
    void send();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-2 border-t border-slate-200 p-3 ${className}`.trim()}
    >
      {isError && error ? (
        <p role="alert" className="text-xs text-red-600">
          {error.message}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          disabled={isStreaming}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-50"
        />
        {isError ? (
          <ChatButton
            type="button"
            variant="secondary"
            aria-label="重试"
            onClick={() => {
              void retry();
            }}
          >
            重试
          </ChatButton>
        ) : null}
        <ChatButton
          type={isStreaming ? "button" : "submit"}
          variant="primary"
          aria-label={isStreaming ? "停止" : "发送"}
          onClick={
            isStreaming
              ? () => {
                  stop();
                }
              : undefined
          }
        >
          {isStreaming ? "停止" : "发送"}
        </ChatButton>
      </div>
    </form>
  );
}
