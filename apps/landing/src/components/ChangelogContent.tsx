import { motion } from 'framer-motion';
import { ease } from '@/lib/animations';
import { releases, type Release } from '@/lib/releases';
import { MotionProvider } from './MotionProvider';

function ReleaseCard({ release, index }: { release: Release; index: number }) {
  return (
    <motion.article
      className="relative"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease }}
    >
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-xs font-semibold text-primary">v{release.version}</span>
          </span>
          <span className="text-sm text-muted-foreground">{release.date}</span>
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {release.title}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          {release.description}
        </p>
      </div>

      <div className="space-y-8">
        {release.categories.map(cat => (
          <div key={cat.label}>
            <div className="mb-4 flex items-center gap-2">
              <cat.icon className={`h-4 w-4 ${cat.color}`} strokeWidth={1.5} />
              <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                {cat.label}
              </h3>
            </div>
            <ul className="space-y-2">
              {cat.entries.map((entry, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-card"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.03, ease }}
                >
                  <entry.icon
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70"
                    strokeWidth={1.5}
                  />
                  <span className="text-sm text-foreground/80">{entry.text}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.article>
  );
}

export function ChangelogContent() {
  return (
    <MotionProvider>
      <motion.div
        className="mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
          Lista zmian
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Co nowego?</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Historia zmian i nowych funkcji w ShiroAni.
        </p>
      </motion.div>

      <div className="space-y-20">
        {releases.map((release, i) => (
          <ReleaseCard key={release.version} release={release} index={i} />
        ))}
      </div>
    </MotionProvider>
  );
}
