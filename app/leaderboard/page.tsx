'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { getSession } from '@/lib/storage';
import { supabase, fetchLeaderboard } from '@/lib/supabase';
import type { LeaderboardRow } from '@/lib/supabase';

const MEDAL = ['g', 's', 'b'] as const;
const HUES = [25, 150, 250, 80, 300];

function timeAgo(ts: string) {
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return m + '분 전';
  if (m < 1440) return Math.round(m / 60) + '시간 전';
  return Math.round(m / 1440) + '일 전';
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardRow[]>([]);
  const [myUsername, setMyUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await fetchLeaderboard();
    setEntries(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    setMyUsername(s.username);
    load();

    // 실시간 구독 — 새 제출 시 자동 갱신
    const channel = supabase
      .channel('realtime-lb')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attempts' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router, load]);

  const myIdx = entries.findIndex(e => e.username === myUsername);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar />
      <main className="page wide">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h1>리더보드</h1>
          <button className="btn btn-ghost btn-sm" onClick={load}>새로고침</button>
        </div>

        {/* podium */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 3 }, (_, i) => {
            const e = entries[i];
            if (!e) return (
              <div key={i} className="card" style={{ padding: 20, opacity: 0.35, position: 'relative' }}>
                <div style={{ position: 'absolute', right: 16, top: 14, fontFamily: 'var(--font-mono)', fontSize: 46, fontWeight: 700, color: 'var(--surface-3)', lineHeight: 1 }}>{i + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>?</div>
                  <div style={{ fontWeight: 600 }}>미제출</div>
                </div>
              </div>
            );
            const isYou = e.username === myUsername;
            return (
              <div key={i} className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden', ...(i === 0 ? { borderColor: 'var(--accent-border)', boxShadow: '0 0 0 1px var(--accent-border), var(--shadow)' } : {}) }}>
                <div style={{ position: 'absolute', right: 16, top: 14, fontFamily: 'var(--font-mono)', fontSize: 46, fontWeight: 700, color: 'var(--surface-3)', lineHeight: 1 }}>{i + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className={`medal ${MEDAL[i]}`} style={{ width: 38, height: 38, borderRadius: 9, fontSize: 14 }}>{e.username.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.username}{isYou && <span className="tag accent" style={{ marginLeft: 6, height: 16, fontSize: 10 }}>나</span>}</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 14 }}>accuracy</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, letterSpacing: '-.02em', color: i === 0 ? 'var(--accent-strong)' : undefined }}>
                  {(e.accuracy * 100).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
          {/* table */}
          <div className="card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>로딩 중…</div>
            ) : !entries.length ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ink-3)' }}>
                <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--ink-2)' }}>아직 제출이 없습니다</h3>
                <a href="/exam" className="btn btn-primary" style={{ marginTop: 16 }}>실전 도전 →</a>
              </div>
            ) : (
              <table className="table">
                <thead><tr>
                  <th style={{ width: 54 }}>#</th>
                  <th>사용자</th>
                  <th style={{ width: 110 }}>accuracy</th>
                  <th style={{ width: 110 }}>macro-F1</th>
                  <th style={{ width: 120 }}>제출 시각</th>
                </tr></thead>
                <tbody>
                  {entries.map((e, i) => {
                    const isYou = e.username === myUsername;
                    const rankNum = i + 1;
                    const medalCls = rankNum <= 3 ? `medal ${MEDAL[i]}` : '';
                    const hue = HUES[i % HUES.length];
                    return (
                      <tr key={e.username} style={isYou ? { backgroundColor: 'var(--accent-soft)' } : {}}>
                        <td><span className="rank">{rankNum}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className={medalCls} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, flex: 'none', ...(medalCls ? {} : { background: `oklch(0.95 0.045 ${hue})`, color: 'var(--ink)', border: `1px solid oklch(0.85 0.08 ${hue})` }) }}>
                              {e.username.slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: isYou ? 700 : 600 }}>
                              {e.username}{isYou && <span className="tag accent" style={{ marginLeft: 6, height: 16, fontSize: 10 }}>나</span>}
                            </span>
                          </div>
                        </td>
                        <td><span className="num" style={{ fontWeight: 700, fontSize: 15, color: isYou ? 'var(--accent-strong)' : undefined }}>{(e.accuracy * 100).toFixed(1)}%</span></td>
                        <td><span className="num">{e.macro_f1.toFixed(4)}</span></td>
                        <td><span className="num muted3" style={{ fontSize: 12 }}>{timeAgo(e.submitted_at)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* sidebar */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {myIdx >= 0 && (
              <div className="card card-pad" style={{ borderColor: 'var(--accent-border)' }}>
                <span className="kicker accent">내 순위</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 4px' }}>
                  <span className="mono" style={{ fontSize: 32, fontWeight: 700 }}>#{myIdx + 1}</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>상위 {((myIdx + 1) / entries.length * 100).toFixed(1)}%</div>
                <hr className="hr" style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13.5, borderBottom: '1px solid var(--border)' }}>
                  <span className="muted">내 최고 점수</span>
                  <b className="mono" style={{ color: 'var(--accent-strong)' }}>{(entries[myIdx].accuracy * 100).toFixed(1)}%</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13.5 }}>
                  <span className="muted">1위까지</span>
                  <b className="mono">{myIdx === 0 ? '–' : '-' + (entries[0].accuracy - entries[myIdx].accuracy).toFixed(4)}</b>
                </div>
                <a href="/exam" className="btn btn-primary btn-block btn-sm" style={{ marginTop: 14 }}>작업 스페이스로 →</a>
              </div>
            )}
            <div className="card card-pad">
              <span className="kicker" style={{ display: 'block', marginBottom: 10 }}>규칙</span>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.8 }}>
                <li>테스트셋 100행 기준 accuracy</li>
                <li>동점 시 노드 수 적은 순</li>
                <li>사용자당 최고 점수 1행</li>
                <li>최대 10회 제출</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
