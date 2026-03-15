import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { Globe, BookOpen, Palette, Calendar, Wifi, Heart, Bell, Paintbrush } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ease } from '@/lib/animations';
import { useRef, useEffect, useState } from 'react';

interface Feature {
  icon: LucideIcon;
  iconHover: LucideIcon;
  title: string;
  desc: string;
  ticker?: { value: number; suffix: string };
}

const features: Feature[] = [
  {
    icon: Globe,
    iconHover: Wifi,
    title: 'Wbudowana przeglądarka',
    desc: 'Oglądaj anime bez reklam dzięki wbudowanemu adblockerowi. Karty, zakładki, sesje.',
    ticker: { value: 0, suffix: ' reklam' },
  },
  {
    icon: BookOpen,
    iconHover: Heart,
    title: 'Biblioteka i pamiętnik',
    desc: 'Śledź co oglądasz, prowadź osobisty dziennik z edytorem tekstu, eksportuj dane.',
  },
  {
    icon: Calendar,
    iconHover: Bell,
    title: 'Harmonogram emisji',
    desc: 'Nigdy nie przegap odcinka — widok tygodniowy, dzienny i powiadomienia z AniList.',
    ticker: { value: 7, suffix: ' dni w tygodniu' },
  },
  {
    icon: Palette,
    iconHover: Paintbrush,
    title: '39 motywów',
    desc: 'Od Dracula i Nord, przez Evangelion i Spy×Family, po własny motyw w edytorze.',
    ticker: { value: 39, suffix: ' motywów' },
  },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));

  useEffect(() => {
    if (inView) {
      animate(count, value, {
        duration: value === 0 ? 0.3 : 1.2,
        ease: [0.16, 1, 0.3, 1],
      });
    }
  }, [inView, count, value]);

  return (
    <span
      ref={ref}
      className="inline-flex items-baseline gap-0.5 font-display font-bold text-primary"
    >
      <motion.span>{rounded}</motion.span>
      <span className="text-primary/70">{suffix}</span>
    </span>
  );
}

/** Icon that crossfades to a different icon on hover */
function MorphIcon({
  icon: Icon,
  iconHover: IconHover,
  hovered,
}: {
  icon: LucideIcon;
  iconHover: LucideIcon;
  hovered: boolean;
}) {
  return (
    <div className="relative h-5 w-5">
      <Icon
        className="absolute inset-0 h-5 w-5 text-primary transition-all duration-200"
        style={{
          opacity: hovered ? 0 : 1,
          transform: hovered ? 'scale(0.7) rotate(-10deg)' : 'scale(1) rotate(0)',
        }}
        strokeWidth={1.5}
      />
      <IconHover
        className="absolute inset-0 h-5 w-5 text-primary transition-all duration-200"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'scale(1) rotate(0)' : 'scale(0.7) rotate(10deg)',
        }}
        strokeWidth={1.5}
      />
    </div>
  );
}

export function Features() {
  return (
    <section id="funkcje" className="relative px-6 py-28 lg:py-36">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-16 max-w-xl"
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
            Zero przełączania się między aplikacjami. Jedno kliknięcie — cały świat anime.
          </p>
        </motion.div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature: f, index: i }: { feature: Feature; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="group relative bg-background p-8 transition-colors duration-300 hover:bg-card lg:p-10"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: i * 0.08, ease }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mb-5">
        <MorphIcon icon={f.icon} iconHover={f.iconHover} hovered={hovered} />
      </div>

      <h3 className="mb-2 font-display text-lg font-bold">{f.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>

      {f.ticker && (
        <div className="mt-4">
          <AnimatedCounter value={f.ticker.value} suffix={f.ticker.suffix} />
        </div>
      )}

      <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div
          className="absolute right-3 top-3 h-8 w-8 rounded-full blur-xl"
          style={{ background: 'oklch(0.72 0.15 350 / 0.15)' }}
        />
      </div>
    </motion.div>
  );
}
