'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSession, clearSession, getUsers, updateTeamName } from '@/lib/storage';
import { upsertProfile } from '@/lib/supabase';

const NAV = [
  { href: '/simulate', label: '시뮬레이션' },
  { href: '/practice', label: '연습' },
  { href: '/exam',     label: '실전' },
  { href: '/leaderboard', label: '리더보드' },
];

export default function Topbar() {
  const pathname = usePathname();
  const [username, setUsername] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) return;
    setUsername(s.username);
    setIsAdmin(s.role === 'admin');
    const users = getUsers();
    setTeamName(users[s.username]?.teamName ?? '');
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = () => { setDraft(teamName); setEditing(true); };

  const saveEdit = () => {
    const s = getSession();
    if (s) {
      const trimmed = draft.trim();
      updateTeamName(s.username, trimmed);   // localStorage
      upsertProfile(s.username, trimmed).catch(console.error); // Supabase
      setTeamName(trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <header className="topbar">
      <Link href="/simulate" className="brand">
        <img src="/cau.png" alt="CAU" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
      </Link>

      <nav className="nav">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} className={pathname === href ? 'active' : ''}>{label}</Link>
        ))}
        {isAdmin && (
          <Link href="/admin" className={pathname === '/admin' ? 'active' : ''}>어드민</Link>
        )}
      </nav>

      <div className="spacer" />

      {/* name + team name */}
      {username && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {username}
          </span>

          {!editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                {teamName
                  ? <span style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>팀: {teamName}</span>
                  : <span style={{ color: 'var(--ink-4)' }}>팀명 없음</span>
                }
              </span>
              {!isAdmin && (
                <button
                  onClick={startEdit}
                  title="팀명 수정"
                  style={{ appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 13, padding: '2px 4px', borderRadius: 4, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-4)')}
                >
                  ✏
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="팀명 입력"
                style={{ height: 28, padding: '0 8px', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 12, width: 120, outline: 'none', background: 'var(--surface)' }}
              />
              <button onClick={saveEdit} style={{ appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer', color: 'oklch(0.55 0.15 150)', fontSize: 15, padding: '2px 4px' }}>✓</button>
              <button onClick={cancelEdit} style={{ appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, padding: '2px 4px' }}>✕</button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => { clearSession(); location.href = '/login'; }}
        className="btn btn-ghost btn-sm"
        style={{ fontSize: 12, height: 28, padding: '0 10px' }}
      >
        로그아웃
      </button>
    </header>
  );
}
