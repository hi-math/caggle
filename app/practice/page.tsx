'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import TreeBuilder, { BuilderConfig, CLS_COLOR } from '@/components/TreeBuilder';
import { MUSH_TRAIN, MUSH_TEST, MUSH_ATTRS, MUSH_NUMERIC_ATTRS, MUSH_CAT_VALUES, MUSH_CLASSES, MUSH_CLASS_LABEL, generateTrainCSV } from '@/lib/mushroomData';
import { scoreTree, countNodes } from '@/lib/treeEngine';
import type { TreeNode, ScoreResult } from '@/lib/treeEngine';
import { getSession } from '@/lib/storage';

const MUSH_CONFIG: BuilderConfig = {
  attributes: MUSH_ATTRS,
  numericAttrs: MUSH_NUMERIC_ATTRS,
  catValues: MUSH_CAT_VALUES,
  classes: MUSH_CLASSES,
  defaultAttr: 'odor',
  classLabels: { e: '식용버섯', p: '독버섯' },
  attrLabels: {
    odor: '냄새',
    spore_print_color: '포자색깔',
    gill_size: '아가미크기',
    gill_color: '아가미색깔',
  },
  valueLabels: {
    odor: {
      none: '무취', almond: '아몬드향', anise: '아니스향',
      foul: '역겨운냄새', fishy: '생선냄새', spicy: '매운냄새',
      pungent: '자극적냄새', musty: '퀴퀴한냄새', creosote: '크레오소트향',
    },
    spore_print_color: {
      black: '검정', brown: '갈색', white: '흰색', green: '초록',
      chocolate: '초콜릿색', buff: '담황색', orange: '주황', purple: '보라', yellow: '노랑',
    },
    gill_size: { broad: '넓음', narrow: '좁음' },
    gill_color: {
      buff: '담황색', pink: '분홍', white: '흰색', brown: '갈색', gray: '회색',
      black: '검정', chocolate: '초콜릿색', orange: '주황', green: '초록',
      purple: '보라', red: '빨강', yellow: '노랑',
    },
  },
};

function downloadCSV() {
  const csv = generateTrainCSV();
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'mushroom_train.csv';
  a.click();
}

interface TooltipState { attr: string; x: number; y: number }

export default function PracticePage() {
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [testResult, setTestResult] = useState<ScoreResult | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => { if (!getSession()) router.replace('/login'); }, [router]);

  const result = useMemo(
    () => scoreTree(tree, MUSH_TRAIN, MUSH_CLASSES),
    [tree]
  );

  // 클래스 분포
  const dist = useMemo(() => {
    const cnt: Record<string, number> = { e: 0, p: 0 };
    MUSH_TRAIN.forEach(r => { cnt[r.Drug] = (cnt[r.Drug] ?? 0) + 1; });
    return cnt;
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar />

      {/* 제목 */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 32px' }}>
        <h1 style={{ fontSize: 22 }}>독버섯 분류 모델</h1>
      </div>

      {/* 본문 */}
      <div style={{ padding: '20px 32px 80px', display: 'grid', gridTemplateColumns: '200px 1fr 260px', gap: 20, alignItems: 'start' }}>

        {/* 왼쪽 */}
        <aside>
          <div className="card card-pad">
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 40 }}>🍄</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, marginTop: 6 }}>훈련 데이터</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>200행 · 4속성</div>
            </div>

            {/* 클래스 분포 */}
            <span className="kicker" style={{ display: 'block', marginBottom: 8 }}>클래스 분포</span>
            {(['e', 'p'] as const).map(c => (
              <div key={c} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 28px', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 5 }}>
                <span style={{ fontWeight: 700, color: CLS_COLOR[c] }}>{MUSH_CLASS_LABEL[c]}</span>
                <div style={{ height: 14, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(dist[c] / 200 * 100).toFixed(0)}%`, background: CLS_COLOR[c], borderRadius: 4 }} />
                </div>
                <span style={{ color: 'var(--ink-2)', textAlign: 'right' }}>{dist[c]}</span>
              </div>
            ))}

            <hr className="hr" style={{ margin: '14px 0' }} />

            {/* 속성 안내 */}
            <span className="kicker" style={{ display: 'block', marginBottom: 8 }}>속성 (4개)</span>
            {[
              ['odor', '냄새'],
              ['spore_print_color', '포자 색깔'],
              ['gill_size', '아가미 크기'],
              ['gill_color', '아가미 색깔'],
            ].map(([attr, ko]) => (
              <div
                key={attr}
                onMouseEnter={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setTooltip({ attr, x: r.right + 10, y: r.top });
                }}
                onMouseLeave={() => setTooltip(null)}
                style={{
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                  fontFamily: 'var(--font-mono)', fontSize: 11.5, cursor: 'help',
                }}
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
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6, textAlign: 'center' }}>
              200행 · 테스트셋 100행 제외
            </p>
          </div>

        </aside>

        {/* 가운데: 트리 빌더 */}
        <section>
          <div className="card">
            <div className="card-head">
              <h3>트리 빌더</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="tag">
                  {tree ? `노드 ${result.nodeCount} · ${(result.accuracy * 100).toFixed(1)}%` : '빈 트리'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('트리를 초기화할까요?')) setTree(null); }}>
                  초기화
                </button>
              </div>
            </div>
            <div className="card-pad">
              <TreeBuilder value={tree} onChange={setTree} config={MUSH_CONFIG} />
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
                    <th>odor</th>
                    <th>spore_print_color</th>
                    <th>gill_size</th>
                    <th>gill_color</th>
                    <th>예측</th>
                    <th>실제</th>
                  </tr></thead>
                  <tbody>
                    {testResult.scored.map((r, i) => {
                      const correct = r.ok;
                      const predLabel = r.pred === 'UNCLASSIFIED' ? '미분류' : (MUSH_CLASS_LABEL[r.pred] ?? r.pred);
                      return (
                        <tr key={i} style={correct ? {} : { background: 'oklch(0.98 0.015 25)' }}>
                          <td className="num muted3" style={{ fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.odor as string}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.spore_print_color as string}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.gill_size as string}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.gill_color as string}</td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: CLS_COLOR[r.pred] ?? 'var(--ink-3)' }}>
                              {predLabel}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: correct ? 'oklch(0.45 0.15 150)' : 'var(--accent-strong)' }}>
                              {correct ? '✓' : '✗'} {MUSH_CLASS_LABEL[r.Drug] ?? r.Drug}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* 오른쪽: 메트릭 */}
        <aside>
          {/* 분류 버튼 */}
          <div className="card card-pad" style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12, lineHeight: 1.5 }}>
              만든 트리로 테스트셋(100행)을 분류합니다.
            </p>
            <button
              className="btn btn-primary btn-block"
              disabled={!tree}
              onClick={() => setTestResult(scoreTree(tree, MUSH_TEST, MUSH_CLASSES))}
            >
              테스트셋 분류하기 →
            </button>
            {!tree && (
              <p className="muted3" style={{ fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 8, textAlign: 'center' }}>
                트리를 먼저 만드세요
              </p>
            )}
          </div>

          <div className="card card-pad">
            <span className="kicker" style={{ display: 'block', marginBottom: 12 }}>훈련셋 혼동행렬</span>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 13, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink-3)', fontWeight: 600, fontSize: 11 }}>↓실\예→</th>
                    {[...MUSH_CLASSES].map(c => (
                      <th key={c} style={{ padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', fontWeight: 600, color: CLS_COLOR[c] ?? 'var(--ink-3)' }}>
                        {MUSH_CLASS_LABEL[c]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MUSH_CLASSES.map(actual => (
                    <tr key={actual}>
                      <th style={{ padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', fontWeight: 600, color: CLS_COLOR[actual] }}>
                        {MUSH_CLASS_LABEL[actual]}
                      </th>
                      {[...MUSH_CLASSES].map(pred => {
                        const v = result.matrix[actual]?.[pred] ?? 0;
                        const isDiag = pred === actual;
                        const isMiss = !isDiag && v > 0;
                        return (
                          <td key={pred} style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid var(--border)', fontWeight: isDiag ? 700 : 400, fontSize: 14, color: isDiag ? 'oklch(0.45 0.15 150)' : isMiss ? 'var(--accent-strong)' : 'var(--ink-3)' }}>
                            {v || ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted3" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 6 }}>행=실제, 열=예측</p>
          </div>

          <div className="card card-pad" style={{ marginTop: 14 }}>
            <span className="kicker" style={{ display: 'block', marginBottom: 12 }}>클래스별 지표</span>
            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr', gap: '4px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>
              <span /><span>Prec</span><span>Rec</span><span>F1</span>
            </div>
            {MUSH_CLASSES.map(c => {
              const m = result.perClass[c];
              return (
                <div key={c} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr', gap: '4px 8px', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: CLS_COLOR[c] }}>{MUSH_CLASS_LABEL[c]}</span>
                  <span style={{ color: 'var(--ink-2)' }}>{m?.prec.toFixed(2) ?? '–'}</span>
                  <span style={{ color: 'var(--ink-2)' }}>{m?.rec.toFixed(2) ?? '–'}</span>
                  <span style={{ fontWeight: 600 }}>{m?.f1.toFixed(2) ?? '–'}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* 속성값 툴팁 */}
      {tooltip && (() => {
        const vals = MUSH_CAT_VALUES[tooltip.attr] ?? [];
        const koMap = MUSH_CONFIG.valueLabels?.[tooltip.attr] ?? {};
        return (
          <div style={{
            position: 'fixed', left: tooltip.x, top: tooltip.y,
            zIndex: 9999, pointerEvents: 'none',
            background: 'var(--ink)', color: '#e9e6dd',
            borderRadius: 'var(--radius)', padding: '10px 14px',
            boxShadow: 'var(--shadow-lg)',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            minWidth: 200, maxWidth: 280,
          }}>
            {/* 속성명 헤더 */}
            <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'oklch(0.78 0.11 258)', marginBottom: 8 }}>
              {MUSH_CONFIG.attrLabels?.[tooltip.attr] ?? tooltip.attr}
              <span style={{ color: 'oklch(0.55 0.05 258)', fontWeight: 400, marginLeft: 6 }}>({tooltip.attr})</span>
            </div>
            {/* 값 목록 */}
            {vals.map(v => (
              <div key={v} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0', gap: 12 }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{koMap[v] ?? v}</span>
                <span style={{ color: 'oklch(0.60 0.02 258)', fontSize: 11 }}>{v}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
