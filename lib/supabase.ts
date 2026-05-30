import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ── DB 타입 ───────────────────────────────────────────────────────────────────
export interface DbAttempt {
  id?: string;
  username: string;
  mode: 'practice' | 'final';
  tree_json: string;
  node_count: number;
  accuracy: number;
  macro_f1: number;
  submitted_at?: string;
}

export interface LeaderboardRow {
  username: string;
  accuracy: number;
  macro_f1: number;
  node_count: number;
  submitted_at: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────
export async function insertAttempt(a: Omit<DbAttempt, 'id' | 'submitted_at'>) {
  return supabase.from('attempts').insert(a);
}

export async function getSubmitCount(username: string): Promise<number> {
  const { count } = await supabase
    .from('attempts')
    .select('*', { count: 'exact', head: true })
    .eq('username', username)
    .eq('mode', 'final');
  return count ?? 0;
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data } = await supabase
    .from('attempts')
    .select('username, accuracy, macro_f1, node_count, submitted_at')
    .eq('mode', 'final')
    .order('accuracy', { ascending: false })
    .order('node_count', { ascending: true });

  if (!data) return [];

  // 사용자당 최고 점수 1행
  const best: Record<string, LeaderboardRow> = {};
  data.forEach(row => {
    const ex = best[row.username];
    if (!ex || row.accuracy > ex.accuracy ||
        (row.accuracy === ex.accuracy && row.node_count < ex.node_count)) {
      best[row.username] = row as LeaderboardRow;
    }
  });

  return Object.values(best).sort((a, b) =>
    b.accuracy - a.accuracy || a.node_count - b.node_count
  );
}

// ── 프로필 (팀명) ──────────────────────────────────────────────────────────────
export async function upsertProfile(username: string, teamName: string) {
  return supabase.from('profiles').upsert({
    username,
    team_name: teamName,
    updated_at: new Date().toISOString(),
  });
}

export async function getProfiles(): Promise<Record<string, string>> {
  const { data } = await supabase.from('profiles').select('username, team_name');
  const map: Record<string, string> = {};
  (data ?? []).forEach(r => { map[r.username] = r.team_name ?? ''; });
  return map;
}

// ── 시험 세션 ─────────────────────────────────────────────────────────────────
export interface ExamSession {
  id: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export async function getExamSession(): Promise<ExamSession | null> {
  const { data } = await supabase.from('exam_sessions').select('*').eq('id', 1).single();
  return data as ExamSession | null;
}

export async function startExamSession(durationMinutes: number) {
  const now = new Date();
  const ends = new Date(now.getTime() + durationMinutes * 60 * 1000);
  return supabase.from('exam_sessions').upsert({
    id: 1,
    starts_at: now.toISOString(),
    ends_at: ends.toISOString(),
    is_active: true,
  });
}

export async function stopExamSession() {
  return supabase.from('exam_sessions').update({ is_active: false }).eq('id', 1);
}

export async function fetchAllAttempts(): Promise<(DbAttempt & { id: string })[]> {
  const { data } = await supabase
    .from('attempts')
    .select('*')
    .order('submitted_at', { ascending: false });
  return (data ?? []) as (DbAttempt & { id: string })[];
}
