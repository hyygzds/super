export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  status?: "streaming" | "done" | "error";
  error?: string;
};

export type ChatTransportRequest = {
  apiUrl: string;
  apiKey?: string;
  model: string;
  messages: Array<{ role: ChatRole; content: string }>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type ChatTransportHandlers = {
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
};

export type ChatTransport = {
  stream: (
    request: ChatTransportRequest,
    handlers: ChatTransportHandlers,
  ) => Promise<void>;
};
