import { extractDeltaFromSseChunk } from "./parse-sse";
import type { ChatTransport } from "./types";

export const openaiTransport: ChatTransport = {
  async stream(request, handlers) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(request.headers ?? {}),
    };
    if (request.apiKey) {
      headers.Authorization = `Bearer ${request.apiKey}`;
    }
    let response: Response;
    try {
      response = await fetch(request.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: true,
        }),
        signal: request.signal,
      });
    } catch (err) {
      if (request.signal?.aborted) return;
      handlers.onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    if (!response.ok) {
      handlers.onError(new Error(`Chat request failed: ${response.status}`));
      return;
    }
    if (!response.body) {
      handlers.onError(new Error("Chat response missing body"));
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let lineBuffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const parts = lineBuffer.split(/\r?\n/);
        lineBuffer = parts.pop() ?? "";
        if (parts.length === 0) continue;
        const text = extractDeltaFromSseChunk(parts.join("\n") + "\n");
        if (text) handlers.onToken(text);
      }
      lineBuffer += decoder.decode();
      if (lineBuffer.trim()) {
        const text = extractDeltaFromSseChunk(lineBuffer.endsWith("\n") ? lineBuffer : `${lineBuffer}\n`);
        if (text) handlers.onToken(text);
      }
      handlers.onDone();
    } catch (err) {
      if (request.signal?.aborted) return;
      handlers.onError(err instanceof Error ? err : new Error(String(err)));
    }
  },
};
