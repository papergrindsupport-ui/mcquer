import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Question, OptionId } from "@/lib/mcq/types";
import { VoltoPanel } from "@/components/volto/VoltoPanel";

export type VoltoExplainContext = {
  kind: "explain";
  question: Question;
  userAnswer: OptionId | null;
  paperLabel: string; // e.g. "Chemistry · 2019 F/M V2"
};

export type VoltoFeedbackContext = {
  kind: "feedback";
  analytics: string; // pre-serialized analytics blob
  paperLabel?: string;
};

export type VoltoContextValue = VoltoExplainContext | VoltoFeedbackContext;

type Api = {
  openExplain: (ctx: VoltoExplainContext) => void;
  openFeedback: (ctx: VoltoFeedbackContext) => void;
  close: () => void;
};

const Ctx = createContext<Api | null>(null);

export function useVolto() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useVolto must be used inside <VoltoProvider>");
  return c;
}

export function VoltoProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<VoltoContextValue | null>(null);

  const openExplain = useCallback(
    (c: VoltoExplainContext) => setCtx(c),
    [],
  );
  const openFeedback = useCallback(
    (c: VoltoFeedbackContext) => setCtx(c),
    [],
  );
  const close = useCallback(() => setCtx(null), []);

  return (
    <Ctx.Provider value={{ openExplain, openFeedback, close }}>
      {children}
      {ctx && <VoltoPanel context={ctx} onClose={close} />}
    </Ctx.Provider>
  );
}
