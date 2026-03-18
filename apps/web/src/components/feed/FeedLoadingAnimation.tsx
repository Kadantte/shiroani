/**
 * Delightful SVG loading animation with animated RSS signal waves,
 * floating news card silhouettes, and subtle sparkle effects.
 */
export function FeedLoadingAnimation() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 select-none">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="feed-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="card-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Signal waves expanding outward from center */}
          {[0, 1, 2].map(i => (
            <circle
              key={`wave-${i}`}
              cx="100"
              cy="110"
              r="20"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              opacity="0"
            >
              <animate
                attributeName="r"
                from="20"
                to="80"
                dur="2.4s"
                begin={`${i * 0.8}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.5;0.2;0"
                dur="2.4s"
                begin={`${i * 0.8}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          {/* RSS Icon - dot */}
          <circle cx="82" cy="128" r="6" fill="url(#feed-grad)">
            <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* RSS Icon - inner arc */}
          <path
            d="M 78 108 A 26 26 0 0 1 104 134"
            fill="none"
            stroke="url(#feed-grad)"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-opacity"
              values="0.4;0.9;0.4"
              dur="2s"
              begin="0.3s"
              repeatCount="indefinite"
            />
          </path>

          {/* RSS Icon - outer arc */}
          <path
            d="M 78 90 A 44 44 0 0 1 122 134"
            fill="none"
            stroke="url(#feed-grad)"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-opacity"
              values="0.3;0.8;0.3"
              dur="2s"
              begin="0.6s"
              repeatCount="indefinite"
            />
          </path>

          {/* Floating card 1 - top right */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 3,-8; 0,0"
              dur="4s"
              repeatCount="indefinite"
            />
            <rect
              x="138"
              y="42"
              width="36"
              height="26"
              rx="4"
              fill="url(#card-grad)"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              strokeOpacity="0.2"
            />
            <rect
              x="142"
              y="47"
              width="16"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.15"
            />
            <rect
              x="142"
              y="52"
              width="28"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.1"
            />
            <rect
              x="142"
              y="57"
              width="22"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.08"
            />
            <animate
              attributeName="opacity"
              values="0;0.8;0.8;0"
              dur="4s"
              repeatCount="indefinite"
            />
          </g>

          {/* Floating card 2 - top left */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; -4,-6; 0,0"
              dur="5s"
              begin="1.2s"
              repeatCount="indefinite"
            />
            <rect
              x="22"
              y="50"
              width="40"
              height="28"
              rx="4"
              fill="url(#card-grad)"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              strokeOpacity="0.2"
            />
            <rect
              x="26"
              y="55"
              width="12"
              height="8"
              rx="2"
              fill="hsl(var(--primary))"
              fillOpacity="0.12"
            />
            <rect
              x="26"
              y="66"
              width="32"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.1"
            />
            <rect
              x="26"
              y="71"
              width="24"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.08"
            />
            <animate
              attributeName="opacity"
              values="0;0.7;0.7;0"
              dur="5s"
              begin="1.2s"
              repeatCount="indefinite"
            />
          </g>

          {/* Floating card 3 - right middle */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 5,-10; 0,0"
              dur="4.5s"
              begin="0.6s"
              repeatCount="indefinite"
            />
            <rect
              x="148"
              y="110"
              width="32"
              height="24"
              rx="4"
              fill="url(#card-grad)"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              strokeOpacity="0.2"
            />
            <rect
              x="152"
              y="115"
              width="10"
              height="6"
              rx="1.5"
              fill="hsl(var(--primary))"
              fillOpacity="0.12"
            />
            <rect
              x="152"
              y="124"
              width="24"
              height="2"
              rx="1"
              fill="hsl(var(--primary))"
              fillOpacity="0.1"
            />
            <rect
              x="152"
              y="129"
              width="18"
              height="1.5"
              rx="0.75"
              fill="hsl(var(--primary))"
              fillOpacity="0.08"
            />
            <animate
              attributeName="opacity"
              values="0;0.6;0.6;0"
              dur="4.5s"
              begin="0.6s"
              repeatCount="indefinite"
            />
          </g>

          {/* Sparkles */}
          {[
            { cx: 155, cy: 35, delay: '0s' },
            { cx: 35, cy: 85, delay: '1.5s' },
            { cx: 165, cy: 85, delay: '0.8s' },
            { cx: 60, cy: 35, delay: '2.1s' },
          ].map((s, i) => (
            <circle key={`sparkle-${i}`} cx={s.cx} cy={s.cy} r="1.5" fill="hsl(var(--primary))">
              <animate
                attributeName="opacity"
                values="0;0.8;0"
                dur="2s"
                begin={s.delay}
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="0.5;2;0.5"
                dur="2s"
                begin={s.delay}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </svg>
      </div>

      {/* Loading text with animated dots */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground/60">
        <span>Pobieranie aktualności</span>
        <span className="inline-flex w-6">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="inline-block w-1 h-1 rounded-full bg-primary/50"
              style={{
                animation: 'feed-dot 1.4s infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
