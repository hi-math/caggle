'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { getSession, getUsers } from '@/lib/storage';
import { supabase, fetchLeaderboard, fetchAllAttempts, getExamSession, startExamSession, stopExamSession, getProfiles } from '@/lib/supabase';
import type { LeaderboardRow, DbAttempt, ExamSession } from '@/lib/supabase';

interface Row {
  username: string;
  teamName: string;
  bestAccuracy: number | null;
  bestF1: number | null;
  bestNodes: number | null;
  submitCount: number;
  lastAt: number | null;
}

function timeAgo(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 60) return m + '분 전';
  if (m < 1440) return Math.round(m / 60) + '시간 전';
  return Math.round(m / 1440) + '일 전';
}

export default function AdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [sortBy, setSortBy] = useState<'accuracy' | 'name'>('accuracy');

  // 시험 세션
  const [session, setSession] = useState<ExamSession | null>(null);
  const [duration, setDuration] = useState(60);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // 1초마다 now 갱신
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const loadRows = useCallback(async () => {
    const users = getUsers();
    const [lb, allAttempts, profiles] = await Promise.all([fetchLeaderboard(), fetchAllAttempts(), getProfiles()]);
    const lbMap = Object.fromEntries(lb.map(e => [e.username, e]));

    const subInfo: Record<string, { count: number; lastAt: string | null }> = {};
    allAttempts.filter(a => a.mode === 'final').forEach(a => {
      const u = a.username;
      if (!subInfo[u]) subInfo[u] = { count: 0, lastAt: null };
      subInfo[u].count++;
      if (!subInfo[u].lastAt || (a.submitted_at && a.submitted_at > subInfo[u].lastAt!)) {
        subInfo[u].lastAt = a.submitted_at ?? null;
      }
    });

    const built: Row[] = Object.entries(users)
      .filter(([, info]) => info.role === 'student')
      .map(([username, info]) => {
        const best = lbMap[username] ?? null;
        const si = subInfo[username] ?? { count: 0, lastAt: null };
        return {
          username,
          teamName: profiles[username] ?? info.teamName ?? '',
          bestAccuracy: best?.accuracy ?? null,
          bestF1: best?.macro_f1 ?? null,
          bestNodes: best?.node_count ?? null,
          submitCount: si.count,
          lastAt: si.lastAt ? new Date(si.lastAt).getTime() : null,
        };
      });

    setRows(built);
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    if (s.role !== 'admin') { router.replace('/simulate'); return; }
    setAuthorized(true);

    getExamSession().then(setSession).catch(() => {});
    loadRows();

    const ch = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions' },
        () => getExamSession().then(setSession).catch(() => {}))
      // attempts 변경 시 자동 갱신
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' },
        () => loadRows())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [router, loadRows]);

  if (!authorized) return null;

  // 세션 계산
  const endsAt = session?.ends_at ? new Date(session.ends_at) : null;
  const isActive = (session?.is_active ?? false) && endsAt !== null && endsAt > now;
  const remainingMs = isActive && endsAt ? Math.max(0, endsAt.getTime() - now.getTime()) : 0;
  const remMin = Math.floor(remainingMs / 60000);
  const remSec = Math.floor((remainingMs % 60000) / 1000);
  const remainingText = isActive ? `${remMin}분 ${String(remSec).padStart(2,'0')}초` : '';

  const handleStart = async () => {
    await startExamSession(duration);
    getExamSession().then(setSession).catch(() => {});
  };
  const handleStop = async () => {
    await stopExamSession();
    getExamSession().then(setSession).catch(() => {});
  };

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'accuracy') {
      if (a.bestAccuracy === null && b.bestAccuracy === null) return 0;
      if (a.bestAccuracy === null) return 1;
      if (b.bestAccuracy === null) return -1;
      return b.bestAccuracy - a.bestAccuracy;
    }
    return a.username.localeCompare(b.username, 'ko');
  });

  const submitted = rows.filter(r => r.bestAccuracy !== null).length;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar />
      <main className="page">
        {/* 시험 세션 관리 */}
        <div className="card card-pad" style={{
          marginBottom: 24,
          borderColor: isActive ? 'oklch(0.72 0.14 150)' : 'var(--border)',
          background: isActive ? 'oklch(0.97 0.025 150)' : 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span className="kicker" style={{ color: isActive ? 'oklch(0.42 0.16 150)' : 'var(--ink-3)' }}>
                시험 세션
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: isActive ? 'oklch(0.55 0.16 150)' : 'var(--ink-4)', display: 'inline-block', flexShrink: 0, boxShadow: isActive ? '0 0 0 4px oklch(0.55 0.16 150 / .2)' : 'none' }} />
                <h3 style={{ fontSize: 18, color: isActive ? 'oklch(0.38 0.16 150)' : 'var(--ink)' }}>
                  {isActive ? '진행 중' : session?.is_active === false && session.ends_at && new Date(session.ends_at) <= now ? '시간 종료' : '대기 중'}
                </h3>
                {isActive && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22, color: 'oklch(0.38 0.16 150)', letterSpacing: '-.01em' }}>
                    {remainingText}
                  </span>
                )}
              </div>
              {session?.ends_at && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>
                  {isActive ? `종료: ${new Date(session.ends_at).toLocaleTimeString('ko-KR')}` : session.ends_at ? `마지막 종료: ${new Date(session.ends_at).toLocaleTimeString('ko-KR')}` : ''}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number" min={1} max={180} value={duration}
                  onChange={e => setDuration(Math.max(1, Math.min(180, Number(e.target.value))))}
                  disabled={isActive}
                  style={{ width: 72, height: 40, padding: '0 10px', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 14, textAlign: 'center', background: 'var(--surface)' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)' }}>분</span>
              </div>
              <button
                className="btn btn-primary"
                style={{ background: 'oklch(0.55 0.16 150)', minWidth: 72 }}
                disabled={isActive}
                onClick={handleStart}
              >
                ▶ 시작
              </button>
              <button
                className="btn btn-ghost"
                style={{ minWidth: 72, color: 'var(--accent-strong)', borderColor: 'var(--accent-border)' }}
                disabled={!isActive}
                onClick={handleStop}
              >
                ■ 종료
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <span className="kicker accent">ADMIN</span>
            <h1 style={{ marginTop: 8, fontSize: 26 }}>실전 제출 스코어</h1>
            <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
              학생별 테스트셋 최고 점수. 미제출자는 하단에 표시됩니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--accent-strong)', borderColor: 'var(--accent-border)' }}
              onClick={async () => {
                if (!confirm('Supabase의 모든 실전 제출 기록을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.')) return;
                const { error } = await supabase.from('attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (error) { alert('오류: ' + error.message); return; }
                alert('제출 기록이 초기화됐습니다. 페이지를 새로고침합니다.');
                location.reload();
              }}
            >
              🗑 제출 기록 초기화
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (!confirm('모든 학생의 시뮬레이션 진행 기록을 초기화할까요?')) return;
                Object.keys(localStorage)
                  .filter(k => k.startsWith('caggle.simResult.'))
                  .forEach(k => localStorage.removeItem(k));
                alert('시뮬레이션 기록이 초기화됐습니다.');
              }}
            >
              🔄 시뮬레이션 기록 초기화
            </button>
          </div>
        </div>

        {/* summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { lab: '전체 학생', val: rows.length },
            { lab: '제출 완료', val: submitted },
            { lab: '미제출', val: rows.length - submitted },
            {
              lab: '최고 accuracy',
              val: sorted[0]?.bestAccuracy != null
                ? (sorted[0].bestAccuracy * 100).toFixed(1) + '%'
                : '–',
            },
          ].map(({ lab, val }) => (
            <div key={lab} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{lab}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 28, marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* table */}
        <div className="card">
          <div className="card-head">
            <h3>학생 스코어 목록</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${sortBy === 'accuracy' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSortBy('accuracy')}
              >점수순</button>
              <button
                className={`btn btn-sm ${sortBy === 'name' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSortBy('name')}
              >이름순</button>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>이름</th>
                <th>팀명</th>
                <th style={{ width: 110 }}>accuracy</th>
                <th style={{ width: 100 }}>macro-F1</th>
                <th style={{ width: 72 }}>노드 수</th>
                <th style={{ width: 80 }}>제출</th>
                <th style={{ width: 110 }}>마지막 제출</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const hasScore = r.bestAccuracy !== null;
                return (
                  <tr key={r.username} style={!hasScore ? { opacity: 0.45 } : {}}>
                    <td className="num muted3">{hasScore ? i + 1 : '–'}</td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{r.username}</td>
                    <td>
                      {r.teamName
                        ? <span className="tag">{r.teamName}</span>
                        : <span className="muted3" style={{ fontSize: 12 }}>–</span>
                      }
                    </td>
                    <td>
                      {hasScore
                        ? <span className="num" style={{ fontWeight: 700, fontSize: 15, color: i === 0 && sortBy === 'accuracy' ? 'var(--accent-strong)' : undefined }}>
                            {(r.bestAccuracy! * 100).toFixed(1)}%
                          </span>
                        : <span className="muted3 num" style={{ fontSize: 12 }}>미제출</span>
                      }
                    </td>
                    <td className="num">{r.bestF1 != null ? r.bestF1.toFixed(4) : '–'}</td>
                    <td className="num muted">{r.bestNodes ?? '–'}</td>
                    <td className="num muted3" style={{ fontSize: 12 }}>{r.submitCount} / 3</td>
                    <td className="num muted3" style={{ fontSize: 12 }}>{r.lastAt ? timeAgo(r.lastAt) : '–'}</td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr><td colSpan={8} className="muted3" style={{ textAlign: 'center', padding: 24 }}>학생 데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
