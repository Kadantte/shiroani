import { useCallback, useEffect, useMemo, useState } from 'react';
import { GITHUB_RELEASES_API_URL, GITHUB_RELEASES_URL } from '@shiroani/shared';
import { currentVersion } from '../lib/releases';

type Platform = 'win' | 'mac';

interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

interface ReleaseData {
  tag_name: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
}

interface PlatformSpec {
  key: Platform;
  label: string;
  extension: string;
  arch: string;
  pattern: RegExp;
}

const PLATFORMS: PlatformSpec[] = [
  { key: 'win', label: 'Windows', extension: '.exe', arch: '64-bit', pattern: /\.exe$/i },
  { key: 'mac', label: 'macOS', extension: '.dmg', arch: 'Universal', pattern: /\.dmg$/i },
];

const MAC_QUARANTINE_CMD = 'xattr -rd com.apple.quarantine /Applications/ShiroAni.app';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'win';
  return navigator.userAgent.toLowerCase().includes('mac') ? 'mac' : 'win';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatReleaseDate(iso: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

const WinIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 5.5 10.5 4.2v8H3V5.5zm0 13 7.5 1.3v-8H3v6.7zM11.5 20l9.5 1.7V11.5h-9.5V20zM11.5 4l9.5-1.7v9.2h-9.5V4z" />
  </svg>
);

const MacIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.3 12.6c0-2.5 2-3.7 2.1-3.8-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.9-1.7 0-3.2 1-4 2.5-1.7 3-.4 7.4 1.2 9.9.8 1.2 1.8 2.5 3 2.4 1.2-.1 1.6-.8 3.1-.8 1.4 0 1.9.8 3.2.7 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-.9-2.5-3.8zM15 4.8c.7-.8 1.1-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.3-.6 2.9-1.3z" />
  </svg>
);

export function DownloadPage() {
  const fallbackVersion = currentVersion();
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [error, setError] = useState(false);
  const [detected, setDetected] = useState<Platform | null>(null);
  const [downloaded, setDownloaded] = useState<Platform | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDetected(detectPlatform());
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(GITHUB_RELEASES_API_URL, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ReleaseData>;
      })
      .then(setRelease)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(true);
      });
    return () => ctrl.abort();
  }, []);

  const assets = useMemo(() => {
    const map = new Map<Platform, ReleaseAsset>();
    if (!release) return map;
    for (const p of PLATFORMS) {
      const asset = release.assets.find(a => p.pattern.test(a.name));
      if (asset) map.set(p.key, asset);
    }
    return map;
  }, [release]);

  const onCopyCmd = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(MAC_QUARANTINE_CMD)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const version = release?.tag_name?.replace(/^v/i, '') ?? fallbackVersion;
  const releasedOn = release ? formatReleaseDate(release.published_at) : null;

  return (
    <>
      <header className="dlp-hdr">
        <div className="kanji-bg" aria-hidden="true">
          配信
        </div>
        <span className="eyebrow">
          <span className="blip" aria-hidden="true"></span>v{version}
          {releasedOn && <> · wydanie z {releasedOn}</>}
        </span>
        <h1>
          Pobierz <em>ShiroAni</em>.
        </h1>
        <p className="sub">
          Za darmo, bez konta, bez reklam. Na Windowsie aktualizuje się sama. Żadna wersja nie jest
          jeszcze podpisana, szczegóły o SmartScreen i macOS znajdziesz niżej.
        </p>
      </header>

      <section className="dlp-body" aria-label="Pobieranie">
        {error ? (
          <div className="dlp-error">
            <p>
              Nie udało się pobrać informacji o najnowszej wersji. Plik znajdziesz w wydaniach na
              GitHubie.
            </p>
            <a
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="dlp-btn dlp-btn-primary"
            >
              Otwórz GitHub Releases <span aria-hidden="true">↗</span>
            </a>
          </div>
        ) : (
          <div className="dlp-grid">
            {PLATFORMS.map(p => {
              const asset = assets.get(p.key);
              const isPrimary = p.key === detected;
              const href = asset?.browser_download_url ?? GITHUB_RELEASES_URL;
              const external = !asset;
              const size = asset ? formatBytes(asset.size) : null;
              const ariaLabel = asset
                ? `Pobierz ${p.label}, ${p.extension}, ${size}`
                : `Otwórz stronę wydania dla ${p.label}`;
              return (
                <a
                  key={p.key}
                  href={href}
                  onClick={asset ? () => setDownloaded(p.key) : undefined}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  aria-label={ariaLabel}
                  className={
                    'dlp-card' + (isPrimary ? ' is-primary' : '') + (!release ? ' is-loading' : '')
                  }
                >
                  <span className="pico" aria-hidden="true">
                    {p.key === 'win' ? <WinIcon /> : <MacIcon />}
                  </span>
                  <div className="pbody">
                    <div className="pn">
                      {p.label}
                      {isPrimary && <span className="pbadge">Twój system</span>}
                    </div>
                    <div className="ps">
                      {release && size ? (
                        <>
                          {p.extension} · {p.arch} · {size}
                        </>
                      ) : release && !asset ? (
                        <>Brak pliku dla tej platformy, zajrzyj do wydania</>
                      ) : (
                        <span className="pskel">wczytywanie…</span>
                      )}
                    </div>
                  </div>
                  <span className="parr" aria-hidden="true">
                    ↓
                  </span>
                </a>
              );
            })}
          </div>
        )}

        <div className="dlp-sr" role="status" aria-live="polite">
          {downloaded ? `Pobieranie ${downloaded === 'win' ? 'Windows' : 'macOS'} rozpoczęte.` : ''}
        </div>

        <div className="dlp-notes">
          <aside className="dlp-note">
            <div className="nhead">
              <span className="ndot" aria-hidden="true"></span>
              Windows · SmartScreen
            </div>
            <p>
              Instalator nie ma certyfikatu EV, więc Windows SmartScreen wyświetli ostrzeżenie{' '}
              <b>„System Windows ochronił Twój komputer"</b>. Kliknij <b>Więcej informacji</b>, a
              potem <b>Uruchom mimo to</b>.
            </p>
            <p className="nmeta">
              Po instalacji aplikacja aktualizuje się sama. Ostrzeżenie zobaczysz tylko przy
              pierwszym uruchomieniu.
            </p>
          </aside>

          <aside className="dlp-note">
            <div className="nhead">
              <span className="ndot" aria-hidden="true"></span>
              macOS · po każdym pobraniu
            </div>
            <p>
              Aplikacja nie ma certyfikatu Apple, więc macOS zablokuje ją przy pierwszym
              uruchomieniu. Po przeniesieniu ShiroAni do folderu <b>Applications</b> wklej w
              terminalu:
            </p>
            <div className="ncode">
              <code>{MAC_QUARANTINE_CMD}</code>
              <button type="button" onClick={onCopyCmd} aria-label="Skopiuj komendę">
                {copied ? 'Skopiowano' : 'Kopiuj'}
              </button>
            </div>
            <p className="nmeta">
              Powtarzaj tę komendę po każdej aktualizacji. macOS oznacza kwarantanną każdy świeżo
              pobrany plik.
            </p>
          </aside>
        </div>

        <div className="dlp-links">
          <a href="/changelog" className="dlp-btn">
            <span aria-hidden="true">≡</span>
            <span>Lista zmian</span>
          </a>
          <a
            href={release?.html_url ?? GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="dlp-btn"
          >
            <span aria-hidden="true">↗</span>
            <span>Pełne wydanie na GitHubie</span>
          </a>
        </div>
      </section>
    </>
  );
}
