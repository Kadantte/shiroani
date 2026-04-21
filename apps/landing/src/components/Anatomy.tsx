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
        x: 12,
        y: 6,
        title: 'Nagłówek',
        text: 'Nazwa widoku i licznik pozycji.',
      },
      {
        x: 87,
        y: 5,
        title: 'Akcje',
        text: 'Sortowanie, import, eksport, statystyki oraz przełącznik siatki i listy.',
      },
      {
        x: 10,
        y: 22,
        title: 'Filtry statusu',
        text: 'Sześć statusów: Wszystkie, Oglądam, Ukończone, Planowane, Wstrzymane, Porzucone.',
      },
      {
        x: 28,
        y: 40,
        title: 'Karty serii',
        text: 'Okładki z biblioteki, postęp (Odc. 8/12), badge statusu. Klik otwiera szczegóły i pamiętnik.',
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
        y: 11,
        title: 'Zakres tygodnia',
        text: 'Zakres dat u góry widoku. Dane lecą na żywo z AniList.',
      },
      {
        x: 21,
        y: 15,
        title: 'Dzień aktywny',
        text: 'Dzisiejszy dzień wyróżniony kolorem. Obok numer dnia i skrót nazwy tygodnia.',
      },
      {
        x: 28,
        y: 38,
        title: 'Karta odcinka',
        text: 'Plakat, numer odcinka i godzina emisji. Podświetlenie dla serii z biblioteki oraz z subskrypcji.',
      },
    ],
  },
  newtab: {
    src: '/assets/screenshot_newtab.webp',
    t: 'Nowa karta z powitaniem i ulubionymi stronami pod ręką.',
    label: 'Nowa karta',
    viewLabel: 'Widok · Nowa karta',
    pins: [
      {
        x: 22,
        y: 18,
        title: 'Powitanie',
        text: 'Powitanie z imieniem i podsumowaniem dnia: odcinki dzisiaj oraz nowości w subskrypcjach.',
      },
      {
        x: 50,
        y: 31,
        title: 'Emitowane dzisiaj',
        text: 'Poziomy pasek z odcinkami, które emitują się dzisiaj, wraz z godziną premiery.',
      },
      {
        x: 25,
        y: 57,
        title: 'Szybki dostęp',
        text: 'Kafelki z ulubionymi stronami. Ikona, nazwa i konfiguracja w jednym kliknięciu.',
      },
    ],
  },
  settings: {
    src: '/assets/screenshot_settings.webp',
    t: 'Ustawienia: czytelność, motywy, integracje.',
    label: 'Ustawienia',
    viewLabel: 'Widok · Ustawienia',
    pins: [
      {
        x: 7,
        y: 50,
        title: 'Kategorie',
        text: 'Pięć grup ustawień: Aplikacja, Wygląd, Integracje, Dane, Zaawansowane.',
      },
      {
        x: 22,
        y: 19,
        title: 'Czytelność',
        text: 'Skala tekstu i interfejsu. Pięć poziomów od 95% do 115%.',
      },
      {
        x: 40,
        y: 58,
        title: 'Motywy kolorystyczne',
        text: '17 wbudowanych palet: 15 ciemnych i 2 jasne. Kliknięcie zastosuje motyw od razu.',
      },
      {
        x: 62,
        y: 33,
        title: 'Import własnego motywu',
        text: 'Zaimportuj motyw z pliku lub zbuduj własny w edytorze z podglądem na żywo.',
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
