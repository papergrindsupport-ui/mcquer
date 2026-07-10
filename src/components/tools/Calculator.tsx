import { useEffect, useState } from "react";
import { LuCalculator, LuChevronDown, LuChevronRight, LuTrash2 } from "react-icons/lu";
import { ToolWindow } from "./ToolWindow";

type Props = { onClose: () => void; onMinimize: () => void };

type Hist = { id: string; expr: string; result: string };

// Safe evaluator supporting basic + scientific ops.
function evaluate(expr: string): string {
  if (!expr.trim()) return "";
  // Normalize: allow ^, π, e, and function names.
  let e = expr
    .replace(/π/g, "(Math.PI)")
    .replace(/(^|[^a-zA-Z])e(?![a-zA-Z])/g, "$1(Math.E)")
    .replace(/\^/g, "**")
    .replace(/\bsin\(/g, "Math.sin(")
    .replace(/\bcos\(/g, "Math.cos(")
    .replace(/\btan\(/g, "Math.tan(")
    .replace(/\basin\(/g, "Math.asin(")
    .replace(/\bacos\(/g, "Math.acos(")
    .replace(/\batan\(/g, "Math.atan(")
    .replace(/\bln\(/g, "Math.log(")
    .replace(/\blog\(/g, "Math.log10(")
    .replace(/\bsqrt\(/g, "Math.sqrt(")
    .replace(/\babs\(/g, "Math.abs(")
    .replace(/\bexp\(/g, "Math.exp(");
  // allow factorial n!
  e = e.replace(/(\d+(?:\.\d+)?|\))!/g, "fact($1)");
  // whitelist
  if (!/^[\d\s+\-*/().,%*eE\w]+$/.test(e)) throw new Error("bad");
  // sanity: only Math.* allowed identifiers
  const cleaned = e.replace(/Math\.\w+|fact/g, "");
  if (/[a-zA-Z_]/.test(cleaned)) throw new Error("bad ident");
  const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
  // eslint-disable-next-line no-new-func
  const val = new Function("fact", `return (${e})`)(fact);
  if (typeof val !== "number" || !isFinite(val)) throw new Error("bad result");
  return String(Math.round(val * 1e12) / 1e12);
}

const BASIC = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", ".", "(", ")"],
];

const SCI = ["sin(", "cos(", "tan(", "ln(", "log(", "sqrt(", "^", "π", "e", "!", "%", "exp("];

export function Calculator({ onClose, onMinimize }: Props) {
  const [expr, setExpr] = useState<string>(() => localStorage.getItem("igv-calc-expr") ?? "");
  const [result, setResult] = useState<string>("");
  const [showSci, setShowSci] = useState<boolean>(
    () => localStorage.getItem("igv-calc-sci") === "1",
  );
  const [history, setHistory] = useState<Hist[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("igv-calc-hist") ?? "[]");
    } catch {
      return [];
    }
  });
  const [showHist, setShowHist] = useState(true);

  useEffect(() => {
    localStorage.setItem("igv-calc-expr", expr);
  }, [expr]);
  useEffect(() => {
    localStorage.setItem("igv-calc-sci", showSci ? "1" : "0");
  }, [showSci]);
  useEffect(() => {
    localStorage.setItem("igv-calc-hist", JSON.stringify(history));
  }, [history]);

  const append = (s: string) => setExpr((e) => e + s);
  const compute = () => {
    try {
      const r = evaluate(expr);
      setResult(r);
      if (r !== "") {
        setHistory((h) => [{ id: crypto.randomUUID(), expr, result: r }, ...h].slice(0, 50));
      }
    } catch {
      setResult("Error");
    }
  };

  return (
    <ToolWindow
      title="Calculator"
      icon={<LuCalculator size={16} />}
      onClose={onClose}
      onMinimize={onMinimize}
      defaultWidth={340}
      defaultHeight={560}
      minWidth={260}
      minHeight={380}
    >
      <div className="flex h-full flex-col p-3">
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") compute();
          }}
          placeholder="Type or click..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
        <div className="mt-1 h-6 text-right font-mono text-sm text-muted-foreground">
          {result && `= ${result}`}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {BASIC.flat().map((k) => (
            <KeyBtn key={k} onClick={() => append(k)}>
              {k}
            </KeyBtn>
          ))}
          <KeyBtn onClick={() => setExpr("")} variant="warn">
            C
          </KeyBtn>
          <KeyBtn onClick={() => setExpr((e) => e.slice(0, -1))} variant="warn">
            ⌫
          </KeyBtn>
          <KeyBtn onClick={() => append("+")}>+</KeyBtn>
          <KeyBtn onClick={compute} variant="primary">
            =
          </KeyBtn>
        </div>

        <div className="mt-3 rounded-lg border border-border">
          <button
            onClick={() => setShowSci((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs font-medium"
          >
            <span>Scientific functions</span>
            {showSci ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
          </button>
          {showSci && (
            <div className="grid grid-cols-4 gap-2 border-t border-border p-2">
              {SCI.map((k) => (
                <KeyBtn key={k} onClick={() => append(k)} small>
                  {k}
                </KeyBtn>
              ))}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-lg border border-border">
            <div className="flex items-center justify-between px-3 py-2">
              <button
                onClick={() => setShowHist((v) => !v)}
                className="flex cursor-pointer items-center gap-1.5 text-xs font-medium"
              >
                {showHist ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
                History ({history.length})
              </button>
              <button
                onClick={() => setHistory([])}
                className="cursor-pointer text-muted-foreground hover:text-destructive"
                title="Clear history"
              >
                <LuTrash2 size={12} />
              </button>
            </div>
            {showHist && (
              <div className="flex-1 overflow-auto border-t border-border">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setExpr(h.expr)}
                    className="block w-full cursor-pointer border-b border-border/50 px-3 py-2 text-left font-mono text-xs hover:bg-accent"
                  >
                    <div className="text-muted-foreground">{h.expr}</div>
                    <div className="text-foreground">= {h.result}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolWindow>
  );
}

function KeyBtn({
  children,
  onClick,
  variant = "default",
  small = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "warn";
  small?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : variant === "warn"
        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
        : "bg-accent text-foreground hover:bg-accent/70";
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-md font-mono ${small ? "py-1.5 text-xs" : "py-2.5 text-sm"} ${styles}`}
    >
      {children}
    </button>
  );
}
