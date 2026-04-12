import { motion, AnimatePresence } from 'framer-motion';
import { X, Expand } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { ease } from '@/lib/animations';
import { MotionProvider } from './MotionProvider';

interface BentoCell {
  image?: string;
  title: string;
  desc: string;
  /** Tailwind grid classes for responsive sizing */
  className: string;
  /** 'cover' fills entire cell, 'contain' shows full image with padding */
  imageMode?: 'cover' | 'contain';
  /** Accent color for the hover glow */
  accent?: string;
}

const ACCENT_PINK_15 = 'oklch(from var(--color-accent-pink) l c h / 0.15)';
const ACCENT_PINK_12 = 'oklch(from var(--color-accent-pink) l c h / 0.12)';
const ACCENT_PINK_10 = 'oklch(from var(--color-accent-pink) l c h / 0.1)';
const ACCENT_DISCORD_15 = 'oklch(from var(--color-accent-discord) l c h / 0.15)';
const ACCENT_DISCORD_12 = 'oklch(from var(--color-accent-discord) l c h / 0.12)';
const ACCENT_GOLD_12 = 'oklch(from var(--color-accent-gold) l c h / 0.12)';
const ACCENT_GOLD_10 = 'oklch(from var(--color-accent-gold) l c h / 0.1)';
const ACCENT_GOLD_WARM_15 = 'oklch(from var(--color-accent-gold-warm) l c h / 0.15)';

const cells: BentoCell[] = [
  {
    image: '/bento/browser_view.webp',
    title: 'Wbudowana przeglądarka',
    desc: 'Oglądaj anime bez reklam. Karty, sesje, adblock w standardzie.',
    className: 'sm:col-span-2 sm:row-span-2',
    accent: ACCENT_PINK_15,
  },
  {
    image: '/bento/discord_rpc.webp',
    title: 'Discord Rich Presence',
    desc: 'Twoi znajomi widzą co oglądasz — automatycznie.',
    className: 'sm:col-span-1',
    imageMode: 'contain',
    accent: ACCENT_DISCORD_15,
  },
  {
    image: '/bento/onboarding.webp',
    title: 'Konfiguracja krok po kroku',
    desc: 'Motyw, tło, dock, Discord, adblock — gotowe w minutę.',
    className: 'sm:col-span-1',
    accent: ACCENT_PINK_12,
  },
  {
    image: '/bento/library_view.webp',
    title: 'Twoja biblioteka',
    desc: 'Śledź postępy, filtruj po statusie, przeglądaj okładki.',
    className: 'sm:col-span-1 sm:row-span-2',
    accent: ACCENT_GOLD_12,
  },
  {
    image: '/bento/schedule_view_2.webp',
    title: 'Harmonogram emisji',
    desc: 'Widok tygodniowy z odliczaniem do premiery nowych odcinków.',
    className: 'sm:col-span-2',
    accent: ACCENT_GOLD_WARM_15,
  },
  {
    image: '/bento/diary_view.webp',
    title: 'Osobisty dziennik',
    desc: 'Zapisuj przemyślenia o seriach w edytorze z formatowaniem.',
    className: 'sm:col-span-1',
    accent: ACCENT_PINK_10,
  },
  {
    image: '/bento/settings_view_discord.webp',
    title: 'Pełna kontrola nad statusem',
    desc: 'Własne szablony Discord RPC z podglądem na żywo.',
    className: 'sm:col-span-1',
    accent: ACCENT_DISCORD_12,
  },
  {
    title: 'Eksport i import danych',
    desc: 'Twoje dane, Twoja kontrola. Przenieś bibliotekę jednym kliknięciem.',
    className: 'sm:col-span-1',
    accent: ACCENT_GOLD_10,
  },
];

/** Full-screen image lightbox */
function Lightbox({
  image,
  title,
  onClose,
}: {
  image: string;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4 sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-lg bg-card/80 p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        aria-label="Zamknij podgląd"
      >
        <X className="h-5 w-5" />
      </button>

      <motion.img
        src={image}
        alt={title}
        className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.25, ease }}
        onClick={e => e.stopPropagation()}
        draggable={false}
      />
    </motion.div>
  );
}

function Cell({
  cell,
  index,
  onOpen,
}: {
  cell: BentoCell;
  index: number;
  onOpen: (image: string, title: string) => void;
}) {
  const hasImage = !!cell.image;
  const isContain = cell.imageMode === 'contain';

  const baseClass = `group relative overflow-hidden rounded-2xl border border-border bg-card text-left transition-transform ${cell.className}`;
  const interactiveClass = hasImage
    ? 'cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none'
    : '';

  const motionProps = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, delay: index * 0.06, ease },
  } as const;

  const inner = (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse at center, ${cell.accent ?? 'oklch(from var(--color-accent-pink) l c h / 0.1)'}, transparent 70%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-primary/0 transition-all duration-500 group-hover:border-primary/20" />

      {hasImage ? (
        <div className="flex h-full flex-col">
          {/* Expand icon hint — visible always on touch, hover-only on mouse */}
          <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg bg-background/60 p-1.5 text-foreground/50 transition-opacity duration-300 md:text-foreground/0 md:group-hover:text-foreground/70">
            <Expand className="h-3.5 w-3.5" />
          </div>

          <div
            className={`relative flex-1 overflow-hidden ${isContain ? 'flex items-center justify-center bg-surface p-4' : ''}`}
          >
            <img
              src={cell.image}
              alt={cell.title}
              loading="lazy"
              draggable={false}
              width={isContain ? 400 : 800}
              height={isContain ? 400 : 450}
              className={`select-none transition-transform duration-700 group-hover:scale-[1.02] ${
                isContain
                  ? 'max-h-full max-w-full rounded-lg object-contain'
                  : 'h-full w-full object-cover'
              }`}
            />
            {!isContain && (
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card via-card/80 to-transparent" />
            )}
          </div>

          <div className={`relative px-5 pb-5 ${isContain ? 'pt-2' : '-mt-16'}`}>
            <h3 className="font-display text-sm font-bold leading-tight">{cell.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{cell.desc}</p>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-end p-5">
          <div className="mb-auto flex items-center gap-2 pt-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gold-dim">
              Twoje dane
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-6">
            <h3 className="font-display text-sm font-bold">{cell.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{cell.desc}</p>
          </div>
        </div>
      )}
    </>
  );

  if (hasImage) {
    return (
      <motion.button
        type="button"
        className={`${baseClass} ${interactiveClass}`}
        {...motionProps}
        onClick={() => onOpen(cell.image!, cell.title)}
        aria-label={`${cell.title} — kliknij aby powiększyć`}
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <motion.div className={baseClass} {...motionProps}>
      {inner}
    </motion.div>
  );
}

export function Features() {
  const [lightbox, setLightbox] = useState<{ image: string; title: string } | null>(null);

  const openLightbox = useCallback((image: string, title: string) => {
    setLightbox({ image, title });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox(null);
  }, []);

  return (
    <MotionProvider>
      <section id="funkcje" className="relative px-6 py-28 lg:py-36">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <motion.div
            className="mb-14 max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold-dim">
              Funkcje
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Wszystko w jednym miejscu
            </h2>
            <p className="mt-3 text-muted-foreground">
              Nie opowiadamy — pokazujemy. Tak wygląda ShiroAni od środka.
            </p>
          </motion.div>

          {/* Bento grid */}
          <div className="grid auto-rows-[220px] gap-3 sm:grid-cols-3 sm:auto-rows-[200px] lg:auto-rows-[240px]">
            {cells.map((cell, i) => (
              <Cell key={cell.title} cell={cell} index={i} onOpen={openLightbox} />
            ))}
          </div>
        </div>

        {/* Lightbox overlay */}
        <AnimatePresence>
          {lightbox && (
            <Lightbox image={lightbox.image} title={lightbox.title} onClose={closeLightbox} />
          )}
        </AnimatePresence>
      </section>
    </MotionProvider>
  );
}
