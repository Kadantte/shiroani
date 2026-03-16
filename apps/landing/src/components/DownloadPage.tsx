import { motion } from 'framer-motion';
import { Apple, Monitor, Terminal, Download, ExternalLink, FileText } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { ease } from '@/lib/animations';

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

type Platform = 'mac' | 'win' | 'linux';

interface PlatformInfo {
  key: Platform;
  label: string;
  icon: typeof Apple;
  extension: string;
  pattern: RegExp;
  available: boolean;
}

const PLATFORMS: PlatformInfo[] = [
  {
    key: 'mac',
    label: 'macOS',
    icon: Apple,
    extension: '.dmg',
    pattern: /\.dmg$/,
    available: true,
  },
  {
    key: 'win',
    label: 'Windows',
    icon: Monitor,
    extension: '.exe',
    pattern: /\.exe$/,
    available: true,
  },
  {
    key: 'linux',
    label: 'Linux',
    icon: Terminal,
    extension: '.AppImage',
    pattern: /\.AppImage$/,
    available: false,
  },
];

const GITHUB_RELEASE_URL = 'https://api.github.com/repos/Shironex/shiroani/releases/latest';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'win';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'win';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function AssetButton({
  platform,
  asset,
  isPrimary,
  delay,
}: {
  platform: PlatformInfo;
  asset: ReleaseAsset | null;
  isPrimary: boolean;
  delay: number;
}) {
  const Icon = platform.icon;

  if (!platform.available) {
    return (
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease }}
      >
        <div className="flex items-center gap-4 rounded-2xl border border-border/30 bg-card/30 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50">
            <Icon className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground/50">
                {platform.label}
              </span>
              <span className="rounded-md bg-gold/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-dim">
                Planowane
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground/30">Wkrótce dostępne</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!asset) {
    return (
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease }}
      >
        <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/50 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50">
            <Icon className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <div>
            <span className="text-sm font-semibold text-muted-foreground/60">{platform.label}</span>
            <p className="mt-0.5 text-xs text-muted-foreground/40">Ładowanie...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isPrimary) {
    return (
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease }}
      >
        <a
          href={asset.browser_download_url}
          className="group flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/8 px-6 py-5 transition-colors duration-200 hover:border-primary/40 hover:bg-primary/12 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 transition-colors duration-200 group-hover:bg-primary/20">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{platform.label}</span>
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Wykryto
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {platform.extension} · {formatBytes(asset.size)}
            </p>
          </div>
          <Download className="h-4 w-4 text-primary/60 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-primary" />
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease }}
    >
      <a
        href={asset.browser_download_url}
        className="group flex items-center gap-4 rounded-2xl border border-border/40 bg-card/50 px-6 py-5 transition-colors duration-200 hover:border-border hover:bg-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50 transition-colors duration-200 group-hover:bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-foreground/80">{platform.label}</span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {platform.extension} · {formatBytes(asset.size)}
          </p>
        </div>
        <Download className="h-4 w-4 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-muted-foreground" />
      </a>
    </motion.div>
  );
}

export function DownloadPage() {
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [error, setError] = useState(false);
  const detectedPlatform = useMemo(detectPlatform, []);

  useEffect(() => {
    fetch(GITHUB_RELEASE_URL)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setRelease)
      .catch(() => setError(true));
  }, []);

  const version = release?.tag_name?.replace(/^v/, '') ?? null;

  // Match assets to platforms
  const assetMap = useMemo(() => {
    if (!release) return new Map<Platform, ReleaseAsset>();
    const map = new Map<Platform, ReleaseAsset>();
    for (const platform of PLATFORMS) {
      const asset = release.assets.find(a => platform.pattern.test(a.name));
      if (asset) map.set(platform.key, asset);
    }
    return map;
  }, [release]);

  // Sort platforms: detected first, then available, then unavailable
  const sortedPlatforms = useMemo(() => {
    return [...PLATFORMS].sort((a, b) => {
      if (a.key === detectedPlatform) return -1;
      if (b.key === detectedPlatform) return 1;
      if (a.available !== b.available) return a.available ? -1 : 1;
      return 0;
    });
  }, [detectedPlatform]);

  return (
    <>
      <header className="border-b border-border px-6 py-4">
        <nav className="mx-auto flex max-w-3xl items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            &larr; Strona główna
          </a>
          <a
            href="/"
            className="flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <img src="/favicon.png" alt="" className="h-6 w-6" />
            <span className="font-display text-sm font-bold">
              Shiro<span className="text-primary">Ani</span>
            </span>
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        {/* Version badge + mascot */}
        <motion.div
          className="mb-12 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <motion.img
            src="/mascot-wave.png"
            alt="Shiro-chan"
            className="mb-6 h-24 w-24 select-none"
            draggable={false}
            style={{ animation: 'float-gentle 5s ease-in-out infinite' }}
          />

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Pobierz ShiroAni
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Darmowe i open source. Wybierz swoją platformę i zacznij śledzić anime.
          </p>

          {/* Version info */}
          {version && release && (
            <motion.div
              className="mt-5 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-primary">v{version}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(release.published_at)}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Download buttons */}
        {error ? (
          <motion.div
            className="rounded-2xl border border-border bg-card/50 p-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-sm text-muted-foreground">
              Nie udało się pobrać informacji o wydaniu.
            </p>
            <a
              href="https://github.com/Shironex/shiroani/releases/latest"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pobierz z GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sortedPlatforms.map((platform, i) => (
              <AssetButton
                key={platform.key}
                platform={platform}
                asset={assetMap.get(platform.key) ?? null}
                isPrimary={platform.key === detectedPlatform && platform.available}
                delay={0.15 + i * 0.08}
              />
            ))}
          </div>
        )}

        {/* macOS unsigned notice */}
        {detectedPlatform === 'mac' && (
          <motion.p
            className="mt-4 text-center text-xs text-muted-foreground/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Aplikacja nie jest podpisana certyfikatem Apple. Po pobraniu kliknij prawym → Otwórz.
          </motion.p>
        )}

        {/* Links */}
        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <a
            href="/changelog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            Changelog
          </a>
          {release && (
            <a
              href={release.html_url}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub Release
            </a>
          )}
        </motion.div>
      </main>
    </>
  );
}
