export type ChatMessage = { role: "system" | "user" | "assistant"; content: unknown };

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function toText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const texts = content.flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const p = part as { type?: string; text?: unknown };
      if (p.type === "text" && typeof p.text === "string") return [p.text];
      return [];
    });
    return texts.join("\n");
  }
  if (content && typeof content === "object") return JSON.stringify(content);
  return String(content ?? "");
}

function toParts(content: unknown): GeminiPart[] {
  if (typeof content === "string") return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: toText(content) }];
  const parts: GeminiPart[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const p = part as {
      type?: string;
      text?: unknown;
      image_url?: { url?: string };
    };
    if (p.type === "text" && typeof p.text === "string") {
      parts.push({ text: p.text });
    } else if (p.type === "image_url" && p.image_url?.url) {
      const url = p.image_url.url;
      const m = /^data:([^;]+);base64,(.*)$/.exec(url);
      if (m) {
        parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
      } else {
        parts.push({ text: url });
      }
    }
  }
  return parts.length ? parts : [{ text: "" }];
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
      parts: toParts(message.content),
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
