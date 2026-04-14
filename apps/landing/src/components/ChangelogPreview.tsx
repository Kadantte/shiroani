import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ease } from '@/lib/animations';
import { releases } from '@/lib/releases';
import { MotionProvider } from './MotionProvider';

export function ChangelogPreview() {
  const latest = releases.slice(0, 2);

  return (
    <MotionProvider>
      <section id="zmiany" className="relative px-6 py-24 lg:py-28">
        <motion.div
          className="mx-auto max-w-5xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                Aktywny rozwój
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Co ostatnio się zmieniło
              </h2>
            </div>
            <a
              href="/changelog"
              className="group inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              Cała lista zmian
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {latest.map((release, i) => (
              <motion.a
                key={release.version}
                href="/changelog"
                className="group relative flex flex-col rounded-2xl border border-border/60 bg-card/40 p-6 transition-colors duration-200 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-semibold text-primary">v{release.version}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{release.date}</span>
                </div>
                <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
                  {release.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {release.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary/80 transition-colors group-hover:text-primary">
                  Zobacz szczegóły
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </section>
    </MotionProvider>
  );
}
