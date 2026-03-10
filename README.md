<a name="top"></a>

<div align="center">
  <img src="assets/icon.png" alt="ShiroAni" width="128" height="128" />

  <h1>ShiroAni</h1>

  <p>
    <a href="https://github.com/Shironex/shiroani/releases/latest">
      <img src="https://img.shields.io/github/v/release/Shironex/shiroani?style=flat&color=blue" alt="GitHub Release" />
    </a>
    <a href="https://github.com/Shironex/shiroani/releases">
      <img src="https://img.shields.io/github/downloads/Shironex/shiroani/total?style=flat&color=green" alt="Downloads" />
    </a>
    <img src="https://img.shields.io/badge/Electron-40-47848F?logo=electron&logoColor=white" alt="Electron" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-lightgrey" alt="Platform" />
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-Source%20Available-orange" alt="License" />
    </a>
  </p>

  <p>
    <a href="https://github.com/Shironex/shiroani/releases/latest">Download Latest Release</a>
  </p>

  <p>
    <a href="#english">English</a> | <a href="#polski">Polski</a>
  </p>

  <blockquote>
    <p>⚠️ This project is in early development. Expect bugs and missing features — they will be addressed in future releases.</p>
  </blockquote>
</div>

---

<a name="english"></a>

<details open>
<summary><h2>🇬🇧 English</h2></summary>

### About

ShiroAni is a desktop application for browsing and tracking anime. It combines a built-in browser with ad-blocking, a personal anime library, airing schedule from AniList, a rich-text diary, and a desktop mascot companion — all in one app.

> **Note:** The UI is currently in Polish. English language support is planned for future releases.

### Screenshots

<!-- TODO: Add screenshots -->

### Features

| Feature          | Description                                                                     |
| ---------------- | ------------------------------------------------------------------------------- |
| Built-in Browser | Watch anime with built-in ad-blocking powered by Ghostery                       |
| Anime Library    | Track anime with statuses: watching, completed, plan to watch, on hold, dropped |
| Airing Schedule  | Weekly, daily, and timetable views powered by AniList                           |
| Diary            | Personal journal with a rich text editor                                        |
| Desktop Mascot   | Chibi companion that sits on your desktop with multiple poses and animations    |
| Themes           | 15+ anime-inspired themes to customize the look                                 |
| Notifications    | Get notified when new episodes air                                              |
| Import / Export  | Back up and restore your library and diary data                                 |
| Auto Updates     | Automatic updates on Windows via GitHub Releases                                |

### Installation

Download the latest release for your platform from the [Releases](https://github.com/Shironex/shiroani/releases/latest) page.

#### Windows

1. Download the `.exe` installer from the latest release.
2. Run the installer — you may see a SmartScreen warning since the app is not code-signed. Click **"More info"** and then **"Run anyway"** to proceed.
3. Once installed, the app will update automatically when new versions are available.

#### macOS

1. Download the `.dmg` file from the latest release.
2. Open the `.dmg` and drag ShiroAni to your Applications folder.
3. The app is not code-signed, so macOS will block it by default. To allow it, run the following command in Terminal:
   ```bash
   xattr -cr /Applications/ShiroAni.app
   ```
4. **Auto-updates are not available on macOS** due to the lack of code signing. To update, download the latest `.dmg` from the [Releases](https://github.com/Shironex/shiroani/releases) page manually.

#### Linux

Linux support is planned for future releases.

### Tech Stack

| Layer         | Technology                          |
| ------------- | ----------------------------------- |
| Desktop       | Electron 40                         |
| Backend       | NestJS 10 (embedded)                |
| Frontend      | React 18, Vite 7, Tailwind CSS 4    |
| Database      | better-sqlite3                      |
| Rich Text     | TipTap                              |
| UI Components | Radix UI, Lucide Icons              |
| Real-time     | Socket.IO                           |
| State         | Zustand                             |
| Native        | C++ overlay module (node-addon-api) |
| Code Quality  | ESLint, Prettier, Husky             |
| Testing       | Jest, Vitest, Testing Library       |
| CI/CD         | GitHub Actions                      |

### Building from Source

#### Requirements

- [Node.js](https://nodejs.org/) >= 22.0.0
- [pnpm](https://pnpm.io/) >= 9.0.0
- C++ compiler for native modules (Xcode CLI tools on macOS, Visual Studio Build Tools on Windows)

#### Setup

```bash
git clone https://github.com/Shironex/shiroani.git
cd shiroani
pnpm install
pnpm dev
```

#### Commands

```bash
pnpm lint          # Run linter
pnpm format        # Format code
pnpm typecheck     # Type check
pnpm test          # Run tests
pnpm build         # Build the app
pnpm package:win   # Package for Windows
pnpm package:mac   # Package for macOS
```

### Project Structure

```
shiroani/
├── apps/
│   ├── desktop/          # Electron + NestJS backend
│   └── web/              # React + Vite frontend
├── packages/
│   └── shared/           # Shared types, constants, utilities
├── scripts/              # Build and version scripts
├── docs/                 # Documentation
└── assets/               # Logo, screenshots
```

### Roadmap

- [ ] English language support
- [ ] Linux support
- [ ] macOS code signing and auto-updates

</details>

---

<a name="polski"></a>

<details>
<summary><h2>🇵🇱 Polski</h2></summary>

### O projekcie

ShiroAni to aplikacja desktopowa do przeglądania i śledzenia anime. Łączy w sobie wbudowaną przeglądarkę z blokowaniem reklam, osobistą bibliotekę anime, harmonogram emisji z AniList, pamiętnik z edytorem tekstu oraz maskotkę na pulpicie — wszystko w jednej aplikacji.

### Zrzuty ekranu

<!-- TODO: Dodaj zrzuty ekranu -->

### Funkcje

| Funkcja                   | Opis                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| Wbudowana przeglądarka    | Oglądaj anime z wbudowanym blokowaniem reklam (Ghostery)                        |
| Biblioteka anime          | Śledź anime ze statusami: oglądane, ukończone, planowane, wstrzymane, porzucone |
| Harmonogram emisji        | Widok tygodniowy, dzienny i tabelaryczny z danymi z AniList                     |
| Pamiętnik                 | Osobisty dziennik z edytorem tekstu                                             |
| Maskotka na pulpicie      | Chibi towarzyszka na pulpicie z różnymi pozami i animacjami                     |
| Motywy                    | Ponad 15 motywów inspirowanych anime do personalizacji wyglądu                  |
| Powiadomienia             | Otrzymuj powiadomienia o nowych odcinkach                                       |
| Import / Eksport          | Twórz kopie zapasowe i przywracaj dane biblioteki oraz pamiętnika               |
| Automatyczne aktualizacje | Automatyczne aktualizacje na Windowsie przez GitHub Releases                    |

### Instalacja

Pobierz najnowszą wersję dla swojego systemu ze strony [Releases](https://github.com/Shironex/shiroani/releases/latest).

#### Windows

1. Pobierz instalator `.exe` z najnowszego wydania.
2. Uruchom instalator — może pojawić się ostrzeżenie SmartScreen, ponieważ aplikacja nie posiada podpisu cyfrowego. Kliknij **"Więcej informacji"**, a następnie **"Uruchom mimo to"**, żeby kontynuować.
3. Po zainstalowaniu aplikacja będzie aktualizować się automatycznie, gdy pojawią się nowe wersje.

#### macOS

1. Pobierz plik `.dmg` z najnowszego wydania.
2. Otwórz `.dmg` i przeciągnij ShiroAni do folderu Aplikacje.
3. Aplikacja nie posiada podpisu cyfrowego, więc macOS domyślnie ją zablokuje. Aby ją odblokować, uruchom w Terminalu:
   ```bash
   xattr -cr /Applications/ShiroAni.app
   ```
4. **Automatyczne aktualizacje nie są dostępne na macOS** ze względu na brak podpisu cyfrowego. Aby zaktualizować aplikację, pobierz najnowszy plik `.dmg` ręcznie ze strony [Releases](https://github.com/Shironex/shiroani/releases).

#### Linux

Wsparcie dla Linuxa jest planowane w przyszłych wydaniach.

### Stos technologiczny

| Warstwa                           | Technologia                      |
| --------------------------------- | -------------------------------- |
| Aplikacja desktopowa              | Electron 40                      |
| Backend                           | NestJS 10 (wbudowany)            |
| Frontend                          | React 18, Vite 7, Tailwind CSS 4 |
| Baza danych                       | better-sqlite3                   |
| Edytor tekstu                     | TipTap                           |
| Komponenty UI                     | Radix UI, Lucide Icons           |
| Komunikacja w czasie rzeczywistym | Socket.IO                        |
| Zarządzanie stanem                | Zustand                          |
| Moduł natywny                     | C++ (node-addon-api)             |
| Jakość kodu                       | ESLint, Prettier, Husky          |
| Testy                             | Jest, Vitest, Testing Library    |
| CI/CD                             | GitHub Actions                   |

### Budowanie ze źródeł

#### Wymagania

- [Node.js](https://nodejs.org/) >= 22.0.0
- [pnpm](https://pnpm.io/) >= 9.0.0
- Kompilator C++ do modułów natywnych (Xcode CLI tools na macOS, Visual Studio Build Tools na Windows)

#### Konfiguracja

```bash
git clone https://github.com/Shironex/shiroani.git
cd shiroani
pnpm install
pnpm dev
```

#### Komendy

```bash
pnpm lint          # Uruchom linter
pnpm format        # Formatuj kod
pnpm typecheck     # Sprawdź typy
pnpm test          # Uruchom testy
pnpm build         # Zbuduj aplikację
pnpm package:win   # Spakuj na Windows
pnpm package:mac   # Spakuj na macOS
```

### Struktura projektu

```
shiroani/
├── apps/
│   ├── desktop/          # Electron + NestJS backend
│   └── web/              # React + Vite frontend
├── packages/
│   └── shared/           # Współdzielone typy, stałe, narzędzia
├── scripts/              # Skrypty do budowania i wersjonowania
├── docs/                 # Dokumentacja
└── assets/               # Logo, zrzuty ekranu
```

### Plany na przyszłość

- [ ] Wsparcie dla języka angielskiego
- [ ] Wsparcie dla Linuxa
- [ ] Podpis cyfrowy na macOS i automatyczne aktualizacje

</details>

---

## License / Licencja

This project is source-available — see the [LICENSE](LICENSE) file for details. You are free to use the app and study the code, but redistribution, reselling, and creating derivative works are not permitted.

Ten projekt jest udostępniony jako source-available — szczegóły w pliku [LICENSE](LICENSE). Możesz swobodnie korzystać z aplikacji i przeglądać kod źródłowy, ale redystrybucja, odsprzedaż i tworzenie prac pochodnych są zabronione.

---

<p align="center">
  Made with &#10084; by <a href="https://github.com/Shironex">Shironex</a>
</p>

[Back to top](#top)
