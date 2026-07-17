import { useContext, useEffect, useRef } from "react";
import type { ChatMessage } from "../core/types";
import { ChatContext } from "./chat-context";
import { Message } from "./Message";

export type MessageListProps = {
  messages?: ChatMessage[];
  className?: string;
};

const FOLLOW_THRESHOLD_PX = 80;

export function MessageList({
  messages: messagesProp,
  className = "",
}: MessageListProps) {
  const context = useContext(ChatContext);
  const messages = messagesProp ?? context?.messages ?? [];

  const containerRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldFollowRef.current = distanceFromBottom <= FOLLOW_THRESHOLD_PX;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !shouldFollowRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      role="log"
      aria-live="polite"
      onScroll={handleScroll}
      className={`flex flex-col gap-2 overflow-y-auto p-3 ${className}`.trim()}
    >
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  );
}
