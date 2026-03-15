import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import { ease } from '@/lib/animations';

/** Floating sparkle particles that follow cursor in hero */
function useCursorSparkles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const particles = useRef<
    {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      size: number;
      r: number;
      g: number;
      b: number;
    }[]
  >([]);
  const raf = useRef<number>(0);
  const isRunning = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = section.offsetWidth;
      canvas.height = section.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const startLoop = () => {
      if (isRunning.current) return;
      isRunning.current = true;
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.current = particles.current.filter(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.015;
          if (p.life <= 0) return false;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.life * 0.6})`;
          ctx.fill();
          return true;
        });
        if (particles.current.length > 0) {
          raf.current = requestAnimationFrame(animate);
        } else {
          isRunning.current = false;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };
      raf.current = requestAnimationFrame(animate);
    };

    let lastSpawn = 0;
    const onMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const now = Date.now();
      if (now - lastSpawn > 50) {
        lastSpawn = now;
        for (let j = 0; j < 2; j++) {
          particles.current.push({
            x: mx + (Math.random() - 0.5) * 8,
            y: my + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -Math.random() * 1.2 - 0.3,
            life: 1,
            size: Math.random() * 2.5 + 1,
            r: 220 + Math.round(Math.random() * 35),
            g: 130 + Math.round(Math.random() * 40),
            b: 180 + Math.round(Math.random() * 40),
          });
        }
        startLoop();
      }
    };

    section.addEventListener('mousemove', onMove);

    return () => {
      cancelAnimationFrame(raf.current);
      isRunning.current = false;
      window.removeEventListener('resize', resize);
      section.removeEventListener('mousemove', onMove);
    };
  }, []);

  return { canvasRef, sectionRef };
}

/** Mascot that reacts to hover with tilt */
function InteractiveMascot() {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 200,
    damping: 20,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      className="relative cursor-pointer"
      style={{
        rotateX,
        rotateY,
        animation: 'float-gentle 5s ease-in-out infinite',
        perspective: 800,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      <img
        src="/mascot.png"
        alt="ShiroAni maskotka — Shiro-chan"
        className="mx-auto mb-4 h-36 w-36 drop-shadow-2xl select-none sm:h-44 sm:w-44"
        draggable={false}
      />
      {/* Soft glow */}
      <div
        className="absolute inset-0 -z-10 m-auto h-24 w-24 rounded-full blur-2xl"
        style={{ background: 'oklch(0.72 0.15 350 / 0.2)' }}
      />
    </motion.div>
  );
}

export function Hero() {
  const { canvasRef, sectionRef } = useCursorSparkles();

  // Console easter egg
  useEffect(() => {
    console.log(
      '%c🌸 ShiroAni %c— Zaglądasz pod maskę? Szanuję. %chttps://github.com/Shironex/shiroani',
      'font-size: 16px; font-weight: bold; color: #f472b6;',
      'font-size: 13px; color: #a1a1aa;',
      'font-size: 13px; color: #60a5fa; text-decoration: underline;'
    );
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* Cursor sparkles layer */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20" />

      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, oklch(0.65 0.17 348 / 0.5), transparent 70%)',
            animation: 'drift-slow 30s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full opacity-10 blur-3xl"
          style={{
            background: 'radial-gradient(circle, oklch(0.7 0.1 85 / 0.5), transparent 70%)',
            animation: 'drift-slow 25s ease-in-out infinite reverse',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5"
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-xs font-medium text-primary">v0.1.0 — Pierwsze wydanie</span>
        </motion.div>

        {/* Interactive mascot */}
        <motion.div
          className="relative mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
        >
          <InteractiveMascot />
        </motion.div>

        <motion.h1
          className="font-display text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
        >
          Twój przytulny
          <br />
          <span className="text-gradient-pink">kącik anime</span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease }}
        >
          Przeglądaj, śledź i odkrywaj anime — wszystko w jednej desktopowej aplikacji z wbudowaną
          przeglądarką i&nbsp;społecznością.
        </motion.p>

        {/* CTAs with tactile press */}
        <motion.div
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease }}
        >
          <motion.a
            href="#pobierz"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20"
            whileHover={{ y: -2, boxShadow: '0 12px 30px -8px oklch(0.72 0.15 350 / 0.35)' }}
            whileTap={{ y: 1, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            Pobierz za darmo
          </motion.a>
          <motion.a
            href="https://discord.gg/shiroani"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-sm font-semibold text-foreground/80"
            whileHover={{ y: -2, borderColor: 'oklch(0.72 0.15 350 / 0.4)' }}
            whileTap={{ y: 1, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            Dołącz do Discord
          </motion.a>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.a
        href="#funkcje"
        aria-label="Przewiń do funkcji"
        className="absolute bottom-10 text-muted-foreground/40 transition-colors hover:text-primary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown className="h-5 w-5" />
        </motion.div>
      </motion.a>
    </section>
  );
}
