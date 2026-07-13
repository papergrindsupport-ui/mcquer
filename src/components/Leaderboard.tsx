import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  LuTrophy,
  LuShuffle,
  LuX,
  LuCheck,
  LuAtSign,
  LuChevronDown,
  LuChevronUp,
  LuLogOut,
  LuArrowRight,
  LuPencil,
} from "react-icons/lu";
import { getStats, subscribeStats } from "@/lib/mcq/stats";
import { Collapse } from "@/components/Collapse";
import { ConfirmModal } from "@/components/ConfirmModal";

import {
  checkUsernameAvailable,
  fetchLeaderboard,
  getLocalUser,
  joinLeaderboard,
  leaveLeaderboard,
  normalizeUsername,
  setLocalUser,
  updateAvatarUrl,
  updatePencils,
  type LeaderboardRow,
  type LocalUser,
} from "@/lib/leaderboard/client";

const DICEBEAR_STYLES = [
  "adventurer",
  "adventurer-neutral",
  "avataaars",
  "avataaars-neutral",
  "big-ears",
  "big-ears-neutral",
  "big-smile",
  "bottts",
  "bottts-neutral",
  "croodles",
  "croodles-neutral",
  "fun-emoji",
  "icons",
  "identicon",
  "initials",
  "lorelei",
  "lorelei-neutral",
  "micah",
  "miniavs",
  "notionists",
  "notionists-neutral",
  "open-peeps",
  "personas",
  "pixel-art",
  "pixel-art-neutral",
  "shapes",
  "thumbs",
] as const;
type DicebearStyle = (typeof DICEBEAR_STYLES)[number];

type AvatarCfg = {
  style: DicebearStyle;
  seed: string;
  backgroundColor: string;
  radius: number;
  scale: number;
  flip: boolean;
  rotate: number;
  translateX: number;
  translateY: number;
};

const BG_PRESETS = [
  "transparent",
  "b6e3f4",
  "c0aede",
  "d1d4f9",
  "ffd5dc",
  "ffdfbf",
  "a7f3d0",
  "fef08a",
  "fca5a5",
  "e9d5ff",
  "111827",
  "f3f4f6",
];

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function randomStyle(): DicebearStyle {
  return DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];
}

export function buildAvatarUrl(cfg: AvatarCfg) {
  const params = new URLSearchParams();
  params.set("seed", cfg.seed || "guest");
  if (cfg.backgroundColor && cfg.backgroundColor !== "transparent") {
    params.set("backgroundColor", cfg.backgroundColor);
  } else {
    params.set("backgroundType", "solid");
  }
  params.set("radius", String(cfg.radius));
  params.set("scale", String(cfg.scale));
  if (cfg.flip) params.set("flip", "true");
  if (cfg.rotate) params.set("rotate", String(cfg.rotate));
  if (cfg.translateX) params.set("translateX", String(cfg.translateX));
  if (cfg.translateY) params.set("translateY", String(cfg.translateY));
  return `https://api.dicebear.com/9.x/${cfg.style}/svg?${params.toString()}`;
}

function usePencils() {
  const [p, setP] = useState<number>(() =>
    typeof window === "undefined" ? 0 : getStats().pencils,
  );
  useEffect(() => {
    const upd = () => setP(getStats().pencils);
    upd();
    return subscribeStats(upd);
  }, []);
  return p;
}

export function LeaderboardSection() {
  const pencils = usePencils();
  const [collapsed, setCollapsed] = useState(false);
  const [avatar, setAvatar] = useState<AvatarCfg>(() => ({
    style: randomStyle(),
    seed: randomSeed(),
    backgroundColor: BG_PRESETS[1 + Math.floor(Math.random() * (BG_PRESETS.length - 2))],
    radius: 50,
    scale: 100,
    flip: false,
    rotate: 0,
    translateX: 0,
    translateY: 0,
  }));
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [me, setMe] = useState<LocalUser | null>(null);
  useEffect(() => {
    if (!me) return;
    let alive = true;
    const load = () => {
      fetchLeaderboard()
        .then((r) => alive && setRows(r))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [me]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setMe(getLocalUser());
  }, []);

  // Keep server pencils in sync with local stats.
  useEffect(() => {
    if (!me) return;
    updatePencils(me.id, pencils).catch(() => {});
  }, [pencils, me]);
  if (pencils < 40) return null;

  const avatarUrl = buildAvatarUrl(avatar);

  const validate = (raw: string): string | null => {
    const n = normalizeUsername(raw);
    if (!n) return "Enter a name.";
    if (n.length < 2) return "At least 2 characters.";
    if (n.length > 24) return "24 characters or fewer.";
    if (!/^[a-z0-9._-]+$/i.test(n)) return "Letters, numbers, . _ - only.";
    return null;
  };

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(name);
    if (err) {
      setError(err);
      inputRef.current?.focus();
      return;
    }
    const username = normalizeUsername(name);
    setSubmitting(true);
    setError(null);
    try {
      const available = await checkUsernameAvailable(username);
      if (!available) {
        setError("That name is taken.");
        setSubmitting(false);
        return;
      }
      const row = await joinLeaderboard({
        username,
        avatar_url: avatarUrl,
        pencils,
      });
      const local: LocalUser = {
        id: row.id,
        username: row.username,
        avatar_url: row.avatar_url,
      };
      setLocalUser(local);
      setMe(local);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not join.";
      setError(/duplicate|unique/i.test(msg) ? "That name is taken." : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onLeave = async () => {
    if (!me) return;
    try {
      await leaveLeaderboard(me.id);
    } catch {
      // swallow — proceed to clear locally regardless
    }
    setLocalUser(null);
    setMe(null);
    setRows(null);
    setConfirmLeave(false);
  };

  // Fetch mini leaderboard when user is joined.

  return (
    <section id="leaderboard" className="mt-16 animate-fade-up scroll-mt-24">
      <div className="flex items-baseline gap-3 sm:gap-4">
        <span className="text-xs font-mono text-muted-foreground">★</span>
        <div className="h-px flex-1 bg-border" />
        <h2 className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-3xl">
          <LuTrophy className="text-primary" /> Leaderboard
        </h2>
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand leaderboard" : "Collapse leaderboard"}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {collapsed ? <LuChevronDown size={14} /> : <LuChevronUp size={14} />}
        </button>
      </div>

      <Collapse open={!collapsed}>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
          {me ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <button
                  type="button"
                  onClick={() => {
                    // seed customizer draft from current URL isn't trivial; just open with current cfg
                    setCustomizerOpen(true);
                  }}
                  aria-label="Change avatar"
                  className="group relative shrink-0 cursor-pointer"
                >
                  <img
                    src={me.avatar_url}
                    alt=""
                    className="h-20 w-20 rounded-full border border-border bg-background object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm group-hover:text-foreground">
                    <LuPencil size={12} />
                  </span>
                </button>
                <div className="flex-1">
                  <div className="text-lg font-semibold tracking-tight">@{me.username}</div>
                  <div className="text-sm text-muted-foreground">
                    <span className="tabular-nums text-foreground">{pencils}</span> pencils
                    {rows &&
                      (() => {
                        const idx = rows.findIndex((r) => r.id === me.id);
                        return idx >= 0 ? (
                          <span className="ml-2">
                            · Rank <span className="tabular-nums text-foreground">#{idx + 1}</span>{" "}
                            of {rows.length}
                          </span>
                        ) : null;
                      })()}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link
                    to="/leaderboard"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    View leaderboard <LuArrowRight size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <LuLogOut size={14} /> Leave
                  </button>
                </div>
              </div>

              <MiniLeaderboard rows={rows} meId={me.id} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 text-center">
              <button
                type="button"
                onClick={() => setCustomizerOpen(true)}
                aria-label="Customize avatar"
                className="group cursor-pointer"
              >
                <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-border bg-background transition-transform group-hover:scale-105 sm:h-28 sm:w-28">
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    key={avatarUrl}
                  />
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">Click to customize</span>
              </button>

              <form onSubmit={onJoin} className="w-full max-w-md">
                <div
                  className={`relative rounded-xl border bg-background transition-colors ${
                    error ? "border-destructive" : "border-border focus-within:border-primary"
                  }`}
                >
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <LuAtSign size={16} />
                  </span>
                  <input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value.replace(/^@+/, ""));
                      if (error) setError(null);
                    }}
                    aria-label="Username"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={24}
                    className="w-full bg-transparent px-10 py-3 text-center text-base outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Joining..." : "Join"}
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              </form>
            </div>
          )}
        </div>
      </Collapse>

      {customizerOpen && (
        <AvatarCustomizer
          value={avatar}
          onChange={(next) => {
            setAvatar(next);
            if (me) {
              const url = buildAvatarUrl(next);
              const updated = { ...me, avatar_url: url };
              setLocalUser(updated);
              setMe(updated);
              updateAvatarUrl(me.id, url).catch(() => {});
              setRows((r) =>
                r ? r.map((row) => (row.id === me.id ? { ...row, avatar_url: url } : row)) : r,
              );
            }
          }}
          onClose={() => setCustomizerOpen(false)}
        />
      )}

      <ConfirmModal
        open={confirmLeave}
        title="Leave the leaderboard?"
        description="Your entry will be deleted. You can rejoin anytime with a new name."
        confirmLabel="Leave"
        danger
        requireType="leave"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={onLeave}
      />
    </section>
  );
}

function MiniLeaderboard({ rows, meId }: { rows: LeaderboardRow[] | null; meId: string }) {
  if (!rows) {
    return (
      <div className="rounded-xl border border-border bg-background p-4 text-center text-xs text-muted-foreground">
        Loading top players…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-background p-4 text-center text-xs text-muted-foreground">
        No players yet.
      </div>
    );
  }
  const top = rows.slice(0, 5);
  const meIdx = rows.findIndex((r) => r.id === meId);
  const meIncluded = meIdx >= 0 && meIdx < top.length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Top players
        </div>
        <Link to="/leaderboard" className="text-xs font-medium text-primary hover:underline">
          See all
        </Link>
      </div>
      <ol className="divide-y divide-border">
        {top.map((r, i) => (
          <MiniRow key={r.id} row={r} rank={i + 1} isMe={r.id === meId} />
        ))}
        {!meIncluded && meIdx >= 0 && (
          <>
            <li className="px-4 py-1 text-center text-xs text-muted-foreground">…</li>
            <MiniRow row={rows[meIdx]} rank={meIdx + 1} isMe />
          </>
        )}
      </ol>
    </div>
  );
}

function MiniRow({ row, rank, isMe }: { row: LeaderboardRow; rank: number; isMe: boolean }) {
  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? "bg-primary/5" : ""}`}>
      <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
        {rank}
      </span>
      <img
        src={row.avatar_url}
        alt=""
        className="h-8 w-8 rounded-full border border-border bg-background object-cover"
      />
      <div className="min-w-0 flex-1 truncate text-sm font-medium">
        @{row.username}
        {isMe && (
          <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            You
          </span>
        )}
      </div>
      <div className="tabular-nums text-sm font-semibold">{row.pencils}</div>
    </li>
  );
}

function AvatarCustomizer({
  value,
  onChange,
  onClose,
}: {
  value: AvatarCfg;
  onChange: (v: AvatarCfg) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AvatarCfg>(value);
  const url = useMemo(() => buildAvatarUrl(draft), [draft]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = (p: Partial<AvatarCfg>) => setDraft((d) => ({ ...d, ...p }));

  const previewSeeds = useMemo(
    () => Array.from({ length: 8 }, () => randomSeed()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.style],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="text-sm font-semibold">Customize avatar</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuX size={16} />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center gap-4 border-b border-border bg-background p-6 md:border-b-0 md:border-r">
            <span className="grid h-40 w-40 place-items-center overflow-hidden rounded-full border border-border bg-background">
              <img src={url} alt="" className="h-full w-full object-cover" />
            </span>
            <div className="w-full space-y-2">
              <button
                onClick={() => patch({ seed: randomSeed() })}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                <LuShuffle size={14} /> Randomize
              </button>
              <button
                onClick={() => {
                  onChange(draft);
                  onClose();
                }}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <LuCheck size={14} /> Use
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <Section title="Style">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {DICEBEAR_STYLES.map((s) => {
                  const active = draft.style === s;
                  return (
                    <button
                      key={s}
                      onClick={() => patch({ style: s })}
                      className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={buildAvatarUrl({ ...draft, style: s })}
                        alt=""
                        className="h-12 w-12 rounded-md object-cover"
                        loading="lazy"
                      />
                      <span className="w-full truncate text-[10px] font-medium text-muted-foreground">
                        {s}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Seeds">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {previewSeeds.map((seed) => (
                  <button
                    key={seed}
                    onClick={() => patch({ seed })}
                    className={`cursor-pointer overflow-hidden rounded-lg border ${
                      draft.seed === seed
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={buildAvatarUrl({ ...draft, seed })}
                      alt=""
                      className="h-14 w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Background">
              <div className="flex flex-wrap gap-2">
                {BG_PRESETS.map((c) => {
                  const active = draft.backgroundColor === c;
                  const transparent = c === "transparent";
                  return (
                    <button
                      key={c}
                      onClick={() => patch({ backgroundColor: c })}
                      title={c}
                      className={`h-8 w-8 cursor-pointer rounded-full border transition-transform hover:scale-110 ${
                        active ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""
                      }`}
                      style={{
                        backgroundColor: transparent ? undefined : `#${c}`,
                        backgroundImage: transparent
                          ? "conic-gradient(from 0deg,#ddd 0 25%,#fff 0 50%,#ddd 0 75%,#fff 0)"
                          : undefined,
                        backgroundSize: transparent ? "10px 10px" : undefined,
                        borderColor: "hsl(var(--border))",
                      }}
                    />
                  );
                })}
              </div>
            </Section>

            <Section title="Shape & size">
              <Slider
                label="Radius"
                value={draft.radius}
                min={0}
                max={50}
                onChange={(v) => patch({ radius: v })}
              />
              <Slider
                label="Scale"
                value={draft.scale}
                min={50}
                max={200}
                onChange={(v) => patch({ scale: v })}
              />
              <Slider
                label="Rotate"
                value={draft.rotate}
                min={0}
                max={360}
                onChange={(v) => patch({ rotate: v })}
              />
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.flip}
                  onChange={(e) => patch({ flip: e.target.checked })}
                  className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]"
                />
                Flip horizontally
              </label>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-[hsl(var(--primary))]"
      />
    </div>
  );
}
