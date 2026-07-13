import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "system" | "user" | "assistant"; content: unknown };

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

        // Gemini frequently returns 503 (model overloaded) or 429 under load.
        // Retry a couple times with backoff before surfacing the error.
        const doFetch = () =>
          fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({ model, messages, stream: true }),
          });

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

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
