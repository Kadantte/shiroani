import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const links = [
  { label: 'Funkcje', href: '#funkcje' },
  { label: 'Podgląd', href: '#podglad' },
  { label: 'Społeczność', href: '#spolecznosc' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Pobierz', href: '/download' },
];

const focusRing = 'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useMotionValueEvent(scrollY, 'change', v => setScrolled(v > 60));

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'oklch(0.08 0.005 0 / 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.3)' : 'none',
        borderBottom: scrolled ? '1px solid oklch(0.22 0.01 350 / 0.5)' : '1px solid transparent',
      }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className={`flex items-center gap-2.5 rounded-md ${focusRing}`}>
          <img src="/favicon.png" alt="" className="h-7 w-7" />
          <span className="font-display text-base font-bold tracking-tight">
            Shiro<span className="text-primary">Ani</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className={`rounded-md text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground ${focusRing}`}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/download"
            className={`rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/85 sm:px-4 sm:py-2 sm:text-sm ${focusRing}`}
          >
            Pobierz
          </a>

          <button
            className={`rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden ${focusRing}`}
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label={mobileOpen ? 'Zamknij menu' : 'Otwórz menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/10 bg-background/95 backdrop-blur-lg md:hidden"
            role="navigation"
            aria-label="Menu mobilne"
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Escape') setMobileOpen(false);
            }}
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
              {links.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={e => {
                    if (href.startsWith('#')) {
                      e.preventDefault();
                      setMobileOpen(false);
                      const el = document.querySelector(href);
                      if (el) {
                        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 300);
                      }
                    } else {
                      setMobileOpen(false);
                    }
                  }}
                  className={`rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:bg-white/5 hover:text-foreground ${focusRing}`}
                >
                  {label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
