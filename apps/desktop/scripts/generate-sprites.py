"""
Generate sprite sheet assets for the desktop mascot overlay.

Converts the SVG chibi character into animation sprite sheets:
  - idle_sheet.png: 8-frame smooth bobbing animation (sinusoidal)
  - sit_sheet.png:  8-frame subtle sway animation

Requirements: cairosvg, Pillow
"""

import math
import os
import sys
from io import BytesIO

import cairosvg
from PIL import Image

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DESKTOP_DIR = os.path.dirname(SCRIPT_DIR)
SVG_PATH = os.path.join(DESKTOP_DIR, "..", "web", "public", "shiro-chibi.svg")
OUTPUT_DIR = os.path.join(DESKTOP_DIR, "resources", "mascot")

FRAME_SIZE = 256  # Render at high res, GDI+ scales down at runtime
NUM_FRAMES = 8


def svg_to_png(svg_path: str, width: int, height: int) -> Image.Image:
    """Convert SVG to a PIL Image at the specified dimensions."""
    png_data = cairosvg.svg2png(
        url=svg_path,
        output_width=width,
        output_height=height,
    )
    return Image.open(BytesIO(png_data)).convert("RGBA")


def create_idle_sheet(base: Image.Image) -> Image.Image:
    """Create an 8-frame idle bobbing animation sprite sheet.

    Uses sinusoidal easing for smooth up-down bobbing.
    Max displacement: 6 pixels at 256px (scales proportionally).
    """
    max_bob = 6
    sheet = Image.new("RGBA", (FRAME_SIZE * NUM_FRAMES, FRAME_SIZE), (0, 0, 0, 0))

    for i in range(NUM_FRAMES):
        # Sinusoidal bobbing: smooth up and down
        t = i / NUM_FRAMES
        dy = -int(round(max_bob * math.sin(t * 2 * math.pi)))

        frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        frame.paste(base, (0, dy), base)
        sheet.paste(frame, (i * FRAME_SIZE, 0))

    return sheet


def create_sit_sheet(base: Image.Image) -> Image.Image:
    """Create an 8-frame sitting/swaying animation sprite sheet.

    Uses sinusoidal easing for smooth left-right tilt.
    Max rotation: 2 degrees.
    """
    max_angle = 2.0
    sheet = Image.new("RGBA", (FRAME_SIZE * NUM_FRAMES, FRAME_SIZE), (0, 0, 0, 0))

    for i in range(NUM_FRAMES):
        t = i / NUM_FRAMES
        angle = max_angle * math.sin(t * 2 * math.pi)

        if abs(angle) < 0.1:
            frame = base.copy()
        else:
            frame = base.rotate(
                angle,
                resample=Image.BICUBIC,
                expand=False,
                center=(FRAME_SIZE // 2, FRAME_SIZE // 2),
            )
        sheet.paste(frame, (i * FRAME_SIZE, 0))

    return sheet


def main():
    svg_path = os.path.abspath(SVG_PATH)
    if not os.path.exists(svg_path):
        print(f"ERROR: SVG not found at {svg_path}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Converting SVG: {svg_path}")
    print(f"Output directory: {OUTPUT_DIR}")

    # Step 1: Convert SVG to base PNG at high resolution
    base = svg_to_png(svg_path, FRAME_SIZE, FRAME_SIZE)
    base_path = os.path.join(OUTPUT_DIR, "chibi_base.png")
    base.save(base_path, "PNG")
    print(f"  Created: chibi_base.png ({base.size[0]}x{base.size[1]})")

    # Step 2: Create idle bobbing sprite sheet
    idle_sheet = create_idle_sheet(base)
    idle_path = os.path.join(OUTPUT_DIR, "idle_sheet.png")
    idle_sheet.save(idle_path, "PNG")
    print(f"  Created: idle_sheet.png ({idle_sheet.size[0]}x{idle_sheet.size[1]})")

    # Step 3: Create sit/sway sprite sheet
    sit_sheet = create_sit_sheet(base)
    sit_path = os.path.join(OUTPUT_DIR, "sit_sheet.png")
    sit_sheet.save(sit_path, "PNG")
    print(f"  Created: sit_sheet.png ({sit_sheet.size[0]}x{sit_sheet.size[1]})")

    print("Done! All sprite assets generated.")


if __name__ == "__main__":
    main()
