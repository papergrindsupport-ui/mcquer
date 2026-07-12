import { createClient } from "@supabase/supabase-js";

// External Supabase project used only for the /leaderboard feature.
const SUPABASE_URL = "https://gypyzcqcgfixqnzuledx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1BffUfseIg3bAMRbekJ0tQ_Q1kZSC4G";

export const leaderboardSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type LeaderboardRow = {
  id: string;
  username: string;
  avatar_url: string;
  pencils: number;
  created_at: string;
};

const LS_USER = "igv-leaderboard-user-v1";
const LS_LOCK = "igv-leaderboard-lock-v1";

export type LocalUser = { id: string; username: string; avatar_url: string };

export function getLocalUser(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_USER);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

export function setLocalUser(u: LocalUser | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(LS_USER, JSON.stringify(u));
  else localStorage.removeItem(LS_USER);
}

export function isLocked(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_LOCK) === "1";
}

export function lockDevice() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_LOCK, "1");
}

export function normalizeUsername(v: string) {
  return v.trim().replace(/^@+/, "");
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await leaderboardSupabase
    .from("leaderboard")
    .select("id")
    .ilike("username", username)
    .limit(1);
  if (error) throw error;
  return !data || data.length === 0;
}

export async function joinLeaderboard(args: {
  username: string;
  avatar_url: string;
  pencils: number;
}): Promise<LeaderboardRow> {
  const { data, error } = await leaderboardSupabase
    .from("leaderboard")
    .insert({
      username: args.username,
      avatar_url: args.avatar_url,
      pencils: args.pencils,
    })
    .select()
    .single();
  if (error) throw error;
  return data as LeaderboardRow;
}

export async function updatePencils(id: string, pencils: number) {
  const { error } = await leaderboardSupabase.from("leaderboard").update({ pencils }).eq("id", id);
  if (error) throw error;
}

export async function leaveLeaderboard(id: string) {
  const { error } = await leaderboardSupabase.from("leaderboard").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await leaderboardSupabase
    .from("leaderboard")
    .select("*")
    .order("pencils", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}
