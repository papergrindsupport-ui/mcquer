import { useState } from "react";
import {
  LuX,
  LuChevronDown,
  LuSettings,
  LuDownload,
  LuArrowLeftRight,
  LuLoaderCircle,
} from "react-icons/lu";
import { useSettings, type SubmissionMode } from "@/lib/settings";
import { Collapse } from "@/components/Collapse";
import type { PaperQuestions, OptionId } from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import {
  downloadPaperPdf,
  type PaperExportMode,
} from "@/lib/mcq/paper-export";
import type { PrintSelections } from "@/components/mcq/PaperPrint";

export type PaperSettingsContext = {
  questions: PaperQuestions;
  storageKey: string;
  title: string;
  subtitle: string;
  filenameBase: string;
};

type Props = { open: boolean; onClose: () => void; paper?: PaperSettingsContext };

type SectionId = "submission" | "export" | "shift" | "timers" | "other";

function readSelection(storageKey: string, n: number): OptionId | null {
  try {
    const raw = localStorage.getItem(`${storageKey}-q${n}`);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v === "string" && OPTION_IDS.includes(v as OptionId)
      ? (v as OptionId)
      : null;
  } catch {
    return null;
  }
}

export function SettingsModal({ open, onClose, paper }: Props) {
  const { settings, update } = useSettings();
  const [openSection, setOpenSection] = useState<SectionId | null>("submission");

  // Export state
  const [exportMode, setExportMode] = useState<PaperExportMode>("dark");
  const [exportColored, setExportColored] = useState(true);
  const [exportAnswers, setExportAnswers] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Shift state
  const [shiftDir, setShiftDir] = useState<"left" | "right">("right");
  const [shiftAmount, setShiftAmount] = useState<1 | 2 | 3>(1);
  const [shiftConfirm, setShiftConfirm] = useState("");
  const [shiftMsg, setShiftMsg] = useState<string | null>(null);

  if (!open) return null;

  const toggleSection = (s: SectionId) =>
    setOpenSection((cur) => (cur === s ? null : s));

  const handleExport = async () => {
    if (!paper || exporting) return;
    setExporting(true);
    try {
      const selections: PrintSelections = {};
      for (const q of paper.questions) {
        selections[q.n] = readSelection(paper.storageKey, q.n);
      }
      await downloadPaperPdf({
        questions: paper.questions,
        title: paper.title,
        subtitle: paper.subtitle,
        filenameBase: `${paper.filenameBase}${exportAnswers ? "-answers" : ""}-${exportMode}${exportColored ? "" : "-bw"}`,
        selections,
        options: {
          mode: exportMode,
          colored: exportColored,
          includeAnswers: exportAnswers,
        },
      });
    } catch (e) {
      console.error("Paper export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const handleShift = () => {
    if (!paper || shiftConfirm.trim().toLowerCase() !== "yes shift") return;
    const delta = (shiftDir === "right" ? 1 : -1) * shiftAmount;
    let count = 0;
    for (const q of paper.questions) {
      const cur = readSelection(paper.storageKey, q.n);
      if (!cur) continue;
      const idx = OPTION_IDS.indexOf(cur);
      const next = OPTION_IDS[(((idx + delta) % 4) + 4) % 4];
      try {
        localStorage.setItem(`${paper.storageKey}-q${q.n}`, JSON.stringify(next));
        count++;
      } catch {}
    }
    try {
      window.dispatchEvent(new CustomEvent("igv:answers-shifted"));
    } catch {}
    setShiftConfirm("");
    setShiftMsg(
      count > 0
        ? `Shifted ${count} answer${count === 1 ? "" : "s"} ${shiftDir} by ${shiftAmount}.`
        : "No answers to shift yet.",
    );
    setTimeout(() => setShiftMsg(null), 4000);
  };

  const confirmOk = shiftConfirm.trim().toLowerCase() === "yes shift";

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="igv-settings-modal w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LuSettings size={16} className="text-primary" />
            Settings
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuX size={14} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <Section
            title="Submission mode"
            open={openSection === "submission"}
            onToggle={() => toggleSection("submission")}
          >
            <div className="space-y-2">
              <ModeRadio
                value="end"
                current={settings.submissionMode}
                onChange={(v) => update("submissionMode", v)}
                label="Submit paper at end"
                desc="No Check button per question. Submit the whole paper to mark all."
              />
              <ModeRadio
                value="per-question"
                current={settings.submissionMode}
                onChange={(v) => update("submissionMode", v)}
                label="Submit per question"
                desc="Check button after every question."
              />
              <ModeRadio
                value="instant"
                current={settings.submissionMode}
                onChange={(v) => update("submissionMode", v)}
                label="Instant marking"
                desc="Selecting an option immediately checks the answer."
              />
            </div>
          </Section>

          {paper && (
            <Section
              title="Export paper as PDF"
              open={openSection === "export"}
              onToggle={() => toggleSection("export")}
            >
              <div className="space-y-4">
                <SegRow label="Theme">
                  <Seg
                    active={exportMode === "dark"}
                    onClick={() => setExportMode("dark")}
                  >
                    Dark
                  </Seg>
                  <Seg
                    active={exportMode === "light"}
                    onClick={() => setExportMode("light")}
                  >
                    Light
                  </Seg>
                </SegRow>
                <SegRow label="Colour">
                  <Seg active={exportColored} onClick={() => setExportColored(true)}>
                    Colour
                  </Seg>
                  <Seg
                    active={!exportColored}
                    onClick={() => setExportColored(false)}
                  >
                    Black &amp; white
                  </Seg>
                </SegRow>
                <Toggle
                  label="Include my answers"
                  desc="Highlight the options you selected in the PDF."
                  value={exportAnswers}
                  onChange={setExportAnswers}
                />
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-70"
                >
                  {exporting ? (
                    <>
                      <LuLoaderCircle size={15} className="animate-spin" />
                      Building PDF…
                    </>
                  ) : (
                    <>
                      <LuDownload size={15} /> Download PDF
                    </>
                  )}
                </button>
                {exporting && (
                  <p className="text-center text-xs text-muted-foreground">
                    Rendering rich text, tables, graphs and images…
                  </p>
                )}
              </div>
            </Section>
          )}

          {paper && (
            <Section
              title="Shift my answers"
              open={openSection === "shift"}
              onToggle={() => toggleSection("shift")}
            >
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Move every selected answer to a different option. A → B → C → D
                  and wraps around.
                </p>
                <SegRow label="Direction">
                  <Seg
                    active={shiftDir === "left"}
                    onClick={() => setShiftDir("left")}
                  >
                    Left
                  </Seg>
                  <Seg
                    active={shiftDir === "right"}
                    onClick={() => setShiftDir("right")}
                  >
                    Right
                  </Seg>
                </SegRow>
                <SegRow label="By">
                  {([1, 2, 3] as const).map((a) => (
                    <Seg
                      key={a}
                      active={shiftAmount === a}
                      onClick={() => setShiftAmount(a)}
                    >
                      {a}
                    </Seg>
                  ))}
                </SegRow>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Type <span className="font-semibold text-foreground">yes shift</span> to confirm
                  </label>
                  <input
                    value={shiftConfirm}
                    onChange={(e) => setShiftConfirm(e.target.value)}
                    placeholder="yes shift"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={handleShift}
                  disabled={!confirmOk}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <LuArrowLeftRight size={15} /> Shift answers {shiftDir} by{" "}
                  {shiftAmount}
                </button>
                {shiftMsg && (
                  <p className="text-center text-xs font-medium text-primary">
                    {shiftMsg}
                  </p>
                )}
              </div>
            </Section>
          )}

          <Section
            title="Timers"
            open={openSection === "timers"}
            onToggle={() => toggleSection("timers")}
          >
            <div className="space-y-3">
              <Toggle
                label="Auto-submit when a timer ends"
                desc="If a timer runs out and submission mode is 'Submit at end', the paper is submitted automatically."
                value={settings.autoSubmitOnTimerEnd}
                onChange={(v) => update("autoSubmitOnTimerEnd", v)}
              />
            </div>
          </Section>


          <Section
            title="Other"
            open={openSection === "other"}
            onToggle={() => toggleSection("other")}
          >
            <div className="space-y-3">
              <Toggle
                label="Result icons"
                desc="Show check / cross / user icons after checking."
                value={settings.showResultIcons}
                onChange={(v) => update("showResultIcons", v)}
              />
              <Toggle
                label="Eliminator"
                desc="Add a minus button on each option to grey it out."
                value={settings.eliminator}
                onChange={(v) => update("eliminator", v)}
              />
              <Toggle
                label="Higher contrast (dark mode)"
                desc="Lift cards, popovers and borders above pure black in dark mode."
                value={settings.highContrast}
                onChange={(v) => update("highContrast", v)}
              />
              <Toggle
                label="Reduced motion"
                desc="Remove animations across the site."
                value={settings.reducedMotion}
                onChange={(v) => update("reducedMotion", v)}
              />
              <Toggle
                label="Remove tools button"
                desc="Hide the circular tools menu trigger."
                value={settings.hideTools}
                onChange={(v) => update("hideTools", v)}
              />
              <Toggle
                label="Hide bookmark button"
                desc="Hide the bookmark / mark-for-review button on each question."
                value={settings.hideBookmarkButton}
                onChange={(v) => update("hideBookmarkButton", v)}
              />
              <Toggle
                label="Show navigation strip"
                desc="Sticky collapsible strip of question circles that jump you to any question."
                value={settings.showNavStrip}
                onChange={(v) => update("showNavStrip", v)}
              />
              {settings.showNavStrip && (
                <div className="pl-1">
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Strip position
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["right", "left", "top", "bottom"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => update("navStripPosition", p)}
                        className={`cursor-pointer rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                          settings.navStripPosition === p
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/40"
      >
        <span>{title}</span>
        <LuChevronDown
          size={14}
          className={`transition-transform duration-300 ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      <Collapse open={open}>
        <div className="px-4 pb-4">{children}</div>
      </Collapse>
    </div>
  );
}

function SegRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 cursor-pointer rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function ModeRadio({
  value,
  current,
  onChange,
  label,
  desc,
}: {
  value: SubmissionMode;
  current: SubmissionMode;
  onChange: (v: SubmissionMode) => void;
  label: string;
  desc: string;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onChange(value)}
      className={`w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:bg-accent/40"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span
          className={`grid h-4 w-4 place-items-center rounded-full border-2 ${
            active ? "border-primary" : "border-border"
          }`}
        >
          {active && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        {label}
      </div>
      <p className="mt-1 pl-6 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
          value ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
