/**
 * Streaming SSE parser for /api/ai/chat. Yields delta text chunks.
 */
export async function streamChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `AI request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const payload = l.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta: string = json?.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // ignore parse errors on partial SSE frames
      }
    }
  }
  return full;
}

export async function completeJSON<T>(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch("/api/ai/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, json: true }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `AI request failed (${res.status})`);
  }
  const { content } = (await res.json()) as { content: string };
  // Strip code fences if the model wrapped JSON
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

export async function completeText(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/ai/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `AI request failed (${res.status})`);
  }
  const { content } = (await res.json()) as { content: string };
  return content;
}
