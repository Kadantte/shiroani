import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <motion.img
            src="/mascot-sleep.png"
            alt="Shiro-chan śpi"
            className="h-10 w-10 opacity-70 select-none"
            draggable={false}
            whileHover={{ rotate: [0, -4, 4, -2, 0], scale: 1.05 }}
            transition={{ duration: 0.8 }}
          />
          <div>
            <span className="text-sm font-bold">
              Shiro<span className="text-primary">Ani</span>
            </span>
            <p className="text-xs text-muted-foreground">
              Stworzone z{' '}
              <motion.span
                className="inline-block text-primary"
                whileHover={{ scale: 1.3 }}
                transition={{ type: 'spring', stiffness: 500, damping: 10 }}
              >
                ♥
              </motion.span>{' '}
              przez Shiro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* GitHub link — hidden until repo is public */}
          <span
            className="text-muted-foreground/40 cursor-not-allowed"
            aria-label="Discord — wkrótce"
            title="Wkrótce dostępne"
          >
            <MessageCircle className="h-4.5 w-4.5" />
          </span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground/60">
        © {YEAR} ShiroAni · Source-available
      </p>
    </footer>
  );
}
