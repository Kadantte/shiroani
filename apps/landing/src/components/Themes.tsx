type Theme = {
  id: string;
  name: string;
  sub: string;
};

const THEMES: Theme[] = [
  { id: 'plum', name: 'Plum', sub: 'DOMYŚLNY' },
  { id: 'noir', name: 'Noir', sub: 'MONOCHROMATYCZNY' },
  { id: 'matcha', name: 'Matcha', sub: 'ZIELONY CHŁÓD' },
  { id: 'iced', name: 'Iced', sub: 'BŁĘKITNA NOC' },
  { id: 'ember', name: 'Ember', sub: 'CIEPŁA POMARAŃCZA' },
  { id: 'paper', name: 'Paper', sub: 'TRYB JASNY' },
];

export function Themes() {
  return (
    <section className="themes" id="motywy-grid">
      <div className="themes-grid">
        {THEMES.map(t => (
          <div key={t.id} className="th" data-t={t.id}>
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
          </div>
        ))}
      </div>
    </section>
  );
}
