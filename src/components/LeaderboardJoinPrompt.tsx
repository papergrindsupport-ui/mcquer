import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { LuTrophy, LuX, LuAtSign, LuShuffle, LuCheck } from "react-icons/lu";
import { getStats, subscribeStats } from "@/lib/mcq/stats";
import {
  checkUsernameAvailable,
  getLocalUser,
  joinLeaderboard,
  normalizeUsername,
  setLocalUser,
} from "@/lib/leaderboard/client";
import { buildAvatarUrl } from "@/components/Leaderboard";

const SHOWN_KEY = "igv-lb-prompt-shown-v1";
const DICEBEAR_STYLES = [
  "adventurer",
  "avataaars",
  "big-smile",
  "bottts",
  "fun-emoji",
  "lorelei",
  "micah",
  "notionists",
  "open-peeps",
  "personas",
  "pixel-art",
  "thumbs",
] as const;
const BG_PRESETS = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "a7f3d0", "fef08a", "fca5a5"];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}
function makeAvatar() {
  return {
    style: rand(DICEBEAR_STYLES),
    seed: randomSeed(),
    backgroundColor: rand(BG_PRESETS),
    radius: 50,
    scale: 100,
    flip: false,
    rotate: 0,
    translateX: 0,
    translateY: 0,
  };
}

export function LeaderboardJoinPrompt() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState(makeAvatar);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;
      if (localStorage.getItem(SHOWN_KEY) === "1") return;
      if (getLocalUser()) return;
      const path = router.state.location.pathname;
      if (path.startsWith("/leaderboard")) return;
      if (getStats().pencils >= 40) setOpen(true);
    };
    check();
    return subscribeStats(check);
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    try {
      localStorage.setItem(SHOWN_KEY, "1");
    } catch {}
    setOpen(false);
  }

  const avatarUrl = buildAvatarUrl(avatar);

  const validate = (raw: string): string | null => {
    const n = normalizeUsername(raw);
    if (!n) return "Enter a name.";
    if (n.length < 2) return "At least 2 characters.";
    if (n.length > 24) return "24 characters or fewer.";
    if (!/^[a-z0-9._-]+$/i.test(n)) return "Letters, numbers, . _ - only.";
    return null;
  };

  async function onJoin(e: React.FormEvent) {
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
      const pencils = getStats().pencils;
      const row = await joinLeaderboard({ username, avatar_url: avatarUrl, pencils });
      setLocalUser({ id: row.id, username: row.username, avatar_url: row.avatar_url });
      setJoined(true);
      try {
        localStorage.setItem(SHOWN_KEY, "1");
      } catch {}
      setTimeout(() => setOpen(false), 1400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not join.";
      setError(/duplicate|unique/i.test(msg) ? "That name is taken." : msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-fade-up"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LuX size={16} />
        </button>

        {joined ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
              <LuCheck size={26} />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">You joined the leaderboard!</h2>
            <p className="text-sm text-muted-foreground">
              Check it later from the homepage. Now continue solving…
            </p>
          </div>
        ) : (
          <div className="px-6 py-6 sm:px-8 sm:py-7">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <LuTrophy size={18} />
              <span className="text-xs font-semibold uppercase tracking-widest">Nice work</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              You're ready to join the leaderboard!
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Pick a name and avatar to claim your spot.
            </p>

            <div className="mt-5 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setAvatar(makeAvatar())}
                aria-label="Shuffle avatar"
                className="group relative cursor-pointer"
              >
                <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-border bg-background transition-transform group-hover:scale-105">
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    key={avatarUrl}
                  />
                </span>
                <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm group-hover:text-foreground">
                  <LuShuffle size={12} />
                </span>
              </button>
              <span className="text-xs text-muted-foreground">Tap avatar to shuffle</span>
            </div>

            <form onSubmit={onJoin} className="mt-5">
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
                  placeholder="your name"
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

            <button
              type="button"
              onClick={close}
              className="mt-4 w-full cursor-pointer text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Maybe later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
