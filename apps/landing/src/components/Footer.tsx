import { motion } from 'framer-motion';
import { Github, MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <motion.img
            src="/mascot-sit.png"
            alt=""
            className="h-10 w-10 opacity-70 select-none"
            draggable={false}
            whileHover={{ rotate: [0, -8, 8, -4, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
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
          <motion.a
            href="https://github.com/Shironex/shiroani"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="GitHub"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.9 }}
          >
            <Github className="h-4.5 w-4.5" />
          </motion.a>
          <motion.a
            href="https://discord.gg/shiroani"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Discord"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.9 }}
          >
            <MessageCircle className="h-4.5 w-4.5" />
          </motion.a>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground/60">
        © {new Date().getFullYear()} ShiroAni · Source-available
      </p>
    </footer>
  );
}
