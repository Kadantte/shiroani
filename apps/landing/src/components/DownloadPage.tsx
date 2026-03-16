import { motion, AnimatePresence } from 'framer-motion';
import { Apple, Monitor, Terminal, Download, ExternalLink, FileText } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
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

/** Tiny confetti burst — fires particles from a point */
function useConfetti() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string; angle: number; speed: number }[]
  >([]);

  const fire = useCallback((e: React.MouseEvent) => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = [
      'oklch(0.72 0.15 350)',
      'oklch(0.75 0.12 85)',
      'oklch(0.78 0.13 350)',
      'oklch(0.65 0.17 348)',
      'oklch(0.8 0.1 85)',
    ];
    const batch = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: cx,
      y: cy,
      color: colors[i % colors.length],
      angle: (i / 12) * 360 + (Math.random() - 0.5) * 30,
      speed: 60 + Math.random() * 40,
    }));
    setParticles(batch);
    setTimeout(() => setParticles([]), 800);
  }, []);

  const layer = (
    <AnimatePresence>
      {particles.map(p => {
        const rad = (p.angle * Math.PI) / 180;
        return (
          <motion.div
            key={p.id}
            className="pointer-events-none fixed z-50"
            style={{
              left: p.x,
              top: p.y,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: p.color,
            }}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: 0.3,
              x: Math.cos(rad) * p.speed,
              y: Math.sin(rad) * p.speed - 20,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </AnimatePresence>
  );

  return { fire, layer };
}

function SkeletonButton({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease }}
    >
      <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/50 px-6 py-5">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-muted/60" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-muted/60" />
          <div className="h-3 w-28 animate-pulse rounded bg-muted/40" />
        </div>
      </div>
    </motion.div>
  );
}

function AssetButton({
  platform,
  asset,
  isPrimary,
  delay,
  onDownload,
}: {
  platform: PlatformInfo;
  asset: ReleaseAsset | null;
  isPrimary: boolean;
  delay: number;
  onDownload: (e: React.MouseEvent) => void;
}) {
  const Icon = platform.icon;

  if (!platform.available) {
    return (
      <motion.div
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
    return <SkeletonButton delay={delay} />;
  }

  if (isPrimary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease }}
      >
        <a
          href={asset.browser_download_url}
          onClick={onDownload}
          aria-label={`Pobierz ShiroAni dla ${platform.label} (${platform.extension}, ${formatBytes(asset.size)})`}
          className="group flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/8 px-6 py-5 transition-colors duration-200 hover:border-primary/40 hover:bg-primary/12 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <motion.div
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 transition-colors duration-200 group-hover:bg-primary/20"
            whileHover={{ scale: 1.08, rotate: -3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Icon className="h-5 w-5 text-primary" />
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{platform.label}</span>
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Twój system
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease }}
    >
      <a
        href={asset.browser_download_url}
        onClick={onDownload}
        aria-label={`Pobierz ShiroAni dla ${platform.label} (${platform.extension}, ${formatBytes(asset.size)})`}
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
  const [downloaded, setDownloaded] = useState(false);
  const detectedPlatform = useMemo(detectPlatform, []);
  const { fire, layer } = useConfetti();

  useEffect(() => {
    fetch(GITHUB_RELEASE_URL)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setRelease)
      .catch(() => setError(true));
  }, []);

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      fire(e);
      setDownloaded(true);
    },
    [fire]
  );

  const version = release?.tag_name?.replace(/^v/, '') ?? null;

  const assetMap = useMemo(() => {
    if (!release) return new Map<Platform, ReleaseAsset>();
    const map = new Map<Platform, ReleaseAsset>();
    for (const platform of PLATFORMS) {
      const asset = release.assets.find(a => platform.pattern.test(a.name));
      if (asset) map.set(platform.key, asset);
    }
    return map;
  }, [release]);

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
      {layer}

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

      <main className="relative mx-auto max-w-3xl px-6 py-16">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-24 h-[400px] w-[500px] -translate-x-1/2 rounded-full opacity-[0.08]"
            style={{
              background: 'radial-gradient(ellipse, oklch(0.72 0.15 350 / 0.3), transparent 70%)',
            }}
          />
        </div>

        {/* Mascot + heading */}
        <motion.div
          className="relative mb-12 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <motion.img
            src={downloaded ? '/mascot-think.png' : '/mascot-wave.png'}
            alt="Shiro-chan"
            className="mb-6 h-24 w-24 select-none"
            draggable={false}
            key={downloaded ? 'think' : 'wave'}
            initial={downloaded ? { scale: 0.8, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            style={!downloaded ? { animation: 'float-gentle 5s ease-in-out infinite' } : undefined}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {downloaded ? 'Pobieranie rozpoczęte!' : 'Pobierz ShiroAni'}
          </h1>

          <AnimatePresence mode="wait">
            <motion.p
              key={downloaded ? 'after' : 'before'}
              className="mt-3 max-w-md text-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {downloaded
                ? 'Shiro-chan już nie może się doczekać. Do zobaczenia w aplikacji!'
                : 'Wybierz swoją platformę i zacznijmy oglądać razem.'}
            </motion.p>
          </AnimatePresence>

          {/* Screen reader announcement for download state */}
          <div aria-live="polite" className="sr-only">
            {downloaded && 'Pobieranie rozpoczęte. Do zobaczenia w aplikacji!'}
          </div>

          {version && release && (
            <motion.div
              className="mt-5 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="text-xs font-semibold text-primary">v{version}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(release.published_at)}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Download buttons */}
        <div className="relative">
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
              {release
                ? sortedPlatforms.map((platform, i) => (
                    <AssetButton
                      key={platform.key}
                      platform={platform}
                      asset={assetMap.get(platform.key) ?? null}
                      isPrimary={platform.key === detectedPlatform && platform.available}
                      delay={0.15 + i * 0.08}
                      onDownload={handleDownload}
                    />
                  ))
                : PLATFORMS.map((_, i) => <SkeletonButton key={i} delay={0.15 + i * 0.08} />)}
            </div>
          )}
        </div>

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
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <FileText className="h-3.5 w-3.5" />
            Changelog
          </a>
          {release && (
            <a
              href={release.html_url}
              className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
