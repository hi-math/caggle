'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, setSession, getUsers, seedAdmin } from '@/lib/storage';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    seedAdmin();
    if (getSession()) router.replace('/simulate');
  }, [router]);

  const doLogin = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = username.trim();
    if (!trimmed) { setError('사용자명을 입력하세요.'); return; }
    const users = getUsers();
    const record = users[trimmed];
    if (!record) { setError('존재하지 않는 사용자명입니다. 어드민에게 계정 생성을 요청하세요.'); return; }
    setSession({ username: trimmed, role: record.role });
    router.push('/simulate');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr .95fr', background: 'var(--surface)' }}>
      {/* LEFT BRAND */}
      <section style={{
        padding: '48px 56px', display: 'flex', flexDirection: 'column',
        backgroundImage: 'linear-gradient(var(--bg-grid) 1px,transparent 1px),linear-gradient(90deg,var(--bg-grid) 1px,transparent 1px)',
        backgroundSize: '30px 30px', borderRight: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <div className="brand">
          <img src="/cau.png" alt="CAU" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
        </div>

        <div style={{ marginTop: 64, maxWidth: 460 }}>
          <span className="kicker accent">DECISION-TREE COMPETITIONS</span>
          <h1 style={{ marginTop: 14, fontSize: 38, lineHeight: 1.12, letterSpacing: '-.025em' }}>
            트리를 키우고,<br />
            <span style={{ color: 'var(--accent)' }}>리더보드</span>를 오르세요.
          </h1>
          <p className="muted" style={{ fontSize: '15.5px', marginTop: 16 }}>
            손으로 직접 의사결정 규칙을 설계하고, 보이지 않는 데이터에 대한 정확도로 순위를 겨룹니다.
          </p>
        </div>

        <div style={{ marginTop: 30, alignSelf: 'center', width: '100%', maxWidth: 560 }}>
          <svg viewBox="0 0 560 300" width="100%" aria-label="decision tree diagram">
            <path className="tree-edge" d="M280 76 C 280 110, 130 110, 130 138" />
            <path className="tree-edge" d="M280 76 C 280 110, 400 110, 400 138" />
            <path className="tree-edge" d="M400 184 C 400 218, 300 218, 300 246" />
            <path className="tree-edge" d="M400 184 C 400 218, 500 218, 500 246" />
            <text className="tree-edge-lab" x="168" y="108">Na_to_K ≥ 15</text>
            <text className="tree-edge-lab" x="348" y="108">그 외</text>
            <g className="tree-node root"><rect x="205" y="30" width="150" height="46" rx="7" />
              <text className="tree-label" x="280" y="52" textAnchor="middle">Na_to_K ≥ 15</text>
              <text className="tree-sub" x="280" y="67" textAnchor="middle">gini 0.699 · n=200</text></g>
            <g className="tree-node leaf-c1"><rect x="55" y="138" width="150" height="46" rx="7" />
              <text className="tree-label" x="130" y="160" textAnchor="middle">Drug Y</text>
              <text className="tree-sub" x="130" y="175" textAnchor="middle">n=91 · pure</text></g>
            <g className="tree-node"><rect x="325" y="138" width="150" height="46" rx="7" />
              <text className="tree-label" x="400" y="160" textAnchor="middle">BP = ?</text>
              <text className="tree-sub" x="400" y="175" textAnchor="middle">gini 0.72 · n=109</text></g>
            <g className="tree-node leaf-c2"><rect x="225" y="246" width="150" height="46" rx="7" />
              <text className="tree-label" x="300" y="268" textAnchor="middle">Drug C / X</text></g>
            <g className="tree-node leaf-c3"><rect x="425" y="246" width="150" height="46" rx="7" />
              <text className="tree-label" x="500" y="268" textAnchor="middle">Drug A / B / X</text></g>
          </svg>
        </div>

        <div style={{ marginTop: 'auto', maxWidth: 460 }}>
          <div className="term">
            <div className="term-bar">
              <span className="dot" style={{ background: '#e05a4a' }} />
              <span className="dot" style={{ background: '#e6b450' }} />
              <span className="dot" style={{ background: '#5aa86a' }} />
              <span style={{ marginLeft: 6 }}>caggle — drug200 challenge</span>
            </div>
            <div className="term-body">
              <span className="prompt">$</span>{' '}
              <span className="c-str">caggle score --mode practice</span>{'\n'}
              <span className="c-key">accuracy</span> ={' '}
              <span className="c-num">0.94</span>
              {'   '}node_count=<span className="c-num">7</span>
              {'   '}macro_f1=<span className="c-num">0.931</span>{'\n'}
              <span className="c-str">▲ +0.06 vs baseline</span>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT FORM */}
      <section style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {error && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--accent-strong)' }}>
              {error}
            </div>
          )}
          <form onSubmit={doLogin} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label>사용자명</label>
              <input
                className="input"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="username"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 2 }}>
              입장 →
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
