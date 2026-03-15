import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const ease = [0.16, 1, 0.3, 1] as const;

const screenshots = [
  {
    src: '/screenshots/library.jpeg',
    label: 'Biblioteka anime',
    caption: 'Twoja osobista kolekcja — wszystko w jednym miejscu',
  },
  {
    src: '/screenshots/schedule.jpeg',
    label: 'Harmonogram',
    caption: 'Nigdy nie przegap nowego odcinka',
  },
  {
    src: '/screenshots/newtab.jpeg',
    label: 'Nowa karta',
    caption: 'Szybki dostęp do ulubionych stron',
  },
  {
    src: '/screenshots/settings.jpeg',
    label: 'Ustawienia',
    caption: 'Motywy, tła i personalizacja',
  },
];

export function Preview() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);

  const navigate = (index: number) => {
    setDirection(index > active ? 1 : -1);
    setActive(index);
  };

  return (
    <section id="podgląd" className="relative px-6 py-28 lg:py-36">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold-dim">
            Podgląd
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Zaprojektowane z <span className="text-gradient-pink">dbałością o detale</span>
          </h2>
        </motion.div>

        {/* Screenshot tabs with animated indicator */}
        <div className="mb-6 flex flex-wrap justify-center gap-1">
          {screenshots.map((s, i) => (
            <motion.button
              key={s.label}
              onClick={() => navigate(i)}
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                i === active
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {i === active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{s.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Screenshot display with slide transition */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
        >
          {/* Glow behind */}
          <div
            className="absolute -inset-6 -z-10 rounded-3xl blur-3xl opacity-20"
            style={{
              background:
                'radial-gradient(ellipse at center, oklch(0.72 0.15 350 / 0.3), transparent 70%)',
            }}
          />

          <div className="screenshot-frame bg-card overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.img
                key={active}
                src={screenshots[active].src}
                alt={screenshots[active].label}
                className="w-full"
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                draggable={false}
              />
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={`cap-${active}`}
              className="mt-5 text-center text-sm italic text-muted-foreground"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              {screenshots[active].caption}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
