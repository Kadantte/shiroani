import { motion } from 'framer-motion';
import { ease } from '@/lib/animations';

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

const cells: BentoCell[] = [
  {
    image: '/bento/browser_view.jpeg',
    title: 'Wbudowana przeglądarka',
    desc: 'Oglądaj anime bez reklam. Karty, sesje, adblock w standardzie.',
    className: 'sm:col-span-2 sm:row-span-2',
    accent: 'oklch(0.72 0.15 350 / 0.15)',
  },
  {
    image: '/bento/discord_rpc.png',
    title: 'Discord Rich Presence',
    desc: 'Twoi znajomi widzą co oglądasz — automatycznie.',
    className: 'sm:col-span-1',
    imageMode: 'contain',
    accent: 'oklch(0.55 0.15 280 / 0.15)',
  },
  {
    image: '/bento/onboarding.jpeg',
    title: 'Konfiguracja krok po kroku',
    desc: 'Motyw, tło, dock, Discord, adblock — gotowe w minutę.',
    className: 'sm:col-span-1',
    accent: 'oklch(0.72 0.15 350 / 0.12)',
  },
  {
    image: '/bento/library_view.jpeg',
    title: 'Twoja biblioteka',
    desc: 'Śledź postępy, filtruj po statusie, przeglądaj okładki.',
    className: 'sm:col-span-1 sm:row-span-2',
    accent: 'oklch(0.75 0.12 85 / 0.12)',
  },
  {
    image: '/bento/schedule_view_2.jpeg',
    title: 'Harmonogram emisji',
    desc: 'Widok tygodniowy z odliczaniem do premiery nowych odcinków.',
    className: 'sm:col-span-2',
    accent: 'oklch(0.55 0.08 85 / 0.15)',
  },
  {
    image: '/bento/diary_view.jpeg',
    title: 'Osobisty dziennik',
    desc: 'Zapisuj przemyślenia o seriach w edytorze z formatowaniem.',
    className: 'sm:col-span-1',
    accent: 'oklch(0.72 0.15 350 / 0.1)',
  },
  {
    image: '/bento/settings_view_discord.jpeg',
    title: 'Pełna kontrola nad statusem',
    desc: 'Własne szablony Discord RPC z podglądem na żywo.',
    className: 'sm:col-span-1',
    accent: 'oklch(0.55 0.15 280 / 0.12)',
  },
  {
    title: 'Eksport i import danych',
    desc: 'Twoje dane, Twoja kontrola. Przenieś bibliotekę jednym kliknięciem.',
    className: 'sm:col-span-1',
    accent: 'oklch(0.75 0.12 85 / 0.1)',
  },
];

function Cell({ cell, index }: { cell: BentoCell; index: number }) {
  const hasImage = !!cell.image;

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card ${cell.className}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.06, ease }}
    >
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse at center, ${cell.accent ?? 'oklch(0.72 0.15 350 / 0.1)'}, transparent 70%)`,
        }}
      />

      {/* Hover border */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-primary/0 transition-all duration-500 group-hover:border-primary/20" />

      {hasImage ? (
        <div className="flex h-full flex-col">
          {/* Image area */}
          <div
            className={`relative flex-1 overflow-hidden ${cell.imageMode === 'contain' ? 'flex items-center justify-center bg-surface p-4' : ''}`}
          >
            <img
              src={cell.image}
              alt={cell.title}
              loading="lazy"
              draggable={false}
              width={cell.imageMode === 'contain' ? 400 : 800}
              height={cell.imageMode === 'contain' ? 400 : 450}
              className={`select-none transition-transform duration-700 group-hover:scale-[1.02] ${
                cell.imageMode === 'contain'
                  ? 'max-h-full max-w-full rounded-lg object-contain'
                  : 'h-full w-full object-cover'
              }`}
            />
            {/* Bottom fade for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card via-card/80 to-transparent" />
          </div>

          {/* Text overlay at bottom */}
          <div className="relative -mt-16 px-5 pb-5">
            <h3 className="font-display text-sm font-bold leading-tight">{cell.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{cell.desc}</p>
          </div>
        </div>
      ) : (
        /* Text-only cell */
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
    </motion.div>
  );
}

export function Features() {
  return (
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
            <Cell key={cell.title} cell={cell} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
