import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "system" | "user" | "assistant"; content: unknown };

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
          return new Response("Missing GEMINI_API_KEY", { status: 500 });
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

        const model = (body.model ?? "gemini-3.5-flash").replace(/^google\//, "");

        const upstream = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model,
              messages,
              ...(body.json ? { response_format: { type: "json_object" } } : {}),
            }),
          },
        );

        const raw = await upstream.text();
        if (!upstream.ok) {
          return new Response(raw || "Upstream error", {
            status: upstream.status || 502,
          });
        }
        try {
          const parsed = JSON.parse(raw);
          const content: string = parsed?.choices?.[0]?.message?.content ?? "";
          return Response.json({ content });
        } catch {
          return new Response("Bad upstream JSON", { status: 502 });
        }
      },
    },
  },
});
