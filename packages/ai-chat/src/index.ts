import "./style.css";

export type {
  ChatMessage,
  ChatRole,
  ChatTransport,
  ChatTransportHandlers,
  ChatTransportRequest,
} from "./core/types";

export { createMessageId } from "./core/id";
export { extractDeltaFromSseChunk } from "./core/parse-sse";
export { openaiTransport } from "./core/openai-transport";

export { useChat } from "./useChat";
export type { UseChatOptions, UseChatReturn, UseChatStatus } from "./useChat";

export { Chat } from "./components/Chat";
export type { ChatProps } from "./components/Chat";
export { MessageList } from "./components/MessageList";
export type { MessageListProps } from "./components/MessageList";
export { Message } from "./components/Message";
export type { MessageProps } from "./components/Message";
export { Composer } from "./components/Composer";
export type { ComposerProps } from "./components/Composer";
export { ChatButton } from "./components/ChatButton";
export type { ChatButtonProps, ChatButtonVariant } from "./components/ChatButton";
