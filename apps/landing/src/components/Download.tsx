import { motion } from 'framer-motion';
import { Apple, Monitor, Github } from 'lucide-react';
import { ease } from '@/lib/animations';

const platforms = [
  { icon: Apple, label: 'macOS' },
  { icon: Monitor, label: 'Windows' },
];

export function Download() {
  return (
    <section id="pobierz" className="relative px-6 py-28 lg:py-36">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(ellipse, oklch(0.72 0.15 350 / 0.35), transparent 70%)',
          }}
        />
      </div>

      <motion.div
        className="relative mx-auto max-w-2xl text-center"
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease }}
      >
        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Gotowy?</h2>
        <p className="mt-4 text-lg text-muted-foreground">Darmowe i open source. Na zawsze.</p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {platforms.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex cursor-not-allowed items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-8 py-4 font-semibold text-foreground/40"
              title="Wkrótce dostępne"
            >
              <Icon className="h-5 w-5 text-muted-foreground/40" />
              {label} — W krótce
            </span>
          ))}
        </div>

        <a
          href="https://github.com/Shironex/shiroani"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Github className="h-4 w-4" />
          Kod źródłowy na GitHub
        </a>
      </motion.div>
    </section>
  );
}
