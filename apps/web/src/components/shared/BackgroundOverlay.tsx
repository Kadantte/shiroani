/**
 * BackgroundOverlay renders a fixed background image behind all app content.
 * It reads CSS custom properties set by the settings store:
 *   --app-bg-image: url(shiroani-bg://backgrounds/filename.ext)
 *   --app-bg-opacity: 0-1
 *   --app-bg-blur: Npx
 */
export function BackgroundOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Background image layer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'var(--app-bg-image)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 'var(--app-bg-opacity, 0.15)' as unknown as number,
          filter: 'blur(var(--app-bg-blur, 0px))',
        }}
      />
      {/* Semi-transparent overlay for text readability */}
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
}
