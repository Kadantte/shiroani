import type { UserProfile } from '@shiroani/shared';

const WIDTH = 800;
const HEIGHT = 420;

// Colors
const BG_PRIMARY = '#0f0f14';
const BG_CARD = '#16161e';
const BG_BAR = '#1e1e2a';
const TEXT_PRIMARY = '#e4e4ef';
const TEXT_SECONDARY = '#8b8ba0';
const TEXT_MUTED = '#5c5c72';
const ACCENT = '#7c5bf5'; // Purple accent matching oklch(0.55 0.25 265)
const ACCENT_DIM = '#4a3596';
const DIVIDER = '#22222e';

/** Load an image from URL, returning null on failure. */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Draw text truncated to a max pixel width. */
function drawTruncated(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
) {
  let t = text;
  while (ctx.measureText(t).width > maxWidth && t.length > 0) {
    t = t.slice(0, -1);
  }
  if (t.length < text.length && t.length > 0) t = t.slice(0, -1) + '\u2026';
  ctx.fillText(t, x, y);
}

/** Draw rounded rectangle path. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function formatDays(minutes: number): string {
  const days = minutes / 60 / 24;
  return days >= 1 ? `${days.toFixed(1)} dni` : `${(minutes / 60).toFixed(1)}h`;
}

function formatScore(score: number): string {
  return score > 0 ? score.toFixed(1) : '\u2014';
}

/**
 * Renders the user profile card onto a canvas and returns it as a base64 PNG string (without data: prefix).
 */
export async function renderProfileCard(profile: UserProfile): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──
  ctx.fillStyle = BG_PRIMARY;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle gradient overlay from top-left
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0, 'rgba(124, 91, 245, 0.06)');
  bgGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  bgGrad.addColorStop(1, 'rgba(124, 91, 245, 0.03)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ── Favourite covers as faded background collage (right side) ──
  if (profile.favourites.length > 0) {
    const coverSlots = profile.favourites.slice(0, 4);
    const coverWidth = 120;
    const coverHeight = 170;
    const startX = WIDTH - coverSlots.length * (coverWidth - 20) - 20;

    for (let i = 0; i < coverSlots.length; i++) {
      const fav = coverSlots[i];
      if (!fav.coverImage) continue;
      const img = await loadImage(fav.coverImage);
      if (!img) continue;

      const x = startX + i * (coverWidth - 20);
      const y = 10;

      ctx.save();
      ctx.globalAlpha = 0.07;
      roundRect(ctx, x, y, coverWidth, coverHeight, 8);
      ctx.clip();
      ctx.drawImage(img, x, y, coverWidth, coverHeight);
      ctx.restore();
    }

    // Fade overlay over covers
    const fadeGrad = ctx.createLinearGradient(startX - 60, 0, startX + 60, 0);
    fadeGrad.addColorStop(0, BG_PRIMARY);
    fadeGrad.addColorStop(1, 'rgba(15, 15, 20, 0.4)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(startX - 60, 0, 120, HEIGHT);
  }

  const { statistics: stats } = profile;

  // ── Left side: Avatar + Username ──
  const leftPad = 32;
  let cursorY = 32;

  // Avatar
  const avatarSize = 64;
  if (profile.avatar) {
    const avatarImg = await loadImage(profile.avatar);
    if (avatarImg) {
      ctx.save();
      roundRect(ctx, leftPad, cursorY, avatarSize, avatarSize, 14);
      ctx.clip();
      ctx.drawImage(avatarImg, leftPad, cursorY, avatarSize, avatarSize);
      ctx.restore();

      // Avatar border
      ctx.strokeStyle = ACCENT_DIM;
      ctx.lineWidth = 2;
      roundRect(ctx, leftPad, cursorY, avatarSize, avatarSize, 14);
      ctx.stroke();
    }
  } else {
    // Placeholder
    ctx.fillStyle = BG_CARD;
    roundRect(ctx, leftPad, cursorY, avatarSize, avatarSize, 14);
    ctx.fill();
  }

  // Username
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = 'bold 22px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  drawTruncated(ctx, profile.name, leftPad + avatarSize + 16, cursorY + 22, 280);

  // AniList badge
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '12px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('AniList', leftPad + avatarSize + 16, cursorY + 48);

  cursorY += avatarSize + 28;

  // ── Key stats in a 2x2 grid ──
  const statItems = [
    { value: String(stats.count), label: 'Anime' },
    { value: String(stats.episodesWatched), label: 'Odcinki' },
    { value: formatDays(stats.minutesWatched), label: 'Czas' },
    { value: formatScore(stats.meanScore), label: 'Srednia' },
  ];

  const statGridLeft = leftPad;
  const statBoxW = 105;
  const statBoxH = 58;
  const statGap = 8;

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = statGridLeft + col * (statBoxW + statGap);
    const y = cursorY + row * (statBoxH + statGap);

    // Stat card background
    ctx.fillStyle = BG_CARD;
    roundRect(ctx, x, y, statBoxW, statBoxH, 10);
    ctx.fill();

    // Accent line on left
    ctx.fillStyle = ACCENT;
    roundRect(ctx, x, y, 3, statBoxH, 2);
    ctx.fill();

    // Value
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = 'bold 20px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(statItems[i].value, x + 14, y + 10);

    // Label
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = '11px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillText(statItems[i].label, x + 14, y + 36);
  }

  cursorY += 2 * statBoxH + statGap + 20;

  // ── Top genres (left side, below stats) ──
  const topGenres = stats.genres.slice(0, 3);
  if (topGenres.length > 0) {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '10px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('TOP GATUNKI', leftPad, cursorY);
    cursorY += 16;

    for (const genre of topGenres) {
      ctx.fillStyle = ACCENT;
      ctx.font = '12px "Inter", "Segoe UI", system-ui, sans-serif';
      ctx.fillText('\u25CF', leftPad, cursorY);
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.font = '13px "Inter", "Segoe UI", system-ui, sans-serif';
      drawTruncated(ctx, genre.name, leftPad + 14, cursorY, 140);
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = '11px "Inter", "Segoe UI", system-ui, sans-serif';
      const genreNameWidth = Math.min(ctx.measureText(genre.name).width, 140);
      ctx.fillText(`${genre.count}`, leftPad + 14 + genreNameWidth + 8, cursorY + 1);
      cursorY += 20;
    }
  }

  // ── Right side: Genre bar chart + score chart ──
  const rightX = 310;
  const chartWidth = 260;
  let rightY = 32;

  const topGenresChart = stats.genres.slice(0, 5);
  if (topGenresChart.length > 0) {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '10px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('GATUNKI', rightX, rightY);
    rightY += 18;

    const maxCount = Math.max(...topGenresChart.map(g => g.count), 1);
    const barHeight = 18;
    const barGap = 6;

    for (const genre of topGenresChart) {
      const pct = genre.count / maxCount;

      // Label
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = '11px "Inter", "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      drawTruncated(ctx, genre.name, rightX, rightY + barHeight / 2, 80);

      // Bar background
      const barX = rightX + 88;
      const barW = chartWidth - 88;
      ctx.fillStyle = BG_BAR;
      roundRect(ctx, barX, rightY, barW, barHeight, 4);
      ctx.fill();

      // Bar fill
      const fillW = Math.max(barW * pct, 6);
      const barGradient = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      barGradient.addColorStop(0, ACCENT);
      barGradient.addColorStop(1, ACCENT_DIM);
      ctx.fillStyle = barGradient;
      roundRect(ctx, barX, rightY, fillW, barHeight, 4);
      ctx.fill();

      // Count label
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.font = 'bold 10px "Inter", "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(genre.count), barX + fillW + 6, rightY + barHeight / 2);

      rightY += barHeight + barGap;
    }
  }

  // ── Right side: Score distribution mini chart ──
  rightY += 12;
  const scoreChartX = rightX;
  const scoreChartW = chartWidth;
  const scoreChartH = 80;

  if (stats.scores.length > 0) {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '10px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('ROZKLAD OCEN', scoreChartX, rightY);
    rightY += 18;

    // Fill in all scores 1-10
    const scoreMap = new Map(stats.scores.map(s => [s.score, s.count]));
    const filled = Array.from({ length: 10 }, (_, i) => ({
      score: (i + 1) * 10,
      count: scoreMap.get((i + 1) * 10) ?? 0,
    }));

    const maxScoreCount = Math.max(...filled.map(s => s.count), 1);
    const barW = (scoreChartW - 9 * 4) / 10; // 4px gap between bars
    const chartBottom = rightY + scoreChartH;

    for (let i = 0; i < 10; i++) {
      const { score, count } = filled[i];
      const pct = count / maxScoreCount;
      const barH = Math.max(scoreChartH * pct, 3);
      const x = scoreChartX + i * (barW + 4);
      const y = chartBottom - barH;

      // Bar
      const grad = ctx.createLinearGradient(0, y, 0, chartBottom);
      grad.addColorStop(0, ACCENT);
      grad.addColorStop(1, ACCENT_DIM);
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW, barH, 3);
      ctx.fill();

      // Score label
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = '9px "Inter", "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'top';
      const label = String(score / 10);
      const labelW = ctx.measureText(label).width;
      ctx.fillText(label, x + (barW - labelW) / 2, chartBottom + 4);
    }
  }

  // ── Bottom bar ──
  const bottomBarY = HEIGHT - 44;

  // Divider line
  ctx.fillStyle = DIVIDER;
  ctx.fillRect(0, bottomBarY, WIDTH, 1);

  // Left: ShiroAni branding
  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 14px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const brandY = bottomBarY + 22;
  ctx.fillText('ShiroAni', leftPad, brandY);

  const brandW = ctx.measureText('ShiroAni').width;
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '11px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('shiroani.app', leftPad + brandW + 10, brandY);

  // Right: username + date
  const date = new Date().toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '11px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${profile.name} \u00B7 ${date}`, WIDTH - 32, brandY);
  ctx.textAlign = 'left';

  // ── Decorative corner accent ──
  ctx.strokeStyle = ACCENT_DIM;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.lineTo(0, 0);
  ctx.lineTo(3, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(WIDTH - 3, 0);
  ctx.lineTo(WIDTH, 0);
  ctx.lineTo(WIDTH, 3);
  ctx.stroke();

  // ── Card outer border ──
  ctx.strokeStyle = 'rgba(124, 91, 245, 0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, WIDTH - 1, HEIGHT - 1, 12);
  ctx.stroke();

  // Extract base64 PNG (strip the "data:image/png;base64," prefix)
  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.replace(/^data:image\/png;base64,/, '');
}

/**
 * Returns the profile card as a full data URL (for preview rendering in an <img> tag).
 */
export async function renderProfileCardDataUrl(profile: UserProfile): Promise<string> {
  const base64 = await renderProfileCard(profile);
  return `data:image/png;base64,${base64}`;
}
