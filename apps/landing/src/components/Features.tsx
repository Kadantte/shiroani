import { motion } from 'framer-motion';
import { Globe, BookOpen, Palette, Calendar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const features: Feature[] = [
  {
    icon: Globe,
    title: 'Wbudowana przeglądarka',
    desc: 'Oglądaj anime bez reklam dzięki wbudowanemu adblockerowi. Karty, zakładki, sesje.',
  },
  {
    icon: BookOpen,
    title: 'Biblioteka i pamiętnik',
    desc: 'Śledź co oglądasz, prowadź osobisty dziennik z edytorem tekstu, eksportuj dane.',
  },
  {
    icon: Calendar,
    title: 'Harmonogram emisji',
    desc: 'Nigdy nie przegap odcinka — widok tygodniowy, dzienny i powiadomienia z AniList.',
  },
  {
    icon: Palette,
    title: '39 motywów',
    desc: 'Od Dracula i Nord, przez Evangelion i Spy×Family, po własny motyw w edytorze.',
  },
];

export function Features() {
  return (
    <section id="funkcje" className="relative px-6 py-28 lg:py-36">
      <div className="mx-auto max-w-6xl">
        {/* Section header — left-aligned for editorial feel */}
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

        {/* Feature grid — 2×2, not identical cards but varied */}
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="group relative bg-background p-8 transition-colors duration-300 hover:bg-card lg:p-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08, ease }}
            >
              <f.icon
                className="mb-5 h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]"
                strokeWidth={1.5}
              />
              <h3 className="mb-2 font-display text-lg font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>

              {/* Subtle corner accent on hover */}
              <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div
                  className="absolute right-3 top-3 h-8 w-8 rounded-full blur-xl"
                  style={{ background: 'oklch(0.72 0.15 350 / 0.15)' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
