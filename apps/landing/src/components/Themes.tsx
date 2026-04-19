import { useState, useEffect } from 'react';

type Theme = {
  id: string;
  name: string;
  sub: string;
};

const THEMES: Theme[] = [
  { id: 'plum', name: 'Plum', sub: 'DOMYŚLNY' },
  { id: 'noir', name: 'Noir', sub: 'MONOCHROME' },
  { id: 'matcha', name: 'Matcha', sub: 'ZIELONY CHŁÓD' },
  { id: 'iced', name: 'Iced', sub: 'BŁĘKITNA NOC' },
  { id: 'ember', name: 'Ember', sub: 'CIEPŁA POMARAŃCZ' },
  { id: 'paper', name: 'Paper', sub: 'JASNY TRYB' },
];

export function Themes() {
  const [active, setActive] = useState('plum');

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('theme-transitioning');
    html.setAttribute('data-theme', active);
    const t = window.setTimeout(() => html.classList.remove('theme-transitioning'), 500);
    return () => window.clearTimeout(t);
  }, [active]);

  return (
    <section className="themes" id="motywy-grid">
      <div className="themes-grid">
        {THEMES.map(t => (
          <button
            key={t.id}
            className={`th${active === t.id ? ' on' : ''}`}
            data-t={t.id}
            onClick={() => setActive(t.id)}
            aria-pressed={active === t.id}
          >
            <div className="mini">
              <span className="sw"></span>
              <div>
                <span className="nm">{t.name}</span>
                <small>{t.sub}</small>
              </div>
            </div>
            <div className="strip">
              <div className="a"></div>
              <div className="b"></div>
              <div className="c"></div>
              <div className="d"></div>
            </div>
            <div className="demo-card">
              <span className="dot"></span>
              <b>Frieren EP 28</b>
              <span>22:30</span>
            </div>
            <div className="use">{active === t.id ? 'Aktywny ·' : 'Użyj →'}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
