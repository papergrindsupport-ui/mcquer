import type { SubjectId, SessionId } from "@/lib/papers-data";
import { cellKey } from "@/lib/mcq/planner";

export type PlannerPin = {
  id: string;
  dateISO: string; // yyyy-mm-dd (target date, treated as local end-of-day)
  createdAt: number;
};

export type PinMap = Record<string, PlannerPin>; // key = cellKey(y,s,v)

const KEY = (subj: SubjectId) => `igv-planner-pins-${subj}-v1`;
const EVT = "igv:planner-pins-changed";

export function loadPins(subj: SubjectId): PinMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY(subj));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePins(subj: SubjectId, m: PinMap) {
  try {
    localStorage.setItem(KEY(subj), JSON.stringify(m));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function subscribePins(cb: () => void) {
  const wrap = () => cb();
  window.addEventListener(EVT, wrap);
  window.addEventListener("storage", wrap);
  return () => {
    window.removeEventListener(EVT, wrap);
    window.removeEventListener("storage", wrap);
  };
}

export function pinKeyFor(year: number, session: SessionId, variant: string) {
  return cellKey(year, session, variant);
}

/** Parse yyyy-mm-dd as local midnight, return end-of-day timestamp (23:59:59). */
export function pinTargetTs(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999).getTime();
}

export type PinBucket = "past" | "today" | "soon" | "future";

/** soon = <= 24h remaining but not past. today = same calendar day. */
export function pinBucket(dateISO: string, now = Date.now()): PinBucket {
  const target = pinTargetTs(dateISO);
  const nowDate = new Date(now);
  const [y, m, d] = dateISO.split("-").map(Number);
  const isSameDay =
    nowDate.getFullYear() === y &&
    nowDate.getMonth() === (m ?? 1) - 1 &&
    nowDate.getDate() === (d ?? 1);
  if (isSameDay) return "today";
  if (target < now) return "past";
  if (target - now <= 24 * 3600 * 1000) return "soon";
  return "future";
}

/** Short delta shortcut. Uses the *largest* nonzero unit, following user's rule. */
export function pinDeltaShort(dateISO: string, now = Date.now()): string {
  const target = pinTargetTs(dateISO);
  let ms = target - now;
  const past = ms < 0;
  ms = Math.abs(ms);
  const MIN = 60_000, HR = 3600_000, DAY = 86_400_000;
  const WK = 7 * DAY, MO = 30 * DAY, YR = 365 * DAY;

  let out: string;
  if (ms < MIN) out = "now";
  else if (ms >= YR) out = `${Math.floor(ms / YR)}y`;
  else if (ms >= MO) out = `${Math.floor(ms / MO)}mos`;
  else if (ms >= WK) {
    const w = Math.floor(ms / WK);
    const d = Math.floor((ms - w * WK) / DAY);
    out = d > 0 ? `${w}w${d}d` : `${w}w`;
  } else if (ms >= DAY) out = `${Math.floor(ms / DAY)}d`;
  else if (ms >= HR) out = `${Math.floor(ms / HR)}h`;
  else out = `${Math.floor(ms / MIN)}m`;
  return past ? `-${out}` : out;
}

/** Verbose remaining text for modal. */
export function pinRemainingVerbose(dateISO: string, now = Date.now()): string {
  const target = pinTargetTs(dateISO);
  let ms = target - now;
  const past = ms < 0;
  ms = Math.abs(ms);
  const DAY = 86_400_000, HR = 3600_000, MIN = 60_000;
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms - d * DAY) / HR);
  const m = Math.floor((ms - d * DAY - h * HR) / MIN);
  const parts: string[] = [];
  if (d) parts.push(`${d} day${d === 1 ? "" : "s"}`);
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m || parts.length === 0) parts.push(`${m} min${m === 1 ? "" : "s"}`);
  const txt = parts.join(", ");
  return past ? `${txt} ago` : `in ${txt}`;
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
