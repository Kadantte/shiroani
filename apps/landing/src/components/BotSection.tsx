import { motion, useInView } from 'framer-motion';
import { Trophy, Shield, Sparkles, UserCheck, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ease } from '@/lib/animations';
import { useRef } from 'react';

interface BotFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const botFeatures: BotFeature[] = [
  {
    icon: Trophy,
    title: 'System XP i poziomów',
    desc: 'Zdobywaj XP za aktywność, awansuj i odbieraj nagrody w postaci ról.',
  },
  {
    icon: Shield,
    title: 'Moderacja',
    desc: 'Ban, mute, clear z pełnym audytem. Logi edycji i usuwania wiadomości.',
  },
  {
    icon: Sparkles,
    title: 'Role reakcji',
    desc: 'Embedy z emoji, które automatycznie przydzielają role na serwerze.',
  },
  {
    icon: UserCheck,
    title: 'Weryfikacja',
    desc: 'System anti-bot z przyciskiem weryfikacji i automatycznym nadawaniem roli.',
  },
];

/** Fake XP progress bar that fills on scroll */
function XpProgressBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref} className="mt-8 overflow-hidden rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">Poziom 7</span>
        <span className="text-muted-foreground">2,450 / 2,850 XP</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, oklch(0.65 0.17 348), oklch(0.72 0.15 350))',
          }}
          initial={{ width: '0%' }}
          animate={inView ? { width: '86%' } : {}}
          transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Shine effect on fill */}
        {inView && (
          <motion.div
            className="absolute inset-y-0 w-12 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, oklch(1 0 0 / 0.2), transparent)',
            }}
            initial={{ left: '-3rem' }}
            animate={{ left: '100%' }}
            transition={{ duration: 0.8, delay: 1.5, ease: 'easeOut' }}
          />
        )}
      </div>
      <motion.p
        className="mt-2 text-center text-xs font-medium text-primary"
        initial={{ opacity: 0, y: 4 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 1.8, duration: 0.4 }}
      >
        ✨ Jeszcze 400 XP do Poziomu 8!
      </motion.p>
    </div>
  );
}

export function BotSection() {
  return (
    <section id="spolecznosc" className="relative px-6 py-28 lg:py-36">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-16 lg:grid-cols-5">
          {/* Left — editorial intro */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold-dim">
              Społeczność
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Nasz Discord
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              ShiroAni to nie tylko aplikacja — to społeczność. Nasz bot zarządza serwerem, śledzi
              aktywność i&nbsp;nagradza zaangażowanie.
            </p>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-dim" />
              <p className="text-sm text-muted-foreground">
                Bot jest <span className="font-medium text-foreground">prywatny</span> — działa
                wyłącznie na serwerze społeczności ShiroAni.
              </p>
            </div>

            {/* Join link with typing indicator */}
            <span
              className="mt-6 inline-flex cursor-not-allowed items-center gap-2 text-sm font-semibold text-primary/40"
              title="Wkrótce dostępne"
            >
              <span>Dołącz do serwera — W krótce</span>
            </span>

            {/* XP progress bar demo */}
            <XpProgressBar />
          </motion.div>

          {/* Right — feature list */}
          <div className="space-y-1 lg:col-span-3">
            {botFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                className="group flex items-start gap-4 rounded-xl p-5 transition-colors duration-200 hover:bg-card"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
              >
                <motion.div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8 transition-colors duration-200 group-hover:bg-primary/15"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <f.icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                </motion.div>
                <div>
                  <h3 className="font-display text-base font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
