import { createFileRoute } from "@tanstack/react-router";
import { buildGeminiBody, extractGeminiText, type ChatMessage } from "@/lib/ai/gemini";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
          return new Response("is volto sleeping? 👀 try reloading..", { status: 500 });
        }
        let body: { messages?: ChatMessage[]; model?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = body.messages ?? [];
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }

        const envModel = process.env.GEMINI_MODEL;
        const model = (body.model ?? envModel ?? "gemini-3.5-flash").replace(/^google\//, "");

        const doFetch = () =>
          fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": key,
              },
              body: JSON.stringify(buildGeminiBody(messages)),
            },
          );

        let upstream = await doFetch();
        for (
          let attempt = 0;
          attempt < 2 && (upstream.status === 503 || upstream.status === 429);
          attempt++
        ) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          upstream = await doFetch();
        }

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", {
            status: upstream.status || 502,
          });
        }

        // Transform native Gemini SSE frames into OpenAI-compatible delta
        // frames so the existing client parser keeps working.
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const reader = upstream.body.getReader();
        const stream = new ReadableStream({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              const l = line.trim();
              if (!l.startsWith("data:")) continue;
              const payload = l.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const text = extractGeminiText(json);
                if (text) {
                  const frame = { choices: [{ delta: { content: text } }] };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
                }
              } catch {
                /* ignore partial frames */
              }
            }
          },
          cancel(reason) {
            reader.cancel(reason);
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
