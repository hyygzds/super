export function extractDeltaFromSseChunk(chunk: string): string {
  let out = "";
  for (const line of chunk.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const json = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const piece = json.choices?.[0]?.delta?.content;
      if (typeof piece === "string") out += piece;
    } catch {
      // skip malformed
    }
  }
  return out;
}
