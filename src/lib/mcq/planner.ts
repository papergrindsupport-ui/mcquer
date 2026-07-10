import type { SubjectId, SessionId } from "@/lib/papers-data";
import { SUBJECTS, getSessionsFor, getVariantsFor } from "@/lib/papers-data";

export type LayoutId = "L1" | "L2" | "L3" | "L4" | "L5";

export type PlannerSettings = {
  sessions: SessionId[];
  variantsBySession: Record<SessionId, string[]>;
  years: number[];
  layout: LayoutId;
};

const ALL_SESSIONS: SessionId[] = ["feb", "june", "oct"];

export const LAYOUTS: { id: LayoutId; label: string; desc: string }[] = [
  { id: "L1", label: "Sessions × Years", desc: "Session rows · variant subrows · year columns" },
  { id: "L2", label: "Years × Sessions", desc: "Year rows · session columns · variant subcolumns" },
  { id: "L3", label: "Sessions × Years (var subcols)", desc: "Session rows · year columns · variant subcolumns" },
  { id: "L4", label: "Years × Variants", desc: "Year rows · session subrows · variant columns" },
  { id: "L5", label: "Variants × Years", desc: "Variant rows · year columns · session subcolumns" },
];

function allYears(): number[] {
  const set = new Set<number>();
  for (const s of SUBJECTS) s.years.forEach((y) => set.add(y));
  return [...set].sort((a, b) => a - b);
}

export function defaultSettings(): PlannerSettings {
  return {
    sessions: [...ALL_SESSIONS],
    variantsBySession: {
      feb: ["V2"],
      june: ["V1", "V2", "V3"],
      oct: ["V1", "V2", "V3"],
    },
    years: allYears(),
    layout: "L1",
  };
}

const SETTINGS_KEY = (subj: SubjectId) => `igv-planner-settings-${subj}-v1`;
const CHECKS_KEY = (subj: SubjectId) => `igv-planner-checks-${subj}-v1`;
const EVT = "igv:planner-changed";

export function loadSettings(subj: SubjectId): PlannerSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY(subj));
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    return { ...defaultSettings(), ...parsed };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(subj: SubjectId, s: PlannerSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY(subj), JSON.stringify(s));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

/** Per-cell explicit state: "checked" (user confirmed) or "unchecked" (user dismissed auto). */
export type CellState = "checked" | "unchecked";

export function loadChecks(subj: SubjectId): Record<string, CellState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CHECKS_KEY(subj));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveChecks(subj: SubjectId, m: Record<string, CellState>) {
  try {
    localStorage.setItem(CHECKS_KEY(subj), JSON.stringify(m));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function cellKey(year: number, session: SessionId, variant: string) {
  return `${year}-${session}-${variant}`;
}

export function subscribePlanner(cb: () => void) {
  const wrap = () => cb();
  window.addEventListener(EVT, wrap);
  window.addEventListener("storage", wrap);
  return () => {
    window.removeEventListener(EVT, wrap);
    window.removeEventListener("storage", wrap);
  };
}

/** Returns the list of (year, session, variant) triples that exist for a subject
 *  under the given settings. */
export function enabledTriples(subj: SubjectId, s: PlannerSettings) {
  const subj_years = new Set(SUBJECTS.find((x) => x.id === subj)!.years);
  const out: { year: number; session: SessionId; variant: string }[] = [];
  for (const y of s.years) {
    if (!subj_years.has(y)) continue;
    const avail = getSessionsFor(subj, y);
    for (const sess of s.sessions) {
      if (!avail.includes(sess)) continue;
      const vAvail = getVariantsFor(sess);
      const chosen = s.variantsBySession[sess] ?? [];
      for (const v of chosen) {
        if (!vAvail.includes(v)) continue;
        out.push({ year: y, session: sess, variant: v });
      }
    }
  }
  return out;
}
