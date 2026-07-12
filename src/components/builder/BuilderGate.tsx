import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LuLock, LuTriangleAlert } from "react-icons/lu";

const PASSWORD_HASH = "bde08528a1bf98cf3cabefe8f29ecec33123392503f60e8cb082eff38aab6c6c";
const UNLOCK_KEY = "builder:unlocked:v1";
const BLOCK_KEY = "builder:blocked:v1";
const ATTEMPTS_KEY = "builder:attempts:v1";
const MAX_ATTEMPTS = 3;
const REDIRECT_SECS = 10;

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time hex string compare.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function BuilderGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(BLOCK_KEY) === "1") setBlocked(true);
      else if (localStorage.getItem(UNLOCK_KEY) === "1") setUnlocked(true);
      const a = parseInt(localStorage.getItem(ATTEMPTS_KEY) ?? "0", 10);
      if (!Number.isNaN(a)) setAttempts(a);
    } catch {}
    setReady(true);
  }, []);

  const startRedirect = () => {
    setCountdown(REDIRECT_SECS);
    const tick = () => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          navigate({ to: "/" });
          return 0;
        }
        return c - 1;
      });
    };
    timerRef.current = window.setInterval(tick, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked || busy || countdown !== null) return;
    setBusy(true);
    setError(null);
    const hash = await sha256Hex(pw);
    const ok = safeEqual(hash, PASSWORD_HASH);
    if (ok) {
      try {
        localStorage.setItem(UNLOCK_KEY, "1");
        localStorage.removeItem(ATTEMPTS_KEY);
      } catch {}
      setUnlocked(true);
      setBusy(false);
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    try {
      localStorage.setItem(ATTEMPTS_KEY, String(next));
    } catch {}
    setPw("");
    if (next >= MAX_ATTEMPTS) {
      try {
        localStorage.setItem(BLOCK_KEY, "1");
      } catch {}
      setBlocked(true);
      setError("Too many failed attempts. Access permanently blocked on this device.");
      startRedirect();
    } else {
      const left = MAX_ATTEMPTS - next;
      setError(
        `Incorrect password. ${left} attempt${left === 1 ? "" : "s"} remaining. Redirecting to homepage…`,
      );
      startRedirect();
    }
    setBusy(false);
  };

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center p-6">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`grid h-11 w-11 place-items-center rounded-xl ${
              blocked ? "bg-red-500/15 text-red-500" : "bg-primary/15 text-primary"
            }`}
          >
            {blocked ? <LuTriangleAlert size={20} /> : <LuLock size={20} />}
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              {blocked ? "Access blocked" : "Paper Builder is locked"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {blocked
                ? "This device can no longer access the builder."
                : "Enter the password to continue."}
            </p>
          </div>
        </div>

        {!blocked && (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              disabled={busy || countdown !== null}
              autoFocus
              autoComplete="current-password"
              placeholder="Password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || countdown !== null || pw.length === 0}
              className="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Unlock
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        {countdown !== null && (
          <p className="mt-2 text-xs text-muted-foreground">
            Redirecting to homepage in {countdown}s…
          </p>
        )}
        {!blocked && attempts > 0 && countdown === null && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? "" : "s"} remaining
            before permanent block.
          </p>
        )}
      </div>
    </div>
  );
}
