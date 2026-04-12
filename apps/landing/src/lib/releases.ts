import {
  Sparkles,
  Monitor,
  Globe,
  MessageCircle,
  Shield,
  Zap,
  Palette,
  Rss,
  Bell,
  Wrench,
} from 'lucide-react';

export interface ChangeEntry {
  icon: typeof Sparkles;
  text: string;
}

export interface ReleaseCategory {
  label: string;
  icon: typeof Sparkles;
  color: string;
  entries: ChangeEntry[];
}

export interface Release {
  version: string;
  date: string;
  title: string;
  description: string;
  categories: ReleaseCategory[];
}

export const releases: Release[] = [
  {
    version: '0.4.2',
    date: '10 kwietnia 2026',
    title: 'Poprawki stabilności i wygody',
    description:
      'Kilka drobnych poprawek zauważonych podczas korzystania z aplikacji. Aplikacja na Windowsie zamyka się teraz poprawnie, linki otwierają się wewnątrz aplikacji, a onboarding nie pojawia się ponownie bez potrzeby.',
    categories: [
      {
        label: 'Poprawki',
        icon: Wrench,
        color: 'text-muted-foreground',
        entries: [
          {
            icon: Monitor,
            text: 'Aplikacja na Windowsie zamyka się całkowicie zamiast pozostawać w tle w zasobniku systemowym',
          },
          {
            icon: Globe,
            text: 'Linki otwierają się teraz we wbudowanej przeglądarce zamiast w przeglądarce systemowej',
          },
          {
            icon: Wrench,
            text: 'Onboarding nie pojawia się ponownie bez potrzeby',
          },
          {
            icon: Wrench,
            text: 'Poprawione ścieżki do assetów maskotki i skryptów wewnętrznych',
          },
          {
            icon: Wrench,
            text: 'Poprawiono zapisywanie logów aplikacji do pliku',
          },
        ],
      },
    ],
  },
  {
    version: '0.4.1',
    date: '9 kwietnia 2026',
    title: 'Aktualizacja bezpieczeństwa',
    description:
      'Mała, ale ważna aktualizacja — odświeżyliśmy kilka bibliotek, na których opiera się aplikacja, aby zamknąć zgłoszone luki bezpieczeństwa. Nie ma nowych funkcji, ale warto zainstalować ją jak najszybciej. Aktualizacja pobierze się automatycznie.',
    categories: [
      {
        label: 'Bezpieczeństwo',
        icon: Shield,
        color: 'text-primary',
        entries: [
          {
            icon: Shield,
            text: 'Zaktualizowany silnik Electron, na którym działa ShiroAni — zamknięte luki związane z obsługą okien, uprawnieniami procesów i wczytywaniem obrazów ze schowka',
          },
          {
            icon: Shield,
            text: 'Zaktualizowane biblioteki odpowiadające za komunikację bota Discord i wewnętrzny silnik aplikacji desktopowej',
          },
          {
            icon: Wrench,
            text: 'Odświeżone zależności narzędziowe używane podczas budowania aplikacji — bez zmian w działaniu dla użytkowników',
          },
        ],
      },
    ],
  },
  {
    version: '0.4.0',
    date: '8 kwietnia 2026',
    title: 'Blokowanie reklam popupowych i skr\u00F3ty klawiszowe',
    description:
      'Wbudowana przeglądarka stała się znacznie przyjemniejsza w użyciu — inteligentne blokowanie popupów reklamowych z iframe video playerów, pełna obsługa skrótów klawiszowych oraz naprawiona ikona w zasobniku systemowym.',
    categories: [
      {
        label: 'Nowe funkcje',
        icon: Sparkles,
        color: 'text-primary',
        entries: [
          {
            icon: Shield,
            text: 'Inteligentne blokowanie popupów — filtruje window.open na podstawie list filtrów i heurystyk origin (tryb smart/strict/off)',
          },
          {
            icon: Zap,
            text: 'Skróty klawiszowe przeglądarki: Ctrl+W (zamknij kartę), Ctrl+T (nowa karta), Ctrl+Tab (przełącz karty), Ctrl+L (pasek adresu), Ctrl+R (odśwież), Alt+←/→ (nawigacja)',
          },
          {
            icon: Shield,
            text: 'Pełne listy filtrów adblock — rozszerzono o filtry irytujących elementów (banery cookies, nakładki "wyłącz adblock")',
          },
          {
            icon: Monitor,
            text: 'Przycisk trybu blokowania popupów w pasku narzędzi z trzema trybami i kolorowymi ikonami',
          },
        ],
      },
      {
        label: 'Poprawki',
        icon: Wrench,
        color: 'text-muted-foreground',
        entries: [
          {
            icon: Wrench,
            text: 'Naprawiono ikonę w zasobniku systemowym — w spakowanej aplikacji brakowało pliku icon-32.png, teraz używany jest icon.ico',
          },
          {
            icon: Zap,
            text: 'Skróty klawiszowe działają nawet gdy webview ma fokus (przechwytywanie przez before-input-event w procesie głównym)',
          },
          {
            icon: Globe,
            text: 'Logowanie do kont Google działa poprawnie — Firefox UA dla domen autoryzacyjnych',
          },
          {
            icon: Wrench,
            text: 'Discord RPC — timer sesji nie resetuje się przy zmianie widoku ani trybu bezczynności',
          },
        ],
      },
    ],
  },
  {
    version: '0.3.2',
    date: '6 kwietnia 2026',
    title: 'Google login i poprawki maskotki',
    description:
      'Naprawiono blokadę logowania do kont Google w wbudowanej przeglądarce oraz błędy ładowania nakładki maskotki w trybie deweloperskim.',
    categories: [
      {
        label: 'Poprawki',
        icon: Wrench,
        color: 'text-muted-foreground',
        entries: [
          {
            icon: Globe,
            text: 'Logowanie do kont Google działa poprawnie — przeglądarka wysyła Firefox UA dla domen autoryzacyjnych Google',
          },
          {
            icon: Wrench,
            text: 'Naprawiono ścieżki do plików HTML maskotki i menu kontekstowego (ERR_FILE_NOT_FOUND w dev)',
          },
        ],
      },
    ],
  },
  {
    version: '0.3.1',
    date: '6 kwietnia 2026',
    title: 'Discord RPC — ciągły timer sesji',
    description:
      'Czas wyświetlany w Discord Rich Presence teraz pokazuje całkowity czas od uruchomienia aplikacji, zamiast resetować się przy zmianie widoku lub przejściu w tryb bezczynności.',
    categories: [
      {
        label: 'Poprawki',
        icon: Wrench,
        color: 'text-muted-foreground',
        entries: [
          {
            icon: Wrench,
            text: 'Discord RPC — timer sesji nie resetuje się już przy zmianie widoku ani przy przejściu w/z trybu bezczynności',
          },
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: '27 marca 2026',
    title: 'Czytelność i szczegóły anime',
    description:
      'Nowe narzędzia do personalizacji interfejsu i szybszego dostępu do informacji o anime — skalowanie czcionek, dialog szczegółów anime w harmonogramie i przywrócone linki do repozytorium.',
    categories: [
      {
        label: 'Nowe funkcje',
        icon: Sparkles,
        color: 'text-primary',
        entries: [
          {
            icon: Zap,
            text: 'Skalowanie czytelności — zmiana rozmiaru czcionek w ustawieniach aplikacji',
          },
          {
            icon: Monitor,
            text: 'Kliknięcie karty w harmonogramie otwiera dialog ze szczegółami anime',
          },
        ],
      },
      {
        label: 'Poprawki',
        icon: Wrench,
        color: 'text-muted-foreground',
        entries: [
          {
            icon: Wrench,
            text: 'Naprawiono hydration mismatch przy inicjalizacji skali czcionek',
          },
          {
            icon: Globe,
            text: 'Przywrócono linki do GitHuba w stopce i konsoli strony głównej',
          },
        ],
      },
    ],
  },
  {
    version: '0.2.1',
    date: '19 marca 2026',
    title: 'Stabilizacja i poprawki',
    description:
      'Patch release skupiony na dopracowaniu nowego widoku Aktualności i usunięciu najbardziej uciążliwych problemów na macOS — od stanów ładowania RSS po zachowanie maskotki, Docka i okna aplikacji.',
    categories: [
      {
        label: 'Feed i RSS',
        icon: Rss,
        color: 'text-primary',
        entries: [
          {
            icon: Sparkles,
            text: 'Loader Aktualności poprawnie pokazuje się przy pustym cache i pierwszym otwarciu widoku',
          },
          {
            icon: Wrench,
            text: 'Dodano ustawienie odświeżania RSS przy starcie aplikacji — domyślnie wyłączone',
          },
          {
            icon: Zap,
            text: 'Wygładzono renderowanie kart feedu i wzmocniono czytelność animacji ładowania',
          },
          {
            icon: Globe,
            text: 'Pierwsze pobieranie feedu jest teraz bardziej przewidywalne i łatwiejsze do testowania',
          },
        ],
      },
      {
        label: 'macOS i maskotka',
        icon: Monitor,
        color: 'text-muted-foreground',
        entries: [
          {
            icon: Monitor,
            text: 'Naprawiono problem z maskotką w fullscreen, Spaces i przy przełączaniu aplikacji przez Cmd+Tab',
          },
          {
            icon: Sparkles,
            text: 'Tryb „Tylko przy zminimalizowanej aplikacji” działa teraz zgodnie z opisem',
          },
          {
            icon: Wrench,
            text: 'Menu kontekstowe maskotki znów poprawnie otwiera ShiroAni',
          },
          {
            icon: Zap,
            text: 'Kliknięcie ikony w Docku po zamknięciu czerwonym przyciskiem ponownie pokazuje okno aplikacji',
          },
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '19 marca 2026',
    title: 'Anime News Feed',
    description:
      'ShiroAni teraz agreguje wiadomości ze świata anime z 11 źródeł RSS — po angielsku i po polsku. Nowy widok "Aktualności" pozwala być na bieżąco z newsami, premierami odcinków i recenzjami.',
    categories: [
      {
        label: 'Nowy widok — Aktualności',
        icon: Rss,
        color: 'text-primary',
        entries: [
          {
            icon: Rss,
            text: 'Agregacja RSS z 11 źródeł: ANN, MAL, Crunchyroll, Anime Corner, LiveChart, AnimeSchedule, Animeholik, Anime.com.pl, Rascal.pl, Monime.pl i ANN Reviews',
          },
          {
            icon: Globe,
            text: 'Filtrowanie po kategorii (Wiadomości, Odcinki, Recenzje) i języku (EN/PL)',
          },
          {
            icon: Sparkles,
            text: 'Animowana scena ładowania z sygnałem RSS, unoszącymi się kartami i efektami sparkle',
          },
          {
            icon: Zap,
            text: 'Automatyczne odpytywanie źródeł w tle z konfigurowalnymi interwałami',
          },
          {
            icon: Palette,
            text: "Karty z obrazkami, badge'ami źródeł w kolorach marki i tagami kategorii",
          },
          { icon: Monitor, text: 'Kliknięcie otwiera artykuł w wbudowanej przeglądarce' },
        ],
      },
      {
        label: 'Poprawki i ulepszenia',
        icon: Wrench,
        color: 'text-muted-foreground',
        entries: [
          {
            icon: Bell,
            text: 'Naprawiono powiadomienia o odcinkach — auto-zapis ustawień i łapanie pominiętych odcinków',
          },
          {
            icon: Shield,
            text: 'Naprawiono ostrzeżenie MaxListenersExceeded w adapterze Socket.IO',
          },
          {
            icon: Wrench,
            text: 'Naprawiono nieobsłużone odrzucenie promise w menu kontekstowym maskotki',
          },
          {
            icon: Zap,
            text: 'Zmiana trybu widoczności maskotki teraz natychmiast pokazuje/ukrywa overlay',
          },
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '17 marca 2026',
    title: 'Pierwsze wydanie',
    description:
      'Wszystko zaczęło się od prostego pytania: "a co, gdyby śledzenie anime było wygodne?" Oto wynik — pierwszy publiczny build ShiroAni.',
    categories: [
      {
        label: 'Aplikacja desktopowa',
        icon: Monitor,
        color: 'text-primary',
        entries: [
          {
            icon: Globe,
            text: 'Wbudowana przeglądarka z adblockiem (EasyList + EasyPrivacy) i obsługą kart',
          },
          {
            icon: Sparkles,
            text: 'Discord Rich Presence — automatyczne wykrywanie anime z ogladajanime.pl, shinden.pl i YouTube',
          },
          { icon: Palette, text: 'Biblioteka anime z ręcznym dodawaniem, statusami i ocenami' },
          { icon: Zap, text: 'Harmonogram anime z odliczaniem do nowych odcinków' },
          { icon: Palette, text: 'Dziennik — osobiste notatki o oglądanych seriach' },
          {
            icon: Sparkles,
            text: 'Maskotka Shiro-chan z trzema pozami (powitanie, myślenie, sen)',
          },
          { icon: Monitor, text: 'Wizard pierwszego uruchomienia — konfiguracja krok po kroku' },
          { icon: Zap, text: 'Tray icon, autostart, splash screen z animacjami' },
        ],
      },
      {
        label: 'Bot Discord',
        icon: MessageCircle,
        color: 'text-gold',
        entries: [
          {
            icon: Shield,
            text: 'Moderacja: /ban, /unban, /mute, /unmute, /clear z pełnym audytem',
          },
          { icon: Sparkles, text: 'System XP i poziomów: /rank, /leaderboard, role za poziomy' },
          { icon: Zap, text: 'Role reakcji: /rr-create, /rr-add, /rr-remove, /rr-list' },
          { icon: Shield, text: 'System weryfikacji: przycisk z auto-rolą' },
          {
            icon: MessageCircle,
            text: 'Wiadomości powitalne/pożegnalne z konfigurowalnym kanałem',
          },
          {
            icon: Sparkles,
            text: '/post — builder embedów z modalem (tytuł, opis, kolor, obraz, stopka)',
          },
          { icon: Zap, text: 'Audit trail — automatyczne logi usunięć i edycji wiadomości' },
        ],
      },
    ],
  },
];

export const latestRelease = releases[0];
