// accent-tweak.jsx — shared Tweaks panel for caggle.
// Only tweak: accent color (hue-driven). Persists to localStorage so the
// choice carries across all four pages.

const ACCENT_PRESETS = [
  { name: '레드오렌지', h: 25 },
  { name: '골드',     h: 80 },
  { name: '그린',     h: 150 },
  { name: '블루',     h: 250 },
  { name: '바이올렛', h: 300 },
];

const ACCENT_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentH": 25
}/*EDITMODE-END*/;

function applyAccent(h) {
  document.documentElement.style.setProperty('--accent-h', h);
  try { localStorage.setItem('caggle.accentH', String(h)); } catch (e) {}
}

function CaggleTweaks() {
  const [t, setTweak] = useTweaks(ACCENT_DEFAULTS);

  // On first mount, prefer a cross-page localStorage value if present.
  React.useEffect(() => {
    let h = t.accentH;
    try {
      const saved = localStorage.getItem('caggle.accentH');
      if (saved != null) h = Number(saved);
    } catch (e) {}
    applyAccent(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => { applyAccent(t.accentH); }, [t.accentH]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="액센트 컬러" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ACCENT_PRESETS.map((p) => {
          const on = Number(t.accentH) === p.h;
          return (
            <button
              key={p.h}
              onClick={() => setTweak('accentH', p.h)}
              title={p.name}
              style={{
                width: 40, height: 40, borderRadius: 9, cursor: 'default',
                background: `oklch(0.62 0.20 ${p.h})`,
                border: on ? '2.5px solid #29261b' : '2px solid rgba(255,255,255,.7)',
                boxShadow: on ? '0 0 0 2px rgba(255,255,255,.9)' : '0 1px 3px rgba(0,0,0,.18)',
                outline: 'none', transition: 'transform .1s',
                transform: on ? 'scale(1.06)' : 'none',
              }}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, color: 'rgba(41,38,27,.5)', fontFamily: 'IBM Plex Mono, monospace' }}>
        --accent-h: {t.accentH}
      </div>
    </TweaksPanel>
  );
}

(function mountTweaks() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  ReactDOM.createRoot(el).render(<CaggleTweaks />);
})();
