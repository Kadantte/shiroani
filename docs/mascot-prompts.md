# ShiroAni Mascot — Recraft AI Prompt Guide

## Platform Settings

- **Model**: Recraft V3 (not V4 — V4 doesn't support style presets)
- **Style**: Digital Illustration > **"Hand Drawn Outline"** (`hand_drawn_outline`)
- **Aspect ratio**: 1:1 (square)
- **Output**: 256x256 RGBA PNG

### Alternative Styles to Test

- Digital Illustration > "Outline Details" — slightly more interior detail
- Digital Illustration > "2D Art Poster" — bolder shapes
- Vector Illustration > "Line Art" — cleanest lines, may lose hand-drawn warmth

**Avoid**: "Grain", "Pencil Sketch", "Risograph", "Watercolor" — texture degrades at small sizes.

## Custom Style Setup (Critical for Consistency)

1. Create a new Recraft project for ShiroAni mascot
2. Upload `chibi_base.png` as reference image (up to 5 allowed)
3. Set Style Model to "Style essentials", Style Category to "Illustration"
4. Style Prompt:
   ```
   clean chibi anime illustration, black outline art, flat colors, minimal shading,
   pink and black and white color palette, cute kawaii character design, sticker style,
   simple clean lines
   ```
5. Save as "ShiroAni Chibi" — **use for every pose generation**

## Color Palette

| Color         | Hex       | Used For                           |
| ------------- | --------- | ---------------------------------- |
| Black         | `#000000` | Outlines, cat ears headband        |
| White/Cream   | `#FFF5F0` | Hair, skin base                    |
| Pink/Rose     | `#FF6B8A` | Clothing stars, shoes, accessories |
| Red/Dark Pink | `#CC3355` | Eyes, deeper accents               |
| Light Pink    | `#FFD4DD` | Blush, clothing base               |

## Character Anchor (use in EVERY prompt)

> chibi anime girl character, 2-head-tall proportions with oversized head and tiny body, long flowing white hair with twin tails tied with black polka-dot ribbons, black cat ear headband on top of head, pink star hair clips, red-pink eyes with gentle expression, small vampire fang on lower lip, wearing pink top with star pattern, black lace trim details, pink high-top sneakers with black and white accents, pale cream skin with pink blush marks on cheeks

---

## Poses

### 1. Idle/Standing — `chibi_idle.png` (default state)

Already generated. Use as primary custom style reference.

### 2. Sitting — `chibi_sit.png` (resting on taskbar)

```
A hand-drawn outline digital illustration of a chibi anime girl character, 2-head-tall
proportions with oversized head and tiny body, long flowing white hair with twin tails
tied with black polka-dot ribbons, black cat ear headband on top of head, pink star hair
clips, red-pink eyes with gentle expression, small vampire fang on lower lip, wearing
pink top with star pattern, black lace trim details, pink high-top sneakers with black
and white accents, pale cream skin with pink blush marks on cheeks. She is sitting down
with legs dangling over an edge, hands resting on the surface beside her, relaxed casual
sitting pose, looking forward with a content gentle smile. Clean black outlines, flat
colors, minimal shading, sticker style, full body visible, single character, centered
composition, transparent background.
```

### 3. Waving/Greeting — `chibi_wave.png` (app open / hover)

```
A hand-drawn outline digital illustration of a chibi anime girl character, 2-head-tall
proportions with oversized head and tiny body, long flowing white hair with twin tails
tied with black polka-dot ribbons, black cat ear headband on top of head, pink star hair
clips, red-pink eyes with cheerful happy expression, small vampire fang showing in open
smile, wearing pink top with star pattern, black lace trim details, pink high-top
sneakers with black and white accents, pale cream skin with pink blush marks on cheeks.
She is standing and waving hello with one hand raised high, open palm waving gesture,
other arm at her side, bright cheerful expression with open mouth smile, energetic
friendly greeting pose. Clean black outlines, flat colors, minimal shading, sticker
style, full body visible, single character, centered composition, transparent background.
```

### 4. Sleeping/Drowsy — `chibi_sleep.png` (late night / idle)

```
A hand-drawn outline digital illustration of a chibi anime girl character, 2-head-tall
proportions with oversized head and tiny body, long flowing white hair with twin tails
tied with black polka-dot ribbons, black cat ear headband on top of head, pink star hair
clips, eyes closed peacefully with curved sleepy line eyelids, small vampire fang on
lower lip, wearing pink top with star pattern, black lace trim details, pink high-top
sneakers with black and white accents, pale cream skin with pink blush marks on cheeks.
She is sitting and dozing off, head tilted to one side resting on her hand, eyes gently
closed, small floating Z letters near her head indicating sleep, peaceful sleepy relaxed
pose, curled up slightly. Clean black outlines, flat colors, minimal shading, sticker
style, full body visible, single character, centered composition, transparent background.
```

### 5. Excited/Happy — `chibi_excited.png` (new episode / notification)

```
A hand-drawn outline digital illustration of a chibi anime girl character, 2-head-tall
proportions with oversized head and tiny body, long flowing white hair with twin tails
tied with black polka-dot ribbons, black cat ear headband on top of head, pink star hair
clips, red-pink eyes sparkling with excitement and joy, small vampire fang showing in
wide open happy grin, wearing pink top with star pattern, black lace trim details, pink
high-top sneakers with black and white accents, pale cream skin with bright pink blush
marks on cheeks. She is jumping up with both arms raised in celebration, fists pumping
in the air excitedly, feet off the ground in a happy jump, sparkle effects and small
star shapes floating around her, extremely happy excited energetic pose. Clean black
outlines, flat colors, minimal shading, sticker style, full body visible, single
character, centered composition, transparent background.
```

### 6. Thinking — `chibi_think.png` (loading states)

```
A hand-drawn outline digital illustration of a chibi anime girl character, 2-head-tall
proportions with oversized head and tiny body, long flowing white hair with twin tails
tied with black polka-dot ribbons, black cat ear headband on top of head, pink star hair
clips, red-pink eyes looking upward to the side thoughtfully, small vampire fang on
lower lip, wearing pink top with star pattern, black lace trim details, pink high-top
sneakers with black and white accents, pale cream skin with pink blush marks on cheeks.
She is standing in a thinking pose with one hand on her chin, index finger touching her
cheek, head tilted slightly, looking upward as if pondering something, curious thoughtful
expression, small question mark or thought bubble floating above her head. Clean black
outlines, flat colors, minimal shading, sticker style, full body visible, single
character, centered composition, transparent background.
```

### 7. Reading/Watching — `chibi_read.png` (browsing anime)

```
A hand-drawn outline digital illustration of a chibi anime girl character, 2-head-tall
proportions with oversized head and tiny body, long flowing white hair with twin tails
tied with black polka-dot ribbons, black cat ear headband on top of head, pink star hair
clips, red-pink eyes looking down focused and interested, small vampire fang on lower
lip, wearing pink top with star pattern, black lace trim details, pink high-top sneakers
with black and white accents, pale cream skin with pink blush marks on cheeks. She is
sitting and holding a small book open in both hands, reading intently with a gentle
focused expression, slightly hunched forward looking at the book, absorbed in reading,
cozy relaxed pose. Clean black outlines, flat colors, minimal shading, sticker style,
full body visible, single character, centered composition, transparent background.
```

### 8. Pointing — `chibi_point.png` (notifications)

```
A hand-drawn outline digital illustration of a chibi anime girl character, 2-head-tall
proportions with oversized head and tiny body, long flowing white hair with twin tails
tied with black polka-dot ribbons, black cat ear headband on top of head, pink star hair
clips, red-pink eyes looking in the direction she is pointing with an alert expression,
small vampire fang showing in slight smile, wearing pink top with star pattern, black
lace trim details, pink high-top sneakers with black and white accents, pale cream skin
with pink blush marks on cheeks. She is standing and pointing to the right side with her
right arm fully extended, index finger pointing, other hand on her hip, turning her body
slightly toward the direction she points, confident attention-getting pose, looking
toward where she points. Clean black outlines, flat colors, minimal shading, sticker
style, full body visible, single character, centered composition, transparent background.
```

> For a left-pointing version, mirror the PNG in post-processing or regenerate with "pointing to the left side with her left arm."

---

## Generation Workflow

1. Open the ShiroAni project in Recraft
2. Select the saved "ShiroAni Chibi" custom style
3. Set aspect ratio to 1:1
4. Paste the prompt for the desired pose
5. Generate 4+ images
6. Pick the best match to the base character
7. Remove background if needed (scissors tool)
8. Export as PNG
9. Resize to 256x256 (LANCZOS resampling)
10. Save as `chibi_[pose].png` in `apps/desktop/resources/mascot/`

## Transparency Tips

- Try "transparent background" in prompt first
- Fallback: generate on solid white, then use Recraft's background remover
- Never upscale after removing background (destroys alpha)

## Consistency Tips

- Always use the same custom style for every generation
- Keep character description block identical — only change pose sentences
- Generate all poses in one session if possible
- Place base image on canvas next to new generations as visual reference
- Cherry-pick aggressively (4+ variations per pose)
- Review all poses side-by-side at 128px display size for final consistency check
