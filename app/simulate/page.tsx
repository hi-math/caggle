'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { getSession } from '@/lib/storage';

// ── 속성 레이블 ────────────────────────────────────────────────────────────────
const ODOR_KO: Record<string, string> = {
  foul:'역겨운 냄새', almond:'아몬드향', anise:'아니스향',
  none:'무취', pungent:'자극적 냄새', musty:'퀴퀴한 냄새',
  fishy:'생선 냄새', creosote:'크레오소트향', spicy:'매운 냄새',
};
const SPORE_KO: Record<string, string> = {
  black:'검정', brown:'갈색', white:'흰색', purple:'보라색',
  green:'초록색', chocolate:'초콜릿색', buff:'담황색', orange:'주황색',
};
const GILL_KO: Record<string, string> = { broad:'넓음', narrow:'좁음' };

// ── 샘플 버섯 ─────────────────────────────────────────────────────────────────
interface Mushroom { name:string; odor:string; sporeColor:string; gillSize:string; }
const SAMPLES: Mushroom[] = [
  { name:'송이버섯',       odor:'almond',   sporeColor:'brown',  gillSize:'broad'  },
  { name:'갓버섯',         odor:'almond',   sporeColor:'white',  gillSize:'broad'  },
  { name:'아니스버섯',     odor:'anise',    sporeColor:'purple', gillSize:'broad'  },
  { name:'화경버섯',       odor:'anise',    sporeColor:'white',  gillSize:'broad'  },
  { name:'광대버섯',       odor:'foul',     sporeColor:'white',  gillSize:'broad'  },
  { name:'파리버섯',       odor:'pungent',  sporeColor:'black',  gillSize:'broad'  },
  { name:'독깔때기버섯',   odor:'fishy',    sporeColor:'white',  gillSize:'narrow' },
  { name:'붉은사슴뿔버섯', odor:'spicy',    sporeColor:'orange', gillSize:'narrow' },
  { name:'구름버섯',       odor:'musty',    sporeColor:'brown',  gillSize:'broad'  },
  { name:'독그물버섯',     odor:'creosote', sporeColor:'black',  gillSize:'narrow' },
  { name:'독우산버섯',     odor:'none',     sporeColor:'green',  gillSize:'broad'  },
  { name:'땀버섯',         odor:'none',     sporeColor:'white',  gillSize:'narrow' },
  { name:'독흰갈대버섯',   odor:'none',     sporeColor:'buff',   gillSize:'narrow' },
  { name:'느타리버섯',     odor:'none',     sporeColor:'white',  gillSize:'broad'  },
  { name:'표고버섯',       odor:'none',     sporeColor:'brown',  gillSize:'broad'  },
  { name:'새송이버섯',     odor:'none',     sporeColor:'brown',  gillSize:'broad'  },
  { name:'팽이버섯',       odor:'none',     sporeColor:'white',  gillSize:'broad'  },
  { name:'잎새버섯',       odor:'none',     sporeColor:'white',  gillSize:'broad'  },
];

// ── 트리 구조 ─────────────────────────────────────────────────────────────────
const LEAF_IDS = new Set([3, 5, 7, 8, 9, 10]);

// 정답(예=true) 계산
function getCorrectAnswer(nodeId: number, m: Mushroom): boolean {
  switch (nodeId) {
    case 0: return m.odor === 'none';
    case 1: return m.odor === 'almond';
    case 2: return m.sporeColor === 'green';
    case 4: return m.odor === 'anise';
    case 6: return m.gillSize === 'narrow';
    default: return false;
  }
}

// 자식 노드
const TREE_NEXT: Record<number, { yes:number; no:number }> = {
  0:{ yes:2, no:1 }, 1:{ yes:3, no:4 },
  2:{ yes:5, no:6 }, 4:{ yes:7, no:8 },
  6:{ yes:9, no:10 },
};

// 정답 경로 (샘플 선택 버튼 ✓/☠ 표시용)
function computePath(m: Mushroom): number[] {
  const p=[0];
  if (m.odor==='none'){p.push(2);if(m.sporeColor==='green'){p.push(5);}else{p.push(6);p.push(m.gillSize==='narrow'?9:10);}}
  else{p.push(1);if(m.odor==='almond'){p.push(3);}else{p.push(4);p.push(m.odor==='anise'?7:8);}}
  return p;
}

// ── 트리 노드/엣지 정의 ───────────────────────────────────────────────────────
const SW=210, SH=68, LW=165, LH=56;
interface TNode { id:number; type:'split'|'leaf'; line1:string; line2?:string; result?:'p'|'e'; cx:number; y:number; w:number; h:number }
interface TEdge { id:number; from:number; to:number; isYes:boolean; label:string }

// 규칙: 예(YES) = 항상 왼쪽 자식, 아니오(NO) = 항상 오른쪽 자식
//
// Root(0, cx=555)
//   예(왼) → Node2 spore check (cx=255)
//              예(왼) → Node5 POISON-green (cx=100)
//              아니오(오) → Node6 gill check (cx=415)
//                             예(왼) → Node9 POISON-narrow (cx=315)
//                             아니오(오) → Node10 EDIBLE-broad (cx=510)
//   아니오(오) → Node1 almond check (cx=855)
//                 예(왼) → Node3 EDIBLE-almond (cx=700)
//                 아니오(오) → Node4 anise check (cx=1010)
//                               예(왼) → Node7 EDIBLE-anise (cx=910)
//                               아니오(오) → Node8 POISON-other (cx=1105)

const NODES: TNode[] = [
  { id:0,  type:'split', line1:"냄새 == 'none'?",     line2:'무취인가?',        cx:555,  y:10,  w:SW, h:SH },
  // NO(오른쪽) 서브트리: 냄새가 있는 경우
  { id:1,  type:'split', line1:"냄새 == 'almond'?",   line2:'아몬드향인가?',    cx:855,  y:200, w:SW, h:SH },
  // YES(왼쪽) 서브트리: 무취인 경우
  { id:2,  type:'split', line1:"포자색 == 'green'?",  line2:'초록색인가?',      cx:255,  y:200, w:SW, h:SH },
  { id:3,  type:'leaf',  line1:'✓ 식용버섯', result:'e', cx:700,  y:380, w:LW, h:LH },  // Node1 YES
  { id:4,  type:'split', line1:"냄새 == 'anise'?",    line2:'아니스향인가?',    cx:1010, y:380, w:SW, h:SH }, // Node1 NO
  { id:5,  type:'leaf',  line1:'☠ 독버섯',  result:'p', cx:100,  y:380, w:LW, h:LH },  // Node2 YES
  { id:6,  type:'split', line1:"아가미 == 'narrow'?", line2:'아가미가 좁은가?', cx:415,  y:380, w:SW, h:SH }, // Node2 NO
  { id:7,  type:'leaf',  line1:'✓ 식용버섯', result:'e', cx:910,  y:535, w:LW, h:LH },  // Node4 YES
  { id:8,  type:'leaf',  line1:'☠ 독버섯',  result:'p', cx:1105, y:535, w:LW, h:LH },  // Node4 NO
  { id:9,  type:'leaf',  line1:'☠ 독버섯',  result:'p', cx:315,  y:535, w:LW, h:LH },  // Node6 YES
  { id:10, type:'leaf',  line1:'✓ 식용버섯', result:'e', cx:510,  y:535, w:LW, h:LH },  // Node6 NO
];
const EDGES: TEdge[] = [
  { id:0, from:0, to:2, isYes:true,  label:'예'    },
  { id:1, from:0, to:1, isYes:false, label:'아니오' },
  { id:2, from:2, to:5, isYes:true,  label:'예'    },
  { id:3, from:2, to:6, isYes:false, label:'아니오' },
  { id:4, from:6, to:9, isYes:true,  label:'예'    },
  { id:5, from:6, to:10,isYes:false, label:'아니오' },
  { id:6, from:1, to:3, isYes:true,  label:'예'    },
  { id:7, from:1, to:4, isYes:false, label:'아니오' },
  { id:8, from:4, to:7, isYes:true,  label:'예'    },
  { id:9, from:4, to:8, isYes:false, label:'아니오' },
];

// ── SVG 트리 ──────────────────────────────────────────────────────────────────
function TreeSVG({ visited }: { visited: number[] }) {
  const visitedSet = new Set(visited);
  const curId = visited.length > 0 ? visited[visited.length - 1] : -1;
  const visitedEdgeIds = new Set<number>();
  for (let i = 0; i < visited.length - 1; i++) {
    const e = EDGES.find(e => e.from === visited[i] && e.to === visited[i+1]);
    if (e) visitedEdgeIds.add(e.id);
  }
  const nMap = Object.fromEntries(NODES.map(n => [n.id, n]));

  return (
    <svg viewBox="0 0 1210 600" width="100%" style={{ display:'block' }}>
      {EDGES.map(edge => {
        const fn = nMap[edge.from], tn = nMap[edge.to];
        const x1=fn.cx, y1=fn.y+fn.h, x2=tn.cx, y2=tn.y;
        // 직각선: 아래→수평→아래
        const hy = y1 + 28; // 수평 꺾임 높이
        const path = `M${x1},${y1} L${x1},${hy} L${x2},${hy} L${x2},${y2}`;
        const active = visitedEdgeIds.has(edge.id);
        // 예=초록, 아니오=주황, 미방문=회색
        const activeCol = edge.isYes ? 'oklch(0.50 0.16 150)' : 'oklch(0.52 0.19 25)';
        const idleCol = edge.isYes ? 'oklch(0.78 0.09 150)' : 'oklch(0.78 0.09 25)';
        const col = active ? activeCol : idleCol;
        // 라벨: 수평 구간 중앙 위
        const lx = (x1+x2)/2, ly = hy - 8;
        const lw = edge.isYes ? 36 : 56, lh = 20;
        return (
          <g key={edge.id}>
            <path d={path} fill="none" stroke={col} strokeWidth={active?3:1.5}
              strokeLinejoin="round" opacity={active?1:0.6}/>
            <rect x={lx-lw/2} y={ly-lh/2-1} width={lw} height={lh} rx={4}
              fill={active?(edge.isYes?'oklch(0.94 0.055 150)':'oklch(0.97 0.04 25)'):'#f6f5f2'}
              stroke={col} strokeWidth={0.8}/>
            <text x={lx} y={ly+5} textAnchor="middle" fontSize="11.5"
              fontFamily="var(--font-mono)" fontWeight={active?'700':'500'} fill={col}>
              {edge.label}
            </text>
          </g>
        );
      })}
      {NODES.map(node => {
        const x = node.cx - node.w/2;
        const isVisited = visitedSet.has(node.id);
        const isCurrent = node.id === curId;
        const isLeaf = node.type === 'leaf';
        let fill='#fff', stroke='#d8d4cb', sw=1.5, textCol='#1b1a17';
        if (isLeaf && isVisited) {
          if (node.result==='p'){fill='oklch(0.96 0.04 25)'; stroke='oklch(0.80 0.12 25)'; sw=2.5; textCol='oklch(0.50 0.19 25)';}
          else                  {fill='oklch(0.94 0.06 150)';stroke='oklch(0.75 0.12 150)';sw=2.5; textCol='oklch(0.40 0.16 150)';}
        } else if (isCurrent) {
          fill='oklch(0.92 0.004 0)'; stroke='oklch(0.45 0.005 0)'; sw=2.5;
        } else if (isVisited) {
          fill='#faf9f6'; stroke='oklch(0.80 0.09 25)'; sw=2;
        }
        const yt1 = node.line2 ? node.y+22 : node.y+node.h/2+5;
        const yt2 = node.y+node.h-14;
        return (
          <g key={node.id}>
            {isCurrent && (
              <rect x={x-6} y={node.y-6} width={node.w+12} height={node.h+12} rx={13}
                fill="none" stroke="oklch(0.45 0.005 0)" strokeWidth={1.2}
                strokeDasharray="6 4" opacity={0.6}/>
            )}
            <rect x={x} y={node.y} width={node.w} height={node.h} rx={8}
              fill={fill} stroke={stroke} strokeWidth={sw}/>
            <text x={node.cx} y={yt1} textAnchor="middle"
              fontSize={isLeaf?15:14} fontFamily="var(--font-mono)" fontWeight="700" fill={textCol}>
              {node.line1}
            </text>
            {node.line2 && (
              <text x={node.cx} y={yt2} textAnchor="middle" fontSize="12"
                fontFamily="var(--font-mono)" fill='#8f897d'>
                {node.line2}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── 속성 카드 행 ──────────────────────────────────────────────────────────────
function AttrRow({ label, value, eng, active, warn }: { label:string; value:string; eng:string; active?:boolean; warn?:boolean }) {
  return (
    <div style={{
      padding:'8px 12px', borderRadius:'var(--radius-sm)', marginBottom:5,
      border: active?'2px solid oklch(0.45 0.005 0)':'1px solid var(--border)',
      background: active?'oklch(0.92 0.004 0)':'var(--surface)', transition:'all .18s',
    }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--ink-3)', letterSpacing:'.04em', marginBottom:3 }}>
        {label}
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:5, whiteSpace:'nowrap' }}>
        <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13,
          color: warn?'var(--accent-strong)': active?'var(--ink)':'var(--ink)' }}>
          {value}
        </span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--ink-4)' }}>({eng})</span>
      </div>
    </div>
  );
}

// ── 노드 설명 ─────────────────────────────────────────────────────────────────
function getDesc(m: Mushroom, nodeId: number) {
  const cases: Record<number, { question:string; attrLabel:string; attrVal:string }> = {
    0:{ question:"냄새(odor) == 'none' (무취)?", attrLabel:'냄새', attrVal:`${ODOR_KO[m.odor]??m.odor} (${m.odor})` },
    1:{ question:"냄새(odor) == 'almond' (아몬드향)?", attrLabel:'냄새', attrVal:`${ODOR_KO[m.odor]??m.odor} (${m.odor})` },
    2:{ question:"포자 색깔 == 'green' (초록)?", attrLabel:'포자 색깔', attrVal:`${SPORE_KO[m.sporeColor]??m.sporeColor} (${m.sporeColor})` },
    4:{ question:"냄새(odor) == 'anise' (아니스향)?", attrLabel:'냄새', attrVal:`${ODOR_KO[m.odor]??m.odor} (${m.odor})` },
    6:{ question:"아가미 크기 == 'narrow' (좁음)?", attrLabel:'아가미', attrVal:`${GILL_KO[m.gillSize]??m.gillSize} (${m.gillSize})` },
  };
  return cases[nodeId] ?? null;
}

const NODE_ATTR: Record<number,string> = { 0:'odor',1:'odor',2:'sporeColor',4:'odor',6:'gillSize' };
const EDIBLE_IDS = new Set([3,7,10]);

// ── 페이지 ────────────────────────────────────────────────────────────────────
export default function SimulatePage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [visited, setVisited] = useState<number[]>([]);
  const [toast, setToast] = useState('');
  // 완료된 버섯 인덱스 → 판별 결과 ('e'=식용, 'p'=독)
  const [resultMap, setResultMap] = useState<Record<number, 'e' | 'p'>>({});
  const toastRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    try {
      const saved = localStorage.getItem(`caggle.simResult.${s.username}`);
      if (saved) setResultMap(JSON.parse(saved));
    } catch {}
  }, [router]);

  // resultMap 변경 시 localStorage 저장
  useEffect(() => {
    const s = getSession();
    if (!s || Object.keys(resultMap).length === 0) return;
    localStorage.setItem(`caggle.simResult.${s.username}`, JSON.stringify(resultMap));
  }, [resultMap]);

  const m = SAMPLES[idx];
  const curId = visited.length > 0 ? visited[visited.length-1] : null;
  const isIdle = visited.length === 0;
  const atLeaf = curId !== null && LEAF_IDS.has(curId);
  const isEdible = atLeaf && curId !== null && EDIBLE_IDS.has(curId);
  const curAttr = curId !== null ? NODE_ATTR[curId] : null;
  const desc = curId !== null ? getDesc(m, curId) : null;

  // 리프 도달 시 resultMap 기록
  useEffect(() => {
    if (atLeaf && curId !== null) {
      setResultMap(prev => ({ ...prev, [idx]: EDIBLE_IDS.has(curId) ? 'e' : 'p' }));
    }
  }, [atLeaf, curId, idx]);

  const changeIdx = (i: number) => { setIdx(i); setVisited([]); setToast(''); };

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2500);
  };

  const handleAnswer = (isYes: boolean) => {
    if (curId === null || atLeaf) return;
    const correct = getCorrectAnswer(curId, m);
    if (isYes !== correct) { showToast('속성과 다른 입력입니다'); return; }
    const next = TREE_NEXT[curId];
    if (!next) return;
    setVisited(v => [...v, isYes ? next.yes : next.no]);
  };

  const goBack = () => setVisited(v => v.slice(0, -1));

  return (
    <div style={{ minHeight:'100vh' }}>
      <Topbar />

      {/* 제목 */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'16px 32px' }}>
        <h1 style={{ fontSize:22 }}>독버섯 판별 트리 시뮬레이터</h1>
      </div>

      {/* 샘플 선택 */}
      <div style={{ background:'var(--surface-2)', borderBottom:'1px solid var(--border)', padding:'10px 32px' }}>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          <span className="kicker" style={{ marginRight:6, flexShrink:0 }}>버섯 선택</span>
          {SAMPLES.map((s, i) => {
            const sel = idx === i;
            const res = resultMap[i]; // 'e' | 'p' | undefined
            const good = res === 'e';
            return (
              <button key={i} onClick={() => changeIdx(i)} style={{
                height: 30, padding: '0 11px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 12.5, whiteSpace: 'nowrap',
                fontWeight: sel ? 700 : 500,
                border: res
                  ? `1.5px solid ${good ? 'oklch(0.65 0.14 150)' : 'oklch(0.70 0.16 25)'}`
                  : sel ? '1.5px solid var(--accent)' : '1px solid var(--border-2)',
                background: res
                  ? (good ? 'oklch(0.90 0.09 150)' : 'oklch(0.92 0.07 25)')
                  : sel ? 'var(--accent-soft-2)' : 'var(--surface)',
                color: res
                  ? (good ? 'oklch(0.32 0.16 150)' : 'oklch(0.42 0.20 25)')
                  : sel ? 'var(--accent-strong)' : 'var(--ink-2)',
              }}>
                🍄 {s.name}
                {res && (
                  <span style={{ marginLeft: 5, fontSize: 13, fontWeight: 800 }}>
                    {good ? '✓' : '☠'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 본문 */}
      <div style={{ padding:'20px 32px 80px', display:'grid', gridTemplateColumns:'200px 1fr 260px', gap:20, alignItems:'start' }}>

        {/* 왼쪽: 속성 카드 */}
        <aside>
          <div className="card card-pad">
            <div style={{ textAlign:'center', marginBottom:14 }}>
              <div style={{ fontSize:48 }}>🍄</div>
              <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:15, marginTop:6 }}>{m.name}</div>
            </div>
            <span className="kicker" style={{ display:'block', marginBottom:8 }}>속성값</span>
            <AttrRow label="냄새" value={ODOR_KO[m.odor]??m.odor} eng={m.odor}
              active={curAttr==='odor'} warn={!['none','almond','anise'].includes(m.odor)}/>
            <AttrRow label="포자 색깔" value={SPORE_KO[m.sporeColor]??m.sporeColor} eng={m.sporeColor}
              active={curAttr==='sporeColor'} warn={m.sporeColor==='green'}/>
            <AttrRow label="아가미" value={GILL_KO[m.gillSize]??m.gillSize} eng={m.gillSize}
              active={curAttr==='gillSize'}/>
          </div>
        </aside>

        {/* 가운데: 트리 SVG */}
        <div className="card" style={{ padding:'18px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h3>결정 트리</h3>
            <div style={{ display:'flex', gap:12, fontSize:12, fontFamily:'var(--font-mono)', color:'var(--ink-3)' }}>
              {[
                { col:'oklch(0.94 0.06 150)', bdr:'oklch(0.75 0.12 150)', label:'식용' },
                { col:'oklch(0.96 0.04 25)',  bdr:'oklch(0.80 0.12 25)',  label:'독버섯' },
                { col:'var(--accent-soft-2)', bdr:'var(--accent)',         label:'현재 노드' },
              ].map(({ col, bdr, label }) => (
                <span key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:11, height:11, borderRadius:3, display:'inline-block', background:col, border:`1.5px solid ${bdr}`, verticalAlign:'middle' }}/>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <TreeSVG visited={visited}/>
        </div>

        {/* 오른쪽: 단계 패널 */}
        <aside>
          <div className="card card-pad" style={{ display:'flex', flexDirection:'column', gap:14 }}>


            {/* 상태별 콘텐츠 */}
            {isIdle && (
              <div style={{ textAlign:'center', padding:'20px 0', color:'var(--ink-3)' }}>
                <div style={{ fontSize:30, marginBottom:8 }}>🔍</div>
                <p style={{ fontSize:13, lineHeight:1.6, margin:0 }}>
                  시작을 누르면 각 노드에서 <b>예</b> 또는 <b>아니오</b>를 직접 선택해 트리를 따라가세요.
                </p>
              </div>
            )}

            {!isIdle && !atLeaf && desc && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {/* 질문 */}
                <div style={{ padding:'10px 12px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, lineHeight:1.5 }}>
                  {desc.question}
                </div>
                {/* 속성값 참고 */}
                <div style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.5 }}>
                  <span style={{ color:'var(--ink-3)', fontSize:11, fontFamily:'var(--font-mono)' }}>{desc.attrLabel}: </span>
                  <b>{desc.attrVal}</b>
                </div>
                {/* 예/아니오 버튼 */}
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <button onClick={() => handleAnswer(true)} style={{
                    flex:1, height:54, borderRadius:'var(--radius)',
                    border:'2px solid oklch(0.72 0.14 150)', background:'oklch(0.95 0.05 150)',
                    color:'oklch(0.38 0.16 150)', fontFamily:'var(--font-mono)', fontWeight:700,
                    fontSize:17, cursor:'pointer', transition:'transform .08s, background .1s',
                  }}
                  onMouseEnter={e=>(e.currentTarget.style.background='oklch(0.90 0.07 150)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='oklch(0.95 0.05 150)')}
                  >
                    예 ✓
                  </button>
                  <button onClick={() => handleAnswer(false)} style={{
                    flex:1, height:54, borderRadius:'var(--radius)',
                    border:'2px solid var(--accent-border)', background:'var(--accent-soft-2)',
                    color:'var(--accent-strong)', fontFamily:'var(--font-mono)', fontWeight:700,
                    fontSize:17, cursor:'pointer', transition:'background .1s',
                  }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--accent-soft)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='var(--accent-soft-2)')}
                  >
                    아니오 ✗
                  </button>
                </div>
              </div>
            )}

            {/* 최종 결과 */}
            {atLeaf && curId !== null && (
              <div style={{
                padding:'16px', borderRadius:'var(--radius)', textAlign:'center',
                background:isEdible?'oklch(0.92 0.07 150)':'oklch(0.95 0.05 25)',
                border:`2px solid ${isEdible?'oklch(0.72 0.14 150)':'oklch(0.78 0.12 25)'}`,
              }}>
                <div style={{ fontSize:34 }}>{isEdible?'✅':'☠️'}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:18, marginTop:8,
                  color:isEdible?'oklch(0.38 0.16 150)':'oklch(0.48 0.20 25)' }}>
                  {isEdible?'식용 가능':'독버섯 — 위험!'}
                </div>
              </div>
            )}

            {/* 컨트롤 버튼 */}
            <div style={{ display:'flex', gap:8 }}>
              {isIdle ? (
                <button className="btn btn-primary btn-block" onClick={() => setVisited([0])}>▶ 시작</button>
              ) : (
                <>
                  <button className="btn btn-ghost btn-sm" disabled={visited.length===0} onClick={goBack}>← 이전</button>
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={() => { setVisited([]); }}>↩ 처음</button>
                </>
              )}
            </div>

          </div>
        </aside>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{
          position:'fixed', bottom:36, left:'50%', transform:'translateX(-50%)',
          background:'#1b1a17', color:'#fff',
          padding:'12px 22px', borderRadius:'var(--radius)',
          fontFamily:'var(--font-mono)', fontSize:14, fontWeight:600,
          zIndex:9999, boxShadow:'0 8px 32px rgba(28,27,24,.30)',
          display:'flex', alignItems:'center', gap:10, whiteSpace:'nowrap',
          pointerEvents:'none',
        }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          {toast}
        </div>
      )}
    </div>
  );
}
