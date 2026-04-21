import { useState } from 'react';

type Pin = { x: number; y: number; title: string; text: string };
type TabKey = 'library' | 'schedule' | 'newtab' | 'settings';

const ANA: Record<
  TabKey,
  { src: string; t: string; label: string; viewLabel: string; pins: Pin[] }
> = {
  library: {
    src: '/assets/screenshot_library.webp',
    t: 'Twoja półka z tytułami. Statusy, postęp, okładki.',
    label: 'Biblioteka',
    viewLabel: 'Widok · Biblioteka',
    pins: [
      {
        x: 8,
        y: 10,
        title: 'Nagłówek',
        text: 'Nazwa widoku i licznik pozycji. Obok: import, eksport, statystyki i przełącznik siatka/lista.',
      },
      {
        x: 22,
        y: 30,
        title: 'Filtry statusu',
        text: 'Sześć statusów: Wszystkie, Oglądam, Ukończone, Planowane, Wstrzymane, Porzucone.',
      },
      {
        x: 10,
        y: 55,
        title: 'Karty serii',
        text: 'Okładki z biblioteki, postęp (Odc. 8/12), badge statusu. Klik otwiera szczegóły i pamiętnik.',
      },
      {
        x: 50,
        y: 95,
        title: 'Pływający dock',
        text: 'Przełączanie między sekcjami. Chowa się sam, wraca, gdy najedziesz kursorem.',
      },
    ],
  },
  schedule: {
    src: '/assets/screenshot_schedule.webp',
    t: 'Harmonogram emisji prosto z AniList.',
    label: 'Harmonogram',
    viewLabel: 'Widok · Harmonogram',
    pins: [
      {
        x: 5,
        y: 10,
        title: 'Zakres tygodnia',
        text: 'Strzałki w przód i w tył oraz konkretny zakres dat. Dane lecą na żywo z AniList.',
      },
      {
        x: 50,
        y: 18,
        title: 'Dzień aktywny',
        text: 'Dzisiejszy dzień wyróżniony kolorem. Obok numer dnia i liczba premier.',
      },
      {
        x: 20,
        y: 50,
        title: 'Karta odcinka',
        text: 'Plakat, numer odcinka, godzina emisji, ocena. Kliknij, by dodać serię do biblioteki.',
      },
    ],
  },
  newtab: {
    src: '/assets/screenshot_newtab.webp',
    t: 'Nowa karta z ulubionymi stronami pod ręką.',
    label: 'Nowa karta',
    viewLabel: 'Widok · Nowa karta',
    pins: [
      {
        x: 50,
        y: 11,
        title: 'Pasek adresu',
        text: 'Wpisz adres albo frazę. Działa tak samo na stronach anime i w Google.',
      },
      {
        x: 30,
        y: 40,
        title: 'Szybki dostęp',
        text: 'Kafelki z ulubionymi stronami. Ikona, nazwa i konfiguracja w jednym kliknięciu.',
      },
      {
        x: 30,
        y: 70,
        title: 'Ostatnio odwiedzane',
        text: 'Ostatnio odwiedzane strony. Sekcja pojawia się, kiedy jest co pokazać.',
      },
    ],
  },
  settings: {
    src: '/assets/screenshot_settings.webp',
    t: 'Ustawienia: motywy, tła, dock.',
    label: 'Ustawienia',
    viewLabel: 'Widok · Ustawienia',
    pins: [
      {
        x: 5,
        y: 20,
        title: 'Kategorie',
        text: 'Wygląd, Przeglądarka, Powiadomienia, Discord, Maskotka, Dane, Aktualizacje, O aplikacji.',
      },
      {
        x: 30,
        y: 15,
        title: 'Dock nawigacyjny',
        text: 'Autoukrywanie, etykiety, swobodne przeciąganie i powrót do pozycji startowej.',
      },
      {
        x: 30,
        y: 50,
        title: 'Własne tło',
        text: 'Dowolny obraz albo GIF. Suwaki przezroczystości i rozmycia, żeby wszystko dobrze się czytało.',
      },
      {
        x: 30,
        y: 90,
        title: 'Motywy anime',
        text: '15 palet inspirowanych tytułami i edytor własnych motywów z podglądem na żywo.',
      },
    ],
  },
};

const TAB_ORDER: TabKey[] = ['library', 'schedule', 'newtab', 'settings'];

export function Anatomy() {
  const [tab, setTab] = useState<TabKey>('library');
  const [pin, setPin] = useState(0);

  const data = ANA[tab];
  const active = data.pins[pin];

  const handleTab = (t: TabKey) => {
    setTab(t);
    setPin(0);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (currentIndex + dir + TAB_ORDER.length) % TAB_ORDER.length;
    handleTab(TAB_ORDER[next]);
    const nextEl = document.getElementById(`ana-tab-${TAB_ORDER[next]}`);
    nextEl?.focus();
  };

  return (
    <section className="anatomy">
      <div className="ana-wrap">
        <div className="ana-tabs" role="tablist" aria-label="Anatomia widoków aplikacji">
          {TAB_ORDER.map((t, i) => (
            <button
              key={t}
              id={`ana-tab-${t}`}
              className={`ana-tab${tab === t ? ' on' : ''}`}
              onClick={() => handleTab(t)}
              onKeyDown={e => handleTabKeyDown(e, i)}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`ana-panel-${t}`}
              tabIndex={tab === t ? 0 : -1}
            >
              <span className="tn">{`0${i + 1}`}</span>
              {ANA[t].label}
            </button>
          ))}
        </div>
        <div
          className="ana-stage"
          role="tabpanel"
          id={`ana-panel-${tab}`}
          aria-labelledby={`ana-tab-${tab}`}
        >
          <div className="ana-screen">
            <img src={data.src} alt={data.label} decoding="async" />
            {data.pins.map((p, i) => (
              <button
                key={i}
                className={`ana-pin${i === pin ? ' active' : ''}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onClick={() => setPin(i)}
                aria-label={p.title}
                aria-describedby={i === pin ? 'ana-note' : undefined}
                aria-pressed={i === pin}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <aside className="ana-detail">
            <div>
              <h4>{data.viewLabel}</h4>
              <h3>{data.t}</h3>
            </div>
            <div className="ana-note" id="ana-note" aria-live="polite">
              <b>{`Pin 0${pin + 1} · ${active.title}`}</b>
              {active.text}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
