import type { ReactNode } from "react";
import { useChat, type UseChatOptions } from "../useChat";
import { ChatContext } from "./chat-context";

export type ChatProps = UseChatOptions & {
  className?: string;
  children?: ReactNode;
};

export function Chat({ className = "", children, ...chatOptions }: ChatProps) {
  const chat = useChat(chatOptions);

  return (
    <ChatContext.Provider value={chat}>
      <div className={`flex flex-col ${className}`.trim()}>{children}</div>
    </ChatContext.Provider>
  );
}
