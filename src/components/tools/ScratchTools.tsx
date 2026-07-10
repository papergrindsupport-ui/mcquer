import { useEffect, useRef, useState } from "react";
import {
  LuBrush,
  LuEraser,
  LuDownload,
  LuTrash2,
  LuType,
  LuStickyNote,
  LuPlus,
  LuX,
} from "react-icons/lu";
import { ToolWindow } from "./ToolWindow";

type Props = { onClose: () => void; onMinimize: () => void };

type TextItem = { id: string; x: number; y: number; text: string; color: string; size: number };
type Note = { id: string; text: string; color: string };

const NOTE_COLORS = ["#fde68a", "#fca5a5", "#a7f3d0", "#93c5fd", "#c4b5fd", "#f9a8d4"];

function getThemePrimaryColor() {
  if (typeof window === "undefined") return "#42f54e";
  const root = document.documentElement;
  const h = Number(getComputedStyle(root).getPropertyValue("--primary-h")) || 220;
  const s = Number(getComputedStyle(root).getPropertyValue("--primary-s").replace("%", "")) || 90;
  const l = Number(getComputedStyle(root).getPropertyValue("--primary-l").replace("%", "")) || 55;

  const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l / 100 - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value: number) => {
    return Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function ScratchTools({ onClose, onMinimize }: Props) {
  const [tab, setTab] = useState<"canvas" | "notes">("canvas");

  return (
    <ToolWindow
      title="Scratch tools"
      icon={<LuBrush size={16} />}
      onClose={onClose}
      onMinimize={onMinimize}
      defaultWidth={520}
      defaultHeight={560}
      minWidth={280}
      minHeight={320}
      contentClassName="flex flex-col"
    >
      <div className="flex shrink-0 border-b border-border bg-card">
        <TabBtn
          active={tab === "canvas"}
          onClick={() => setTab("canvas")}
          icon={<LuBrush size={14} />}
        >
          Canvas
        </TabBtn>
        <TabBtn
          active={tab === "notes"}
          onClick={() => setTab("notes")}
          icon={<LuStickyNote size={14} />}
        >
          Sticky notes
        </TabBtn>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "canvas" ? <CanvasTab /> : <NotesTab />}
      </div>
    </ToolWindow>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ============== Canvas Tab ============== */

function CanvasTab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser" | "text">("pen");
  const [color, setColor] = useState<string>(() => {
    if (typeof window === "undefined") return "#42f54e";
    return localStorage.getItem("igv-canvas-color") ?? getThemePrimaryColor();
  });
  const [weight, setWeight] = useState<number>(() =>
    Number(localStorage.getItem("igv-canvas-weight") ?? 3),
  );
  const [texts, setTexts] = useState<TextItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("igv-canvas-texts") ?? "[]");
    } catch {
      return [];
    }
  });
  const drawing = useRef(false);
  const points = useRef<{ x: number; y: number }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [textPrompt, setTextPrompt] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  // dark mode aware bg (transparent overlays over popover)
  useEffect(() => {
    localStorage.setItem("igv-canvas-color", color);
  }, [color]);
  useEffect(() => {
    localStorage.setItem("igv-canvas-weight", String(weight));
  }, [weight]);
  useEffect(() => {
    localStorage.setItem("igv-canvas-texts", JSON.stringify(texts));
  }, [texts]);

  // resize + restore
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const restore = () => {
      const data = localStorage.getItem("igv-canvas-image");
      if (!data) return;
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0);
      };
      img.src = data;
    };
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      // save current before resize
      const prev = canvas.toDataURL();
      canvas.width = r.width;
      canvas.height = r.height;
      setSize({ w: r.width, h: r.height });
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0);
      };
      img.src = prev;
    });
    ro.observe(wrap);
    // initial size + restore
    const r = wrap.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
    setSize({ w: r.width, h: r.height });
    restore();
    return () => ro.disconnect();
  }, []);

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      localStorage.setItem("igv-canvas-image", canvas.toDataURL());
    } catch {
      // ignore storage failures
    }
  };

  const pointer = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if (tool === "text") {
      const p = pointer(e);
      setTextPrompt(p);
      setTextValue("");
      return;
    }
    drawing.current = true;
    const p = pointer(e);
    points.current = [p];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = pointer(e);
    points.current.push(p);
    const pts = points.current;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = weight * 4;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = weight;
    }
    // Smooth: draw quadratic curve from previous midpoint to current midpoint,
    // using the previous raw point as the control. Produces silky curves.
    if (pts.length < 3) return;
    const n = pts.length;
    const p0 = pts[n - 3];
    const p1 = pts[n - 2];
    const p2 = pts[n - 1];
    const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    ctx.stroke();
  };
  const onUp = () => {
    if (drawing.current) saveImage();
    drawing.current = false;
    points.current = [];
  };

  const confirmText = () => {
    if (textPrompt && textValue.trim()) {
      setTexts((t) => [
        ...t,
        {
          id: crypto.randomUUID(),
          x: textPrompt.x,
          y: textPrompt.y,
          text: textValue,
          color,
          size: Math.max(14, weight * 5),
        },
      ]);
    }
    setTextPrompt(null);
    setTextValue("");
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setTexts([]);
    localStorage.removeItem("igv-canvas-image");
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // flatten with texts
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext("2d")!;
    // bg matches theme
    const isDark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDark ? "#0a0a0a" : "#ffffff";
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, 0);
    for (const t of texts) {
      ctx.fillStyle = t.color;
      ctx.font = `${t.size}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(t.text, t.x, t.y);
    }
    const link = document.createElement("a");
    link.download = "scratch.png";
    link.href = tmp.toDataURL();
    link.click();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/60 p-2">
        <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} title="Pen">
          <LuBrush size={14} />
        </ToolBtn>
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="Eraser">
          <LuEraser size={14} />
        </ToolBtn>
        <ToolBtn active={tool === "text"} onClick={() => setTool("text")} title="Add text">
          <LuType size={14} />
        </ToolBtn>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded-md border border-border bg-transparent"
            title="Color"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">size</span>
          <input
            type="range"
            min={1}
            max={40}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-24 cursor-pointer accent-primary"
          />
          <span className="w-5 text-right text-[10px] tabular-nums text-muted-foreground">
            {weight}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ToolBtn onClick={download} title="Download">
            <LuDownload size={14} />
          </ToolBtn>
          <ToolBtn onClick={clear} title="Clear">
            <LuTrash2 size={14} />
          </ToolBtn>
        </div>
      </div>
      <div ref={wrapRef} className="relative flex-1 bg-background">
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="absolute inset-0 touch-none"
          style={{ cursor: tool === "text" ? "text" : "crosshair" }}
        />
        {texts.map((t) => (
          <DraggableText
            key={t.id}
            item={t}
            bounds={size}
            onUpdate={(u) =>
              setTexts((all) => all.map((x) => (x.id === t.id ? { ...x, ...u } : x)))
            }
            onDelete={() => setTexts((all) => all.filter((x) => x.id !== t.id))}
          />
        ))}

        {textPrompt && (
          <div
            className="absolute inset-0 z-10 grid place-items-center bg-black/40 backdrop-blur-sm"
            onClick={() => setTextPrompt(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-[85%] max-w-sm animate-scale-in rounded-xl border border-border bg-popover p-4 shadow-2xl"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <LuType size={14} className="text-primary" />
                Add text
              </div>
              <textarea
                autoFocus
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    confirmText();
                  }
                  if (e.key === "Escape") setTextPrompt(null);
                }}
                placeholder="Type text…"
                className="min-h-[70px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setTextPrompt(null)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmText}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-border transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function DraggableText({
  item,
  bounds,
  onUpdate,
  onDelete,
}: {
  item: TextItem;
  bounds: { w: number; h: number };
  onUpdate: (u: Partial<TextItem>) => void;
  onDelete: () => void;
}) {
  const dragging = useRef<{ dx: number; dy: number } | null>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      onUpdate({
        x: Math.max(0, Math.min(bounds.w - 20, e.clientX + dragging.current.dx)),
        y: Math.max(0, Math.min(bounds.h - 10, e.clientY + dragging.current.dy)),
      });
    };
    const onUp = () => (dragging.current = null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [bounds, onUpdate]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        dragging.current = { dx: r.left - e.clientX, dy: r.top - e.clientY };
      }}
      className="absolute cursor-move select-none whitespace-pre"
      style={{ left: item.x, top: item.y, color: item.color, fontSize: item.size, lineHeight: 1 }}
    >
      {item.text}
      {hover && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -right-2 -top-2 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
        >
          <LuX size={10} />
        </button>
      )}
    </div>
  );
}

/* ============== Sticky Notes Tab ============== */

function NotesTab() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("igv-notes") ?? "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("igv-notes", JSON.stringify(notes));
  }, [notes]);

  const add = () =>
    setNotes((n) => [
      { id: crypto.randomUUID(), text: "", color: NOTE_COLORS[n.length % NOTE_COLORS.length] },
      ...n,
    ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border p-2">
        <span className="text-xs text-muted-foreground">{notes.length} notes</span>
        <button
          onClick={add}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <LuPlus size={12} />
          Add
        </button>
      </div>
      <div className="grid flex-1 auto-rows-min gap-3 overflow-auto p-3 sm:grid-cols-2">
        {notes.map((n) => (
          <div
            key={n.id}
            className="flex flex-col rounded-lg p-3 shadow-md"
            style={{ backgroundColor: n.color, color: "#111" }}
          >
            <textarea
              value={n.text}
              onChange={(e) =>
                setNotes((all) =>
                  all.map((x) => (x.id === n.id ? { ...x, text: e.target.value } : x)),
                )
              }
              placeholder="Write a note..."
              className="min-h-[80px] w-full resize-none bg-transparent text-sm outline-none placeholder-black/50"
            />
            <div className="mt-2 flex items-center gap-1">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    setNotes((all) => all.map((x) => (x.id === n.id ? { ...x, color: c } : x)))
                  }
                  className="h-4 w-4 cursor-pointer rounded-full border border-black/20"
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                onClick={() => setNotes((all) => all.filter((x) => x.id !== n.id))}
                className="ml-auto grid h-6 w-6 cursor-pointer place-items-center rounded-md text-black/60 hover:bg-black/10"
              >
                <LuTrash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="col-span-full grid place-items-center py-10 text-xs text-muted-foreground">
            No notes yet. Click Add to create one.
          </div>
        )}
      </div>
    </div>
  );
}
