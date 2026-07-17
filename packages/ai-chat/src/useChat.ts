import { useCallback, useRef, useState } from "react";
import { createMessageId } from "./core/id";
import { openaiTransport } from "./core/openai-transport";
import type { ChatMessage, ChatRole, ChatTransport } from "./core/types";

export type UseChatOptions = {
  apiUrl: string;
  apiKey?: string;
  model?: string;
  initialMessages?: ChatMessage[];
  transport?: ChatTransport;
  headers?: Record<string, string>;
};

export type UseChatStatus = "idle" | "streaming" | "error";

export type UseChatReturn = {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  status: UseChatStatus;
  error: Error | undefined;
  send: (text?: string) => Promise<void>;
  stop: () => void;
  retry: () => Promise<void>;
  reload: () => Promise<void>;
};

const DEFAULT_MODEL = "gpt-4o-mini";

function toRequestMessages(
  messages: ChatMessage[],
): Array<{ role: ChatRole; content: string }> {
  return messages
    .filter((message) => message.status !== "error")
    .map((message) => ({ role: message.role, content: message.content }));
}

function findLastUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return messages[i];
  }
  return undefined;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [messages, setMessagesState] = useState<ChatMessage[]>(
    () => options.initialMessages ?? [],
  );
  const messagesRef = useRef(messages);

  const [input, setInputState] = useState("");
  const inputRef = useRef(input);

  const [status, setStatusState] = useState<UseChatStatus>("idle");
  const statusRef = useRef<UseChatStatus>("idle");

  const [error, setErrorState] = useState<Error | undefined>(undefined);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);

  const setMessages = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessagesState(next);
  }, []);

  const updateMessage = useCallback(
    (id: string, updater: (message: ChatMessage) => ChatMessage) => {
      setMessages(
        messagesRef.current.map((message) =>
          message.id === id ? updater(message) : message,
        ),
      );
    },
    [setMessages],
  );

  const setStatus = useCallback((next: UseChatStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const setInput = useCallback((value: string) => {
    inputRef.current = value;
    setInputState(value);
  }, []);

  const runStream = useCallback(
    async (
      requestMessages: Array<{ role: ChatRole; content: string }>,
      assistantId: string,
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      streamingAssistantIdRef.current = assistantId;

      const { apiUrl, apiKey, model, transport, headers } = optionsRef.current;

      await (transport ?? openaiTransport).stream(
        {
          apiUrl,
          apiKey,
          model: model ?? DEFAULT_MODEL,
          messages: requestMessages,
          headers,
          signal: controller.signal,
        },
        {
          onToken: (text) => {
            updateMessage(assistantId, (message) => ({
              ...message,
              content: message.content + text,
            }));
          },
          onDone: () => {
            updateMessage(assistantId, (message) => ({
              ...message,
              status: "done",
            }));
            setStatus("idle");
          },
          onError: (err) => {
            updateMessage(assistantId, (message) => ({
              ...message,
              status: "error",
              error: err.message,
            }));
            setStatus("error");
            setErrorState(err);
          },
        },
      );

      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        streamingAssistantIdRef.current = null;
      }
    },
    [setStatus, updateMessage],
  );

  const send = useCallback(
    async (text?: string) => {
      if (statusRef.current === "streaming") return;

      const content = (text ?? inputRef.current).trim();
      if (!content) return;

      setInput("");

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content,
      };
      const historyWithUser = [...messagesRef.current, userMessage];
      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: "",
        status: "streaming",
      };

      setMessages([...historyWithUser, assistantMessage]);
      setStatus("streaming");
      setErrorState(undefined);

      await runStream(toRequestMessages(historyWithUser), assistantMessage.id);
    },
    [runStream, setInput, setMessages, setStatus],
  );

  const stop = useCallback(() => {
    const controller = abortControllerRef.current;
    const assistantId = streamingAssistantIdRef.current;
    if (!controller || !assistantId) return;

    controller.abort();
    abortControllerRef.current = null;
    streamingAssistantIdRef.current = null;

    updateMessage(assistantId, (message) => ({ ...message, status: "done" }));
    setStatus("idle");
  }, [setStatus, updateMessage]);

  const retry = useCallback(async () => {
    const current = messagesRef.current;
    const last = current[current.length - 1];
    if (!last || last.role !== "assistant" || last.status !== "error") return;

    const withoutFailed = current.slice(0, -1);
    const lastUser = findLastUserMessage(withoutFailed);
    if (!lastUser) return;

    const assistantMessage: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: "",
      status: "streaming",
    };
    setMessages([...withoutFailed, assistantMessage]);
    setStatus("streaming");
    setErrorState(undefined);

    await runStream(toRequestMessages(withoutFailed), assistantMessage.id);
  }, [runStream, setMessages, setStatus]);

  const reload = useCallback(async () => {
    if (statusRef.current === "streaming") return;

    const current = messagesRef.current;
    const last = current[current.length - 1];
    const withoutLastAssistant =
      last?.role === "assistant" ? current.slice(0, -1) : current;

    const lastUser = findLastUserMessage(withoutLastAssistant);
    if (!lastUser) return;

    const assistantMessage: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: "",
      status: "streaming",
    };
    setMessages([...withoutLastAssistant, assistantMessage]);
    setStatus("streaming");
    setErrorState(undefined);

    await runStream(toRequestMessages(withoutLastAssistant), assistantMessage.id);
  }, [runStream, setMessages, setStatus]);

  return {
    messages,
    input,
    setInput,
    status,
    error,
    send,
    stop,
    retry,
    reload,
  };
}
