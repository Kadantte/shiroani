export type CategorySlug =
  | 'feature'
  | 'polish'
  | 'fix'
  | 'security'
  | 'feed'
  | 'macos'
  | 'app'
  | 'bot';

export interface ReleaseCategory {
  slug: CategorySlug;
  label: string;
  // entries are rendered via set:html in ChangelogPage.astro to allow <code> tags.
  // Source is author-controlled static data only — never accept user input here.
  entries: string[];
}

export interface Release {
  version: string;
  date: string;
  dateShort: string;
  title: string;
  description: string;
  type: 'major' | 'minor';
  categories: ReleaseCategory[];
}

// Single source of truth for the version string shown in landing UI.
// Always derived from the first (latest) entry in `releases`.
export const currentVersion = (): string => releases[0].version;

export const releases: Release[] = [
  {
    version: '0.5.0',
    date: '13 kwietnia 2026',
    dateShort: '13.04.2026',
    type: 'major',
    title: 'Odkrywaj anime, pokaż swój profil i wracaj szybciej do oglądania',
    description:
      'Ta aktualizacja skupia się głównie na wygodzie. Pojawił się nowy widok Odkrywaj, profil AniList z kartą do udostępniania, lepsze powiadomienia na Windowsie i kilka zmian, które po prostu ułatwiają codzienne korzystanie z aplikacji.',
    categories: [
      {
        slug: 'feature',
        label: 'Nowe funkcje',
        entries: [
          'Odkrywaj: nowy widok z wyszukiwarką oraz zakładkami Na czasie, Popularne i Sezonowe',
          'Losowe: nowa zakładka w Odkrywaj do szukania anime po wybranych i wykluczonych gatunkach',
          'Profil AniList: statystyki oglądania dostępne po wpisaniu nazwy użytkownika, bez logowania',
          'Karta profilu PNG: profil możesz skopiować albo zapisać jako obrazek do udostępnienia',
          'Biblioteka i dziennik: sortowanie biblioteki, sortowanie wpisów w dzienniku i losowanie anime z listy do obejrzenia',
        ],
      },
      {
        slug: 'polish',
        label: 'Ulepszenia',
        entries: [
          'Powiadomienia na Windowsie działają pewniej i mogą pojawić się nawet po zamknięciu aplikacji',
          'Emitowane dzisiaj: nowy, bardziej zwarty układ z poziomymi kartami i Twoimi seriami na początku',
          'Dock nawigacyjny: w ustawieniach można ukryć nieużywane widoki',
          'Motywy: zostało 18 bardziej wyraźnych presetów, a te zbyt podobne do siebie usunęliśmy',
          'O aplikacji: nowy przycisk do otwierania folderu z logami',
        ],
      },
    ],
  },
  {
    version: '0.4.2',
    date: '10 kwietnia 2026',
    dateShort: '10.04.2026',
    type: 'minor',
    title: 'Poprawki stabilności i wygody',
    description:
      'Kilka drobnych poprawek zauważonych podczas korzystania z aplikacji. Aplikacja na Windowsie zamyka się teraz poprawnie, linki otwierają się wewnątrz aplikacji, a onboarding nie pojawia się ponownie bez potrzeby.',
    categories: [
      {
        slug: 'fix',
        label: 'Poprawki',
        entries: [
          'Aplikacja na Windowsie zamyka się całkowicie zamiast pozostawać w tle w zasobniku systemowym',
          'Linki otwierają się teraz we wbudowanej przeglądarce zamiast w przeglądarce systemowej',
          'Onboarding nie pojawia się ponownie bez potrzeby',
          'Poprawione ścieżki do assetów maskotki i skryptów wewnętrznych',
          'Poprawiono zapisywanie logów aplikacji do pliku',
        ],
      },
    ],
  },
  {
    version: '0.4.1',
    date: '9 kwietnia 2026',
    dateShort: '09.04.2026',
    type: 'minor',
    title: 'Aktualizacja bezpieczeństwa',
    description:
      'Mała, ale ważna aktualizacja. Odświeżyliśmy kilka bibliotek, na których opiera się aplikacja, żeby zamknąć zgłoszone luki bezpieczeństwa. Nie ma tu nowych funkcji, ale warto zainstalować ją jak najszybciej. Aktualizacja pobierze się automatycznie.',
    categories: [
      {
        slug: 'security',
        label: 'Bezpieczeństwo',
        entries: [
          'Zaktualizowany silnik Electron, na którym działa ShiroAni. Zamknięte zostały luki związane z obsługą okien, uprawnieniami procesów i wczytywaniem obrazów ze schowka',
          'Zaktualizowane biblioteki odpowiadające za komunikację bota Discord i wewnętrzny silnik aplikacji desktopowej',
          'Odświeżone zależności narzędziowe używane podczas budowania aplikacji, bez zmian w działaniu dla użytkowników',
        ],
      },
    ],
  },
  {
    version: '0.4.0',
    date: '8 kwietnia 2026',
    dateShort: '08.04.2026',
    type: 'major',
    title: 'Blokowanie reklam popupowych i skróty klawiszowe',
    description:
      'Wbudowana przeglądarka stała się znacznie przyjemniejsza w użyciu. Doszło inteligentne blokowanie popupów reklamowych z iframe video playerów, pełna obsługa skrótów klawiszowych i naprawiona ikona w zasobniku systemowym.',
    categories: [
      {
        slug: 'feature',
        label: 'Nowe funkcje',
        entries: [
          'Inteligentne blokowanie popupów filtruje wywołania <code>window.open</code> na podstawie list filtrów i reguł pochodzenia (tryb smart/strict/off)',
          'Skróty klawiszowe przeglądarki: Ctrl+W (zamknij kartę), Ctrl+T (nowa karta), Ctrl+Tab (przełącz karty), Ctrl+L (pasek adresu), Ctrl+R (odśwież), Alt+←/→ (nawigacja)',
          'Dodatkowe filtry adblocka blokują banery cookies i nakładki z prośbą o wyłączenie blokady',
          'Przycisk trybu blokowania popupów w pasku narzędzi z trzema trybami i kolorowymi ikonami',
        ],
      },
      {
        slug: 'fix',
        label: 'Poprawki',
        entries: [
          'Naprawiono ikonę w zasobniku systemowym. W spakowanej aplikacji brakowało pliku icon-32.png, teraz używany jest icon.ico',
          'Skróty klawiszowe działają nawet gdy webview ma fokus (przechwytywanie przez before-input-event w procesie głównym)',
          'Logowanie do kont Google działa poprawnie dzięki Firefox UA dla domen autoryzacyjnych',
          'Discord RPC: timer sesji nie resetuje się przy zmianie widoku ani trybu bezczynności',
        ],
      },
    ],
  },
  {
    version: '0.3.2',
    date: '6 kwietnia 2026',
    dateShort: '06.04.2026',
    type: 'minor',
    title: 'Google login i poprawki maskotki',
    description:
      'Naprawiono blokadę logowania do kont Google w wbudowanej przeglądarce oraz błędy ładowania nakładki maskotki w trybie deweloperskim.',
    categories: [
      {
        slug: 'fix',
        label: 'Poprawki',
        entries: [
          'Logowanie do kont Google działa poprawnie, bo przeglądarka wysyła Firefox UA dla domen autoryzacyjnych Google',
          'Naprawiono ścieżki do plików HTML maskotki i menu kontekstowego (ERR_FILE_NOT_FOUND w dev)',
        ],
      },
    ],
  },
  {
    version: '0.3.1',
    date: '6 kwietnia 2026',
    dateShort: '06.04.2026',
    type: 'minor',
    title: 'Discord RPC: ciągły timer sesji',
    description:
      'Czas wyświetlany w Discord Rich Presence teraz pokazuje całkowity czas od uruchomienia aplikacji, zamiast resetować się przy zmianie widoku lub przejściu w tryb bezczynności.',
    categories: [
      {
        slug: 'fix',
        label: 'Poprawki',
        entries: [
          'Discord RPC: timer sesji nie resetuje się już przy zmianie widoku ani przy przejściu w i z trybu bezczynności',
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: '27 marca 2026',
    dateShort: '27.03.2026',
    type: 'major',
    title: 'Czytelność i szczegóły anime',
    description:
      'Nowe narzędzia do personalizacji interfejsu i szybszego dostępu do informacji o anime: skalowanie czcionek, dialog szczegółów anime w harmonogramie i przywrócone linki do repozytorium.',
    categories: [
      {
        slug: 'feature',
        label: 'Nowe funkcje',
        entries: [
          'Skalowanie czytelności: zmiana rozmiaru czcionek w ustawieniach aplikacji',
          'Kliknięcie karty w harmonogramie otwiera dialog ze szczegółami anime',
        ],
      },
      {
        slug: 'fix',
        label: 'Poprawki',
        entries: [
          'Naprawiono hydration mismatch przy inicjalizacji skali czcionek',
          'Przywrócono linki do GitHuba w stopce i konsoli strony głównej',
        ],
      },
    ],
  },
  {
    version: '0.2.1',
    date: '19 marca 2026',
    dateShort: '19.03.2026',
    type: 'minor',
    title: 'Stabilizacja i poprawki',
    description:
      'Wydanie poprawkowe skupione na dopracowaniu nowego widoku Aktualności i usunięciu najbardziej uciążliwych problemów na macOS, od stanów ładowania RSS po zachowanie maskotki, Docka i okna aplikacji.',
    categories: [
      {
        slug: 'feed',
        label: 'Feed i RSS',
        entries: [
          'Ekran ładowania Aktualności poprawnie pokazuje się przy pustym cache i pierwszym otwarciu widoku',
          'Dodano ustawienie odświeżania RSS przy starcie aplikacji, domyślnie wyłączone',
          'Wygładzono renderowanie kart feedu i wzmocniono czytelność animacji ładowania',
          'Pierwsze pobieranie feedu jest teraz bardziej przewidywalne i łatwiejsze do testowania',
        ],
      },
      {
        slug: 'macos',
        label: 'macOS i maskotka',
        entries: [
          'Naprawiono problem z maskotką w fullscreen, Spaces i przy przełączaniu aplikacji przez Cmd+Tab',
          'Tryb „Tylko przy zminimalizowanej aplikacji” działa teraz zgodnie z opisem',
          'Menu kontekstowe maskotki znów poprawnie otwiera ShiroAni',
          'Kliknięcie ikony w Docku po zamknięciu czerwonym przyciskiem ponownie pokazuje okno aplikacji',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '19 marca 2026',
    dateShort: '19.03.2026',
    type: 'major',
    title: 'Anime News Feed',
    description:
      'ShiroAni agreguje teraz wiadomości ze świata anime z 11 źródeł RSS, po angielsku i po polsku. Nowy widok "Aktualności" pozwala być na bieżąco z newsami, premierami odcinków i recenzjami.',
    categories: [
      {
        slug: 'feed',
        label: 'Nowy widok: Aktualności',
        entries: [
          'Agregacja RSS z 11 źródeł: ANN, MAL, Crunchyroll, Anime Corner, LiveChart, AnimeSchedule, Animeholik, Anime.com.pl, Rascal.pl, Monime.pl i ANN Reviews',
          'Filtrowanie po kategorii (Wiadomości, Odcinki, Recenzje) i języku (EN/PL)',
          'Animowana scena ładowania z sygnałem RSS, unoszącymi się kartami i efektami iskierek',
          'Automatyczne odpytywanie źródeł w tle z konfigurowalnymi interwałami',
          'Karty z obrazkami, odznakami źródeł w kolorach marki i tagami kategorii',
          'Kliknięcie otwiera artykuł w wbudowanej przeglądarce',
        ],
      },
      {
        slug: 'polish',
        label: 'Poprawki i ulepszenia',
        entries: [
          'Naprawiono powiadomienia o odcinkach: autozapis ustawień i wyłapywanie pominiętych odcinków',
          'Naprawiono ostrzeżenie MaxListenersExceeded w adapterze Socket.IO',
          'Naprawiono nieobsłużone odrzucenie promise w menu kontekstowym maskotki',
          'Zmiana trybu widoczności maskotki teraz natychmiast pokazuje/ukrywa overlay',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '17 marca 2026',
    dateShort: '17.03.2026',
    type: 'major',
    title: 'Pierwsze wydanie',
    description:
      'Wszystko zaczęło się od prostego pytania: a co, gdyby śledzenie anime było wygodne? Tak powstał pierwszy publiczny build ShiroAni.',
    categories: [
      {
        slug: 'app',
        label: 'Aplikacja desktopowa',
        entries: [
          'Wbudowana przeglądarka z adblockiem (EasyList + EasyPrivacy) i obsługą kart',
          'Discord Rich Presence: automatyczne wykrywanie anime z ogladajanime.pl, shinden.pl i YouTube',
          'Biblioteka anime z ręcznym dodawaniem, statusami i ocenami',
          'Harmonogram anime z odliczaniem do nowych odcinków',
          'Dziennik: osobiste notatki o oglądanych seriach',
          'Maskotka Shiro-chan z trzema pozami (powitanie, myślenie, sen)',
          'Kreator pierwszego uruchomienia: konfiguracja krok po kroku',
          'Ikona w zasobniku systemowym, autostart i ekran startowy z animacjami',
        ],
      },
      {
        slug: 'bot',
        label: 'Bot Discord',
        entries: [
          'Moderacja: /ban, /unban, /mute, /unmute, /clear z pełnym audytem',
          'System XP i poziomów: /rank, /leaderboard, role za poziomy',
          'Role reakcji: /rr-create, /rr-add, /rr-remove, /rr-list',
          'System weryfikacji: przycisk z auto-rolą',
          'Wiadomości powitalne/pożegnalne z konfigurowalnym kanałem',
          '/post: kreator embedów w oknie modalnym (tytuł, opis, kolor, obraz, stopka)',
          'Dziennik audytowy: automatyczne logi usunięć i edycji wiadomości',
        ],
      },
    ],
  },
];

export const latestRelease = releases[0];
