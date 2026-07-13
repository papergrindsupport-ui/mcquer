export type ChatMessage = { role: "system" | "user" | "assistant"; content: unknown };

type GeminiPart = { text: string };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function toText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const texts = content.flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const maybePart = part as { type?: string; text?: unknown };
      if (maybePart.type === "text" && typeof maybePart.text === "string") {
        return [maybePart.text];
      }
      return [];
    });
    if (texts.length) return texts.join("\n");
    return JSON.stringify(content);
  }
  if (content && typeof content === "object") return JSON.stringify(content);
  return String(content ?? "");
}

export function getGeminiConfig() {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
  return { key, model };
}

export function buildGeminiBody(messages: ChatMessage[], options?: { json?: boolean }) {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => toText(message.content))
    .join("\n\n")
    .trim();

  const contents: GeminiContent[] = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: toText(message.content) }],
    }));

  const body: Record<string, unknown> = { contents };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }
  if (options?.json) {
    body.generationConfig = { responseMimeType: "application/json" };
  }
  return body;
}

export function extractGeminiText(payload: unknown): string {
  const maybePayload = payload as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const part = maybePayload.candidates?.[0]?.content?.parts?.find(
    (candidatePart) => typeof candidatePart?.text === "string",
  );
  return part?.text ?? "";
}
