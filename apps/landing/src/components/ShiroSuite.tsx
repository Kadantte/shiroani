import { motion } from 'framer-motion';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { ease } from '@/lib/animations';
import { MotionProvider } from './MotionProvider';

interface SuiteApp {
  kanji: string;
  name: string;
  /** Short role line (Polish). For the self card, call out "tutaj jesteś". */
  role: string;
  href: string;
  /** True only for the card representing this site (ShiroAni). */
  self?: boolean;
  /** Accent color variable (base oklch); used in the hover glow + kanji tint. */
  accent: string;
}

const apps: SuiteApp[] = [
  {
    kanji: '白アニ',
    name: 'ShiroAni',
    role: 'Tracker anime · tutaj jesteś',
    href: '#top',
    self: true,
    accent: 'var(--color-accent-pink)',
  },
  {
    kanji: '白波',
    name: 'Shiranami',
    role: 'Przystań dla muzyki',
    href: 'https://shiranami.app/',
    accent: 'var(--color-accent-discord)',
  },
  {
    kanji: '綺麗漫画',
    name: 'KireiManga',
    role: 'Czytnik mangi',
    href: 'https://kireimanga.app/',
    accent: 'var(--color-crimson)',
  },
];

export function ShiroSuite() {
  return (
    <MotionProvider>
      <section id="suite" className="relative px-6 py-28 lg:py-36">
        <div className="mx-auto max-w-6xl">
          {/* Section header — mirrors Features/BotSection layout */}
          <motion.div
            className="mb-14 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold-dim">
              Shiro Suite
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Jedna cicha półka na <span className="text-gradient-pink">anime</span>, mangę i
              muzykę.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              ShiroAni ma dwie siostrzane aplikacje w tym samym monorepo. Wszystkie trzy dzielą
              język wizualny i jedną zasadę: działają lokalnie, nie krzyczą i dobrze mieszka się z
              nimi na co dzień.
            </p>
          </motion.div>

          {/* Three-card row */}
          <div className="grid gap-4 sm:grid-cols-3">
            {apps.map((app, i) => (
              <SuiteCard key={app.name} app={app} index={i} />
            ))}
          </div>
        </div>
      </section>
    </MotionProvider>
  );
}

function SuiteCard({ app, index }: { app: SuiteApp; index: number }) {
  const isSelf = !!app.self;
  const external = !isSelf;

  const motionProps = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' } as const,
    transition: { duration: 0.55, delay: index * 0.08, ease },
  };

  const accentGlow = `oklch(from ${app.accent} l c h / 0.18)`;
  const accentBorder = `oklch(from ${app.accent} l c h / 0.35)`;

  const baseClass =
    'group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6 text-left transition-transform duration-300';

  const borderClass = isSelf
    ? 'border-primary/40'
    : 'border-border hover:-translate-y-0.5 active:scale-[0.99]';

  const focusRing =
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';

  return (
    <motion.a
      href={app.href}
      target={external ? '_blank' : '_self'}
      rel={external ? 'noopener noreferrer' : undefined}
      aria-current={isSelf ? 'page' : undefined}
      aria-label={
        isSelf ? `${app.name} — ${app.role}` : `${app.name} — ${app.role} (otwiera w nowej karcie)`
      }
      className={`${baseClass} ${borderClass} ${focusRing}`}
      {...motionProps}
    >
      {/* Hover glow — each app gets its own accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse at top, ${accentGlow}, transparent 70%)` }}
      />
      {/* Inner border highlight on hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent transition-colors duration-500 group-hover:border-[color:var(--card-border)]"
        style={{ ['--card-border' as string]: accentBorder }}
      />

      {/* Self badge — small "tutaj jesteś" pill in the top-right */}
      {isSelf && (
        <span
          className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary"
          aria-hidden="true"
        >
          <MapPin className="h-3 w-3" strokeWidth={2.5} />
          Tutaj jesteś
        </span>
      )}

      {/* External link affordance */}
      {external && (
        <ArrowUpRight
          className="absolute right-4 top-4 h-4 w-4 text-muted-foreground opacity-70 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden="true"
        />
      )}

      {/* Kanji — big, tinted with the app's accent, low opacity */}
      <div
        className="font-display text-5xl font-bold leading-none sm:text-6xl"
        style={{ color: `oklch(from ${app.accent} l c h / 0.9)` }}
        aria-hidden="true"
      >
        {app.kanji}
      </div>

      <div className="mt-auto pt-8">
        <h3 className="font-display text-lg font-bold tracking-tight">{app.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{app.role}</p>
      </div>
    </motion.a>
  );
}
