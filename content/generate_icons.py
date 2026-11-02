#!/usr/bin/env python3
"""Generate Instarols extension icons (PNG) using PIL.

Produces:
  content/icon-16.png, content/icon-32.png, content/icon-48.png,
  content/icon-128.png          — main icons
  content/icon-sleep-16.png, content/icon-sleep-32.png — muted/sleep variants

Run:
  python content/generate_icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent  # content/

# Instarols palette
BG_DARK = (16, 17, 22, 255)          # near-black panel
BG_SLEEP = (10, 11, 14, 255)         # even darker for sleep state
WHITE = (255, 255, 255, 255)
ACCENT = (76, 141, 255, 255)         # Instarols blue (#4c8dff)
ACCENT_SLEEP = (90, 100, 115, 255)   # desaturated blue for sleep
ACCENT_RING = (110, 170, 255, 180)   # softer ring


def _round_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def _draw_play(draw, cx, cy, size, fill):
    """YouTube-style play triangle."""
    half = size / 2
    pts = [
        (cx - half * 0.42, cy - half * 0.55),
        (cx - half * 0.42, cy + half * 0.55),
        (cx + half * 0.55, cy),
    ]
    draw.polygon(pts, fill=fill)


def _draw_reel_ring(draw, cx, cy, outer_r, inner_r, width, fill):
    """Film-reel ring around the play triangle."""
    draw.ellipse(
        [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r],
        outline=fill,
        width=width,
    )
    draw.ellipse(
        [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
        fill=BG_DARK,
    )


def _draw_volume_bar(draw, cx, cy, w, h, fill):
    """Small volume level bar beneath the reel."""
    draw.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], radius=h / 2, fill=fill)
    fill_w = w * 0.55
    draw.rounded_rectangle([cx - w / 2, cy - h / 2, cx - w / 2 + fill_w, cy + h / 2], radius=h / 2, fill=WHITE)


def build_icon(size, sleep=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    bg = BG_SLEEP if sleep else BG_DARK
    accent = ACCENT_SLEEP if sleep else ACCENT
    ring = ACCENT_RING if sleep else ACCENT

    # background panel
    _round_rect(d, [0, 0, size, size], radius=size * 0.22, fill=bg)

    cx, cy = size / 2, size / 2 * 0.92  # slightly above center to leave room for volume bar

    # reel ring
    outer_r = size * 0.30
    inner_r = size * 0.12
    _draw_reel_ring(d, cx, cy, outer_r, inner_r, max(2, int(size * 0.035)), ring)

    # play triangle
    _draw_play(d, cx, cy, size * 0.42, WHITE)

    # center dot
    d.ellipse(
        [cx - size * 0.045, cy - size * 0.045, cx + size * 0.045, cy + size * 0.045],
        fill=WHITE,
    )

    # volume bar (below center)
    bar_w = size * 0.42
    bar_h = size * 0.055
    bar_y = cy + size * 0.42
    _draw_volume_bar(d, cx, bar_y, bar_w, bar_h, accent if not sleep else ACCENT_SLEEP)

    return img


def main():
    sizes = [16, 32, 48, 128]
    for s in sizes:
        img = build_icon(s, sleep=False)
        img.save(OUT / f"icon-{s}.png", "PNG")
        print(f"saved content/icon-{s}.png ({s}x{s})")

    sleep_sizes = [16, 32]
    for s in sleep_sizes:
        img = build_icon(s, sleep=True)
        img.save(OUT / f"icon-sleep-{s}.png", "PNG")
        print(f"saved content/icon-sleep-{s}.png ({s}x{s})")

    print("done")


if __name__ == "__main__":
    main()
