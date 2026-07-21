import { createFileRoute } from "@tanstack/react-router";
import { buildGeminiBody, extractGeminiText, type ChatMessage } from "@/lib/ai/gemini";

/**
 * Non-streaming completion. Used for the initial "explain this answer"
 * response and for generating a Volto "test me" MCQ.
 * Pass `json: true` to force JSON output.
 */
export const Route = createFileRoute("/api/ai/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
          return new Response("is volto sleeping? 👀 try reloading..", { status: 500 });
        }
        let body: {
          messages?: ChatMessage[];
          model?: string;
          json?: boolean;
        };
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
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": key,
              },
              body: JSON.stringify(buildGeminiBody(messages, { json: body.json })),
            },
          );

        // Gemini often returns 503 (overloaded) / 429 under load — retry with backoff.
        let upstream = await doFetch();
        for (
          let attempt = 0;
          attempt < 2 && (upstream.status === 503 || upstream.status === 429);
          attempt++
        ) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          upstream = await doFetch();
        }

        const raw = await upstream.text();
        if (!upstream.ok) {
          return new Response(raw || "Upstream error", {
            status: upstream.status || 502,
          });
        }
        try {
          const parsed = JSON.parse(raw);
          const content: string = extractGeminiText(parsed);
          return Response.json({ content });
        } catch {
          return new Response("Bad upstream JSON", { status: 502 });
        }
      },
    },
  },
});
