import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuX,
  LuSend,
  LuSparkles,
  LuMessageCircle,
  LuFlaskConical,
  LuCircleCheck,
  LuCircleX,
  LuRotateCcw,
} from "react-icons/lu";
import { Markdown } from "./Markdown";
import type { VoltoContextValue } from "@/lib/volto/context";
import { serializeQuestion, questionTopicHint } from "@/lib/volto/serialize";
import { streamChat, completeJSON, type ChatMessage } from "@/lib/volto/client";
import { collectQuestionImages, buildImageParts } from "@/lib/volto/images";
import type { OptionId } from "@/lib/mcq/types";
import { Bot, GraduationCap } from "lucide-react";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  // Optional inline generated MCQ
  mcq?: GeneratedMCQ;
};

type GeneratedMCQ = {
  question: string;
  options: Record<OptionId, string>;
  correct: OptionId;
  explanation: string;
};

const VOLTO_SYSTEM = `You are Volto, a friendly and precise IGCSE tutor.
- Explain concepts clearly and concisely.
- Use markdown: bold key terms, use bullet points, code blocks and LaTeX ($...$ or $$...$$) for equations.
- Chemistry equations: use $\\ce{...}$ (mhchem-style). Physics/Math: standard LaTeX.
- Prefer 4-8 sentence answers unless the student asks for more depth.
- Never claim to have run tools; you cannot browse.`;

function buildExplainMessages(ctx: Extract<VoltoContextValue, { kind: "explain" }>) {
  const s = serializeQuestion(ctx.question);
  const userChoice = ctx.userAnswer ?? "(no answer selected)";
  const verdict =
    ctx.userAnswer === null
      ? "The student did not answer."
      : ctx.userAnswer === s.answer
        ? "The student's answer is correct."
        : "The student's answer is incorrect.";

  return [
    { role: "system" as const, content: VOLTO_SYSTEM },
    {
      role: "user" as const,
      content: `Paper: ${ctx.paperLabel}
Question ${s.n}.
${s.intro ? `Intro: ${s.intro}\n` : ""}${s.data ? `Data:\n${s.data}\n` : ""}Question: ${s.question}

Options:
A) ${s.options.A}
B) ${s.options.B}
C) ${s.options.C}
D) ${s.options.D}

Correct answer: ${s.answer}
Student picked: ${userChoice}

${verdict} Please:
1. Confirm whether ${userChoice === "(no answer selected)" ? "an answer was" : `option ${userChoice} is`} correct or incorrect and why.
2. Explain the underlying concept in plain language.
3. Briefly say why each of the other options is wrong.
Keep it tight — under ~180 words.`,
    },
  ];
}

function buildFeedbackMessages(ctx: Extract<VoltoContextValue, { kind: "feedback" }>) {
  return [
    { role: "system" as const, content: VOLTO_SYSTEM },
    {
      role: "user" as const,
      content: `Below is a full dump of my study analytics from an IGCSE past-paper practice app. Give me warm, specific personal feedback:
- What I'm doing well.
- Where I'm struggling (be specific — subjects, topics, or patterns you can see).
- 3 concrete next steps.
Use short markdown sections with bold headers. Keep it under ~250 words.

Analytics:
\`\`\`json
${ctx.analytics}
\`\`\``,
    },
  ];
}

function buildTestMessages(topic: string) {
  return [
    {
      role: "system" as const,
      content: `You are Volto, an IGCSE tutor. Generate ONE multiple choice question to test the student on the given topic.
Respond ONLY with valid JSON in this exact shape:
{"question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correct": "A|B|C|D", "explanation": "..."}
The question and options may contain markdown / LaTeX. Explanation is one short paragraph.`,
    },
    {
      role: "user" as const,
      content: `Generate a fresh MCQ testing the student on: ${topic}`,
    },
  ];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function VoltoPanel({
  context,
  onClose,
}: {
  context: VoltoContextValue;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"initial" | "chat">("initial");
  const [initialText, setInitialText] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const topic = useMemo(() => {
    if (context.kind === "explain") return questionTopicHint(context.question);
    return "your recent practice performance";
  }, [context]);

  // Fetch initial content on open
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setInitialLoading(true);
    setInitialError(null);
    setInitialText("");
    (async () => {
      let msgs: ChatMessage[] =
        context.kind === "explain" ? buildExplainMessages(context) : buildFeedbackMessages(context);
      // For explain: attach any images/diagrams belonging to this question so
      // the model can actually see the figure it's explaining.
      if (context.kind === "explain") {
        const imgs = collectQuestionImages(context.question);
        if (imgs.length > 0) {
          const { parts, captions } = await buildImageParts(imgs, 6);
          if (parts.length > 0) {
            const lastIdx = msgs.length - 1;
            const last = msgs[lastIdx];
            const originalText = typeof last.content === "string" ? last.content : "";
            msgs = [
              ...msgs.slice(0, lastIdx),
              {
                role: last.role,
                content: [
                  {
                    type: "text",
                    text: `${originalText}\n\nAttached figures:\n${captions.join("\n")}`,
                  },
                  ...parts,
                ],
              },
            ];
          }
        }
      }
      try {
        await streamChat(
          msgs,
          (delta) => {
            if (cancelled) return;
            setInitialText((t) => t + delta);
          },
          ctrl.signal,
        );
        if (!cancelled) setInitialLoading(false);
      } catch (e) {
        if (cancelled) return;
        setInitialError(String((e as Error)?.message ?? e));

        setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [context]);

  // Autoscroll on message updates
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, initialText, mode]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const continueChatting = useCallback(() => {
    setMode("chat");
    // Seed initial assistant greeting
    const greeting: ChatMsg = {
      id: uid(),
      role: "assistant",
      content: `What questions do you have about **${topic}**?`,
    };
    setMessages([greeting]);
  }, [topic]);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || sending) return;
      const userMsg: ChatMsg = { id: uid(), role: "user", content: clean };
      const asstId = uid();
      const asstMsg: ChatMsg = {
        id: asstId,
        role: "assistant",
        content: "",
        streaming: true,
      };
      setMessages((prev) => [...prev, userMsg, asstMsg]);
      setInput("");
      setSending(true);

      // Build history: system + full original context + initial explanation
      // + prior chat + new user turn. This gives the model the entire question
      // (intro, data, options, correct answer, student's pick) on every turn,
      // not just a short topic string.
      const seed: ChatMessage[] =
        context.kind === "explain" ? buildExplainMessages(context) : buildFeedbackMessages(context);
      const history: ChatMessage[] = [
        ...seed,
        ...(initialText ? [{ role: "assistant" as const, content: initialText }] : []),
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content: clean },
      ];

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        await streamChat(
          history,
          (delta) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, content: m.content + delta } : m)),
            );
          },
          ctrl.signal,
        );
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId ? { ...m, content: `⚠️ ${String((e as Error)?.message ?? e)}` } : m,
          ),
        );
      } finally {
        setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, streaming: false } : m)));
        setSending(false);
      }
    },
    [messages, sending, context, initialText],
  );

  const runTestMe = useCallback(async () => {
    if (testLoading) return;
    setTestLoading(true);
    // Ask AI what topic to test on based on chat context
    const chatSummary = messages
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    const testTopic = `${topic}${chatSummary ? `\n\nRecent chat context:\n${chatSummary}` : ""}`;
    const placeholder: ChatMsg = {
      id: uid(),
      role: "assistant",
      content: "Generating a fresh question for you…",
      streaming: true,
    };
    setMessages((prev) => [...prev, placeholder]);
    try {
      const mcq = await completeJSON<GeneratedMCQ>(buildTestMessages(testTopic));
      if (!mcq.correct || !["A", "B", "C", "D"].includes(mcq.correct)) {
        throw new Error("Malformed MCQ response");
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? {
                id: m.id,
                role: "assistant",
                content: "Here's a question — pick one:",
                mcq,
              }
            : m,
        ),
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? {
                ...m,
                streaming: false,
                content: `⚠️ Couldn't generate a test question: ${String((e as Error)?.message ?? e)}`,
              }
            : m,
        ),
      );
    } finally {
      setTestLoading(false);
    }
  }, [messages, topic, testLoading]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[80] animate-fade-in bg-black/40 backdrop-blur-sm"
      />
      {/* Slide-over */}
      <aside
        role="dialog"
        aria-label="Volto AI assistant"
        className="fixed inset-y-0 right-0 z-[81] flex w-full max-w-[540px] animate-slide-in-right flex-col border-l border-border bg-card shadow-2xl sm:w-[92vw]"
        style={{ animation: "volto-slide 0.35s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow">
            <GraduationCap size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Volto</h2>
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                AI tutor
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {context.kind === "explain"
                ? `Q${context.question.n} · ${context.paperLabel}`
                : "Personal feedback"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuX size={16} />
          </button>
        </header>

        {/* Body */}
        <div ref={scrollRef} className="volto-scroll flex-1 overflow-y-auto px-4 py-4">
          {mode === "initial" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background/40 p-3">
                {initialLoading && !initialText && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
                    Volto is thinking…
                  </div>
                )}
                {initialError && <div className="text-sm text-red-500">⚠️ {initialError}</div>}
                {initialText && <Markdown>{initialText}</Markdown>}
              </div>
              {!initialLoading && !initialError && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={continueChatting}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:opacity-90 active:scale-95"
                  >
                    <LuMessageCircle size={14} /> Continue chatting about it
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ChatView
              messages={messages}
              onSelectMcqOption={(msgId, id) => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId && m.mcq
                      ? {
                          ...m,
                          mcq: { ...m.mcq, _selected: id } as GeneratedMCQ & {
                            _selected?: OptionId;
                          },
                        }
                      : m,
                  ),
                );
              }}
              onRegenerate={runTestMe}
            />
          )}
        </div>

        {/* Composer */}
        {mode === "chat" && (
          <div className="border-t border-border bg-background/60 p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                onClick={runTestMe}
                disabled={testLoading || sending}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LuFlaskConical size={12} />
                {testLoading ? "Generating…" : "Test me"}
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask Volto…"
                rows={1}
                disabled={sending}
                className="volto-scroll min-h-[40px] max-h-32 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg bg-primary text-primary-foreground transition-transform hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <LuSend size={16} />
              </button>
            </form>
          </div>
        )}
      </aside>

      <style>{`
        @keyframes volto-slide {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

function ChatView({
  messages,
  onSelectMcqOption,
  onRegenerate,
}: {
  messages: ChatMsg[];
  onSelectMcqOption: (msgId: string, id: OptionId) => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          msg={m}
          onSelectMcqOption={(id) => onSelectMcqOption(m.id, id)}
          onRegenerate={onRegenerate}
        />
      ))}
    </div>
  );
}

function MessageBubble({
  msg,
  onSelectMcqOption,
  onRegenerate,
}: {
  msg: ChatMsg;
  onSelectMcqOption: (id: OptionId) => void;
  onRegenerate: () => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-3 py-2 ${
          isUser ? "bg-primary text-primary-foreground" : "border border-border bg-background/60"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
        ) : (
          <>
            {msg.content && <Markdown>{msg.content}</Markdown>}
            {msg.streaming && !msg.content && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Thinking…
              </span>
            )}
            {msg.mcq && (
              <InlineMcq mcq={msg.mcq} onSelect={onSelectMcqOption} onRegenerate={onRegenerate} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InlineMcq({
  mcq,
  onSelect,
  onRegenerate,
}: {
  mcq: GeneratedMCQ & { _selected?: OptionId };
  onSelect: (id: OptionId) => void;
  onRegenerate: () => void;
}) {
  const selected = mcq._selected;
  const revealed = !!selected;
  const ids: OptionId[] = ["A", "B", "C", "D"];
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="text-sm font-medium">
        <Markdown>{mcq.question}</Markdown>
      </div>
      <div className="space-y-1.5">
        {ids.map((id) => {
          const isCorrect = id === mcq.correct;
          const isSelected = selected === id;
          let cls =
            "flex w-full cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent";
          if (revealed) {
            cls = cls.replace("cursor-pointer", "cursor-default");
            if (isCorrect)
              cls +=
                " !border-emerald-500 !bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
            else if (isSelected && !isCorrect)
              cls += " !border-red-500 !bg-red-500/10 text-red-600 dark:text-red-400";
          }
          return (
            <button key={id} disabled={revealed} onClick={() => onSelect(id)} className={cls}>
              <span className="font-semibold">{id}.</span>
              <span className="flex-1">
                <Markdown>{mcq.options[id]}</Markdown>
              </span>
              {revealed && isCorrect && <LuCircleCheck size={14} className="mt-0.5 shrink-0" />}
              {revealed && isSelected && !isCorrect && (
                <LuCircleX size={14} className="mt-0.5 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      {revealed && (
        <>
          <div className="mt-2 rounded-md border border-border bg-background/70 p-2 text-xs">
            <Markdown>{mcq.explanation}</Markdown>
          </div>
          <button
            onClick={onRegenerate}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
          >
            <LuRotateCcw size={11} /> Another one
          </button>
        </>
      )}
    </div>
  );
}
