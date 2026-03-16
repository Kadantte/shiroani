import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ease } from '@/lib/animations';

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

        <div className="mt-10 flex flex-col items-center gap-4">
          <a
            href="/download"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            Pobierz ShiroAni
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
          <span className="text-xs text-muted-foreground">Dostępne na macOS i Windows</span>
        </div>
      </motion.div>
    </section>
  );
}
