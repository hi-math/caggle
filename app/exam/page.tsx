'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import TreeBuilder, { BuilderConfig } from '@/components/TreeBuilder';
import { PRACTICE_DATA, EXAM_DATA, generateDrugTrainCSV } from '@/lib/drugData';
import { CLASSES, scoreTree } from '@/lib/treeEngine';
import type { TreeNode, ScoreResult } from '@/lib/treeEngine';
import { getSession } from '@/lib/storage';
import { supabase, insertAttempt, getSubmitCount, getExamSession } from '@/lib/supabase';
import type { ExamSession } from '@/lib/supabase';

const MAX_ATTEMPTS = 10;

const DRUG_CONFIG: BuilderConfig = {
  attributes: ['Age', 'Sex', 'BP', 'Cholesterol', 'Na_to_K'],
  numericAttrs: new Set(['Age', 'Na_to_K']),
  catValues: {
    Sex: ['F', 'M'],
    BP: ['HIGH', 'NORMAL', 'LOW'],
    Cholesterol: ['HIGH', 'NORMAL'],
  },
  classes: CLASSES,
  defaultAttr: 'Na_to_K',
  defaultNumericValue: 0,
  classLabels: { A: 'Drug A', B: 'Drug B', C: 'Drug C', X: 'Drug X', Y: 'Drug Y' },
  attrLabels: {
    Age: '나이',
    Sex: '성별',
    BP: '혈압',
    Cholesterol: '콜레스테롤',
    Na_to_K: 'Na/K비율',
  },
  valueLabels: {
    Sex: { F: '여성', M: '남성' },
    BP: { HIGH: '높음', NORMAL: '보통', LOW: '낮음' },
    Cholesterol: { HIGH: '높음', NORMAL: '보통' },
  },
};

const DRUG_CLASS_COLOR: Record<string, string> = {
  A: 'oklch(0.62 0.20 25)', B: 'oklch(0.62 0.18 50)',
  C: 'oklch(0.62 0.14 150)', X: 'oklch(0.62 0.13 250)', Y: 'oklch(0.62 0.12 80)',
};

function downloadCSV() {
  const csv = generateDrugTrainCSV();
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'drug_train.csv';
  a.click();
}

interface TooltipState { attr: string; x: number; y: number }

export default function ExamPage() {
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [testResult, setTestResult] = useState<ScoreResult | null>(null);
  const [username, setUsername] = useState('');
  const [submitCount, setSubmitCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [now, setNow] = useState(new Date());

  // 1초 타이머
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 마운트: 세션 확인 + 트리 복원 + 제출 횟수 로드
  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    setUsername(s.username);
    try {
      const saved = localStorage.getItem(`caggle.examTree.${s.username}`);
      if (saved) setTree(JSON.parse(saved));
    } catch {}
    getSubmitCount(s.username)
      .then(setSubmitCount)
      .catch(() => setSubmitCount(0));

    // 시험 세션 로드 + 실시간 구독
    getExamSession().then(setSession).catch(() => {});
    const ch = supabase.channel('exam-session')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions' },
        () => getExamSession().then(setSession).catch(() => {}))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [router]);

  // 트리 변경 시 localStorage에 저장
  useEffect(() => {
    if (!username) return;
    if (tree) {
      localStorage.setItem(`caggle.examTree.${username}`, JSON.stringify(tree));
    } else {
      localStorage.removeItem(`caggle.examTree.${username}`);
    }
  }, [tree, username]);

  const trainResult = useMemo(() => scoreTree(tree, PRACTICE_DATA), [tree]);
  const locked = submitCount >= MAX_ATTEMPTS;

  // 세션 활성 여부
  const endsAt = session?.ends_at ? new Date(session.ends_at) : null;
  const sessionActive = (session?.is_active ?? false) && endsAt !== null && endsAt > now;
  const remainingMs = sessionActive && endsAt ? Math.max(0, endsAt.getTime() - now.getTime()) : 0;
  const remMin = Math.floor(remainingMs / 60000);
  const remSec = Math.floor((remainingMs % 60000) / 1000);
  const remainingText = sessionActive ? `${remMin}분 ${String(remSec).padStart(2, '0')}초 남음` : '';

  // 채점만 — 횟수 소모 없음
  const handleScore = () => {
    if (!tree) return;
    setTestResult(scoreTree(tree, EXAM_DATA));
  };

  // 제출 — Supabase 저장 + 횟수 차감
  const handleSubmit = async () => {
    if (!testResult || locked || submitting) return;
    setSubmitting(true);
    try {
      await insertAttempt({
        username, mode: 'final',
        tree_json: JSON.stringify(tree),
        node_count: testResult.nodeCount,
        accuracy: testResult.accuracy,
        macro_f1: testResult.macroF1,
      });
      const newCount = await getSubmitCount(username);
      setSubmitCount(newCount);
    } catch (err) {
      console.error('제출 오류:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar />

      {/* 제목 */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 32px' }}>
        <h1 style={{ fontSize: 22 }}>처방약물 분류 모델</h1>
      </div>

      {/* 세션 배너 */}
      <div style={{
        padding: '10px 32px',
        background: sessionActive ? 'oklch(0.94 0.06 150)' : 'oklch(0.97 0.02 25)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: sessionActive ? 'oklch(0.55 0.16 150)' : 'oklch(0.65 0.15 25)', display: 'inline-block', flexShrink: 0, boxShadow: sessionActive ? '0 0 0 3px oklch(0.55 0.16 150 / .25)' : 'none' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: sessionActive ? 'oklch(0.38 0.16 150)' : 'oklch(0.48 0.18 25)' }}>
            {sessionActive ? '시험 진행 중' : session?.is_active === false && session.ends_at && new Date(session.ends_at) <= now ? '시험 종료' : '시험 대기 중'}
          </span>
          {!sessionActive && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
              — 어드민이 시험을 시작하면 활성화됩니다
            </span>
          )}
        </div>
        {sessionActive && (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'oklch(0.38 0.16 150)', letterSpacing: '-.01em' }}>
            ⏱ {remainingText}
          </span>
        )}
      </div>

      {/* 본문 */}
      <div style={{ padding: '20px 32px 80px', display: 'grid', gridTemplateColumns: '200px 1fr 260px', gap: 20, alignItems: 'start' }}>

        {/* 왼쪽 */}
        <aside>
          <div className="card card-pad">
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 40 }}>💊</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, marginTop: 6 }}>훈련 데이터</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>100행 · 5속성</div>
            </div>

            <hr className="hr" style={{ margin: '14px 0' }} />

            {/* 속성 안내 */}
            <span className="kicker" style={{ display: 'block', marginBottom: 8 }}>속성 (5개)</span>
            {[
              ['Age', '나이', '수치형 · 15~74'],
              ['Sex', '성별', '범주형 · F / M'],
              ['BP', '혈압', '범주형 · HIGH / NORMAL / LOW'],
              ['Cholesterol', '콜레스테롤', '범주형 · HIGH / NORMAL'],
              ['Na_to_K', 'Na/K비율', '수치형 · 6.3~38.2'],
            ].map(([attr, ko, hint]) => (
              <div
                key={attr}
                onMouseEnter={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setTooltip({ attr, x: r.right + 10, y: r.top });
                }}
                onMouseLeave={() => setTooltip(null)}
                style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11.5, cursor: 'help' }}
              >
                <div style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>{ko}</div>
                <div style={{ color: 'var(--ink)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {attr}
                  <span style={{ color: 'var(--accent)', fontSize: 11 }}>ⓘ</span>
                </div>
              </div>
            ))}

            <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 14 }} onClick={downloadCSV}>
              ⬇ 훈련 데이터 CSV
            </button>
          </div>
        </aside>

        {/* 가운데: 트리 빌더 */}
        <section>
          <div className="card">
            <div className="card-head">
              <h3>트리 빌더</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="tag">
                  {tree ? `노드 ${trainResult.nodeCount} · 훈련 ${(trainResult.accuracy * 100).toFixed(1)}%` : '빈 트리'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('트리를 초기화할까요?')) { setTree(null); setTestResult(null); } }} disabled={locked}>
                  초기화
                </button>
              </div>
            </div>
            <div className="card-pad">
              <TreeBuilder value={tree} onChange={t => { setTree(t); setTestResult(null); }} config={DRUG_CONFIG} disabled={locked || !sessionActive} />
            </div>
          </div>

          {/* 테스트셋 분류 결과 */}
          {testResult && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-head">
                <h3>테스트셋 분류 결과</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="tag accent">
                    {(testResult.accuracy * 100).toFixed(1)}% · {testResult.correct}/{testResult.total}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTestResult(null)}>닫기</button>
                </div>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
                <table className="table">
                  <thead><tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>Age</th><th>Sex</th><th>BP</th><th>Cholesterol</th><th>Na_to_K</th>
                    <th>예측</th><th>실제</th>
                  </tr></thead>
                  <tbody>
                    {testResult.scored.map((r, i) => (
                      <tr key={i} style={r.ok ? {} : { background: 'oklch(0.98 0.015 25)' }}>
                        <td className="num muted3" style={{ fontSize: 12 }}>{i + 1}</td>
                        <td className="num" style={{ fontSize: 12 }}>{r.Age}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.Sex}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.BP}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.Cholesterol}</td>
                        <td className="num" style={{ fontSize: 12 }}>{(r.Na_to_K as number).toFixed(3)}</td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: DRUG_CLASS_COLOR[r.pred] ?? 'var(--ink-3)' }}>
                            {r.pred === 'UNCLASSIFIED' ? '미분류' : r.pred}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: r.ok ? 'oklch(0.45 0.15 150)' : 'var(--accent-strong)' }}>
                            {r.ok ? '✓' : '✗'} {r.Drug}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* 오른쪽 */}
        <aside>
          {/* 채점 버튼 */}
          <div className="card card-pad" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
                테스트셋(100행)으로 채점합니다.<br/>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  최대 {MAX_ATTEMPTS}회 · 최고 점수 리더보드 반영
                </span>
              </p>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: locked ? 'var(--accent-strong)' : 'var(--ink-3)' }}>
                {submitCount}/{MAX_ATTEMPTS}
              </span>
            </div>
            {/* 제출 횟수 바 */}
            <div className="bar" style={{ marginBottom: 12 }}>
              <i style={{ width: `${(submitCount / MAX_ATTEMPTS) * 100}%` }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={!tree || !sessionActive}
                onClick={handleScore}
              >
                채점하기
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={!testResult || locked || submitting || !sessionActive}
                onClick={handleSubmit}
              >
                {submitting ? '제출 중…' : locked ? '소진' : '제출하기'}
              </button>
            </div>
            {!tree && (
              <p className="muted3" style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 8, textAlign: 'center' }}>
                트리를 먼저 만드세요
              </p>
            )}
            {testResult && !locked && (
              <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 6, textAlign: 'center', color: 'var(--ink-3)' }}>
                채점 후 결과를 확인하고 제출하세요
              </p>
            )}
          </div>

          {/* 리더보드 링크 */}
          <a href="/leaderboard" className="btn btn-ghost btn-sm btn-block" style={{ marginBottom: 14 }}>
            리더보드 보기 →
          </a>

          {/* 훈련셋 혼동행렬 */}
          <div className="card card-pad">
            <span className="kicker" style={{ display: 'block', marginBottom: 12 }}>훈련셋 혼동행렬</span>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '5px 7px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--ink-3)', fontWeight: 600, fontSize: 10 }}>↓\→</th>
                    {[...CLASSES].map(c => (
                      <th key={c} style={{ padding: '5px 7px', background: 'var(--surface-3)', border: '1px solid var(--border)', fontWeight: 700, color: DRUG_CLASS_COLOR[c] ?? 'var(--ink-3)', fontSize: 12 }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CLASSES.map(actual => (
                    <tr key={actual}>
                      <th style={{ padding: '5px 7px', background: 'var(--surface-3)', border: '1px solid var(--border)', fontWeight: 700, color: DRUG_CLASS_COLOR[actual], fontSize: 12 }}>
                        {actual}
                      </th>
                      {[...CLASSES].map(pred => {
                        const v = trainResult.matrix[actual]?.[pred] ?? 0;
                        const isDiag = pred === actual;
                        const isMiss = !isDiag && v > 0;
                        return (
                          <td key={pred} style={{ padding: '5px 7px', textAlign: 'center', border: '1px solid var(--border)', fontWeight: isDiag ? 700 : 400, color: isDiag ? 'oklch(0.45 0.15 150)' : isMiss ? 'var(--accent-strong)' : 'var(--ink-4)' }}>
                            {v || ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted3" style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', marginTop: 6 }}>행=실제, 열=예측</p>
          </div>

          {/* 클래스별 지표 */}
          <div className="card card-pad" style={{ marginTop: 14 }}>
            <span className="kicker" style={{ display: 'block', marginBottom: 10 }}>훈련셋 클래스별 F1</span>
            {CLASSES.map(c => {
              const m = trainResult.perClass[c];
              return (
                <div key={c} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 36px', gap: '4px 8px', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: DRUG_CLASS_COLOR[c] }}>{c}</span>
                  <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${((m?.f1 ?? 0) * 100).toFixed(0)}%`, background: DRUG_CLASS_COLOR[c], borderRadius: 4 }} />
                  </div>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{m?.f1.toFixed(2) ?? '–'}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* 속성 툴팁 */}
      {tooltip && (() => {
        const attrInfo: Record<string, { hint: string; values?: Record<string, string> }> = {
          Age:         { hint: '수치형 · 15 ~ 74세' },
          Sex:         { hint: '범주형', values: { F: '여성', M: '남성' } },
          BP:          { hint: '혈압 · 범주형', values: { HIGH: '높음', NORMAL: '보통', LOW: '낮음' } },
          Cholesterol: { hint: '콜레스테롤 · 범주형', values: { HIGH: '높음', NORMAL: '보통' } },
          Na_to_K:     { hint: '수치형 · 6.269 ~ 38.247' },
        };
        const info = attrInfo[tooltip.attr];
        return (
          <div style={{
            position: 'fixed', left: tooltip.x, top: tooltip.y,
            zIndex: 9999, pointerEvents: 'none',
            background: 'var(--ink)', color: '#e9e6dd',
            borderRadius: 'var(--radius)', padding: '10px 14px',
            boxShadow: 'var(--shadow-lg)',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            minWidth: 180,
          }}>
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'oklch(0.78 0.11 258)', marginBottom: 6 }}>
              {DRUG_CONFIG.attrLabels?.[tooltip.attr] ?? tooltip.attr}
              <span style={{ color: 'oklch(0.55 0.05 258)', fontWeight: 400, marginLeft: 6 }}>({tooltip.attr})</span>
            </div>
            <div style={{ color: 'oklch(0.60 0.02 258)', marginBottom: info?.values ? 6 : 0 }}>{info?.hint}</div>
            {info?.values && Object.entries(info.values).map(([v, ko]) => (
              <div key={v} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '2px 0' }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{ko}</span>
                <span style={{ color: 'oklch(0.60 0.02 258)' }}>{v}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
