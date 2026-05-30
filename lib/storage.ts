// lib/storage.ts — localStorage helpers for session, leaderboard, submissions

export interface Session {
  username: string;
  role: 'student' | 'admin';
}

export interface LBEntry {
  username: string;
  accuracy: number;
  macroF1: number;
  nodeCount: number;
  submittedAt: number;
}

export interface Submission extends LBEntry {
  mode: 'practice' | 'final';
  treeJson: string;
}

// ── session ───────────────────────────────────────────────────────────────────
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(sessionStorage.getItem('caggle.session') ?? 'null'); } catch { return null; }
}

export function setSession(s: Session) {
  sessionStorage.setItem('caggle.session', JSON.stringify(s));
}

export function clearSession() {
  sessionStorage.removeItem('caggle.session');
}

// ── users (client-side auth — username only, no password) ────────────────────
export interface UserRecord { role: 'student' | 'admin'; teamName?: string }

export function getUsers(): Record<string, UserRecord> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('caggle.users') ?? '{}'); } catch { return {}; }
}

export function saveUsers(users: Record<string, UserRecord>) {
  localStorage.setItem('caggle.users', JSON.stringify(users));
}

export function updateTeamName(username: string, teamName: string) {
  const users = getUsers();
  if (users[username]) {
    users[username].teamName = teamName.trim();
    saveUsers(users);
  }
}

// Initial student roster (name → optional pre-assigned team)
const INITIAL_STUDENTS: [string, string?][] = [
  ['김주아'],    ['이하민'],
  ['최이안', '패트와 매너'], ['이강이', '패트와 매너'],
  ['김주하'],    ['송윤진'],
  ['김지오'],    ['임유안'],
  ['안창익', '덤앤더머'],   ['조성하', '덤앤더머'],
  ['이승아', '토끼'],
  ['김도현', '김'],
  ['김지후'],    ['한준우'],
  ['공민성'],    ['유시아'],
  ['뢰이선'],    ['소아현'],
  ['윤수연'],
  ['안영석'],
];

export function seedAdmin() {
  const users = getUsers();
  let changed = false;
  if (!users['admin']) {
    users['admin'] = { role: 'admin' };
    changed = true;
  }
  INITIAL_STUDENTS.forEach(([name, team]) => {
    if (!users[name]) {
      // 신규 사용자: 초기 팀명 포함해서 생성
      users[name] = { role: 'student', ...(team ? { teamName: team } : {}) };
      changed = true;
    } else if (team && users[name].teamName === undefined) {
      // 기존 사용자인데 팀명이 아직 없으면 초기값 적용
      users[name].teamName = team;
      changed = true;
    }
  });
  if (changed) saveUsers(users);
}

// ── leaderboard ───────────────────────────────────────────────────────────────
export function getLBEntries(): LBEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('caggle.leaderboard') ?? '[]'); } catch { return []; }
}

export function saveLBEntry(entry: LBEntry) {
  const entries = getLBEntries();
  const idx = entries.findIndex(e => e.username === entry.username);
  if (idx >= 0) {
    const existing = entries[idx];
    const better = entry.accuracy > existing.accuracy ||
      (entry.accuracy === existing.accuracy && entry.nodeCount < existing.nodeCount);
    if (better) entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  entries.sort((a, b) =>
    b.accuracy - a.accuracy || a.nodeCount - b.nodeCount || a.submittedAt - b.submittedAt
  );
  localStorage.setItem('caggle.leaderboard', JSON.stringify(entries));
}

// ── per-user exam submissions ─────────────────────────────────────────────────
export function getMyExamSubs(username: string): Submission[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(`caggle.exam.${username}`) ?? '[]'); } catch { return []; }
}

export function addExamSub(username: string, sub: Submission) {
  const subs = getMyExamSubs(username);
  subs.push(sub);
  localStorage.setItem(`caggle.exam.${username}`, JSON.stringify(subs));
}

// ── all submissions (admin) ───────────────────────────────────────────────────
export function getAllSubmissions(): Submission[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('caggle.allSubmissions') ?? '[]'); } catch { return []; }
}

export function saveSubmission(sub: Submission & { username: string }) {
  const all = getAllSubmissions();
  all.unshift(sub as Submission);
  localStorage.setItem('caggle.allSubmissions', JSON.stringify(all.slice(0, 500)));
}
