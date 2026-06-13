"""
Generate app icon and splash assets for American Rotation Scorer.

Design: the American Rotation rack — uniquely identifiable to this game.
The rack pattern:
    row 1 (front, apex):    15
    row 2:                  2,  3
    row 3 (middle):         _, 1, _
    row 4:              7, 13, 14, 11
    row 5 (back):    [random balls — we draw a generic stripe ball ×5]

We render the first four rows (the key positional balls — 15, 2, 3, 1,
13, 14) prominently and a partial back row for context. The full rack is
arranged inside a subtle dark triangle suggestion so it reads as "racked
balls" instantly.

Outputs (written into assets/):
  - icon.png            (1024×1024, full bleed, warm yellow bg)
  - adaptive-icon.png   (1024×1024, transparent bg, rack centered in
                         Android safe zone)
  - splash.png          (2048×2048, transparent bg, smaller rack —
                         Expo composites onto bgBottom at runtime)
  - favicon.png         (48×48, downscale of icon.png)

Re-run any time: `python3 scripts/build_icons.py`
"""

from __future__ import annotations

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ---------- Paths ----------
ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)


# ---------- Standard billiard ball colors (BCA / WPA) ----------
BALL_COLORS: dict[int, tuple[int, int, int]] = {
    1: (253, 199, 0),     # yellow
    2: (10, 64, 142),     # blue
    3: (200, 35, 35),     # red
    4: (95, 35, 130),     # purple
    5: (235, 110, 35),    # orange
    6: (30, 110, 60),     # green
    7: (130, 35, 35),     # maroon / burgundy
    8: (20, 20, 20),      # black
    9: (253, 199, 0),     # striped yellow
    10: (10, 64, 142),    # striped blue
    11: (200, 35, 35),    # striped red
    12: (95, 35, 130),    # striped purple
    13: (235, 110, 35),   # striped orange
    14: (30, 110, 60),    # striped green
    15: (130, 35, 35),    # striped maroon
}
STRIPED = {9, 10, 11, 12, 13, 14, 15}

WHITE = (255, 255, 255)
NEAR_BLACK = (20, 20, 20)
ICON_BG_TOP = (15, 96, 130)        # warm teal — same family as app bgTop
ICON_BG_BOT = (8, 56, 82)          # deeper teal — same family as bgBottom


def _font(size: int) -> ImageFont.FreeTypeFont:
    """Find a heavy bold sans-serif font for the ball numbers."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def _vertical_gradient(size: tuple[int, int], top: tuple, bot: tuple) -> Image.Image:
    """Return an RGB image filled with a vertical gradient from top to bot."""
    w, h = size
    grad = Image.new("RGB", (w, h), (0, 0, 0))
    px = grad.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] + (bot[0] - top[0]) * t)
        g = int(top[1] + (bot[1] - top[1]) * t)
        b = int(top[2] + (bot[2] - top[2]) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return grad


def _render_ball(number: int, r: int) -> Image.Image:
    """
    Return an RGBA image of size (2r, 2r) containing a billiard ball.

    Solid balls (1-8): full color body + white center circle with the number.
    Striped balls (9-15): white body + colored horizontal band, with a
    white center circle on top containing the number.
    """
    size = 2 * r
    color = BALL_COLORS[number]

    # ---- Body ----
    if number in STRIPED:
        # White body with a colored horizontal band across the middle.
        # Band is narrower than the ball so white shows top and bottom.
        body_img = Image.new("RGB", (size, size), WHITE)
        band_h = int(r * 1.05)
        band_top = r - band_h // 2
        band_bot = r + band_h // 2
        ImageDraw.Draw(body_img).rectangle(
            (0, band_top, size, band_bot), fill=color
        )
    else:
        # Solid color body.
        body_img = Image.new("RGB", (size, size), color)

    body = body_img.convert("RGBA")

    # ---- White center circle (both solids and stripes) ----
    circle_r = int(r * 0.46)
    circ = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(circ).ellipse(
        (r - circle_r, r - circle_r, r + circle_r, r + circle_r),
        fill=(255, 255, 255, 255),
    )
    body = Image.alpha_composite(body, circ)

    # ---- Number, centered in the white circle ----
    font_size = int(r * 0.65)
    font = _font(font_size)
    draw = ImageDraw.Draw(body)
    text = str(number)
    tb = draw.textbbox((0, 0), text, font=font)
    tw = tb[2] - tb[0]
    th = tb[3] - tb[1]
    tx = r - tw // 2 - tb[0]
    ty = r - th // 2 - tb[1]
    draw.text((tx, ty), text, fill=NEAR_BLACK, font=font)

    # ---- Subtle top-left highlight for spherical feel ----
    # Drawn BEFORE the white center circle and number, so it sits on the
    # colored body and doesn't wash out the number on the white disc.
    # (Re-order: actually we want highlight on top of body but underneath
    # the center disc. Implementation: render highlight onto the body
    # BEFORE adding the white center circle.)
    # NOTE: we already added the white circle + number above. Instead,
    # we add a small highlight that's positioned so it doesn't overlap
    # the center disc much.
    hl_r = int(r * 0.22)
    hl_cx = r - int(r * 0.50)
    hl_cy = r - int(r * 0.50)
    hl = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse(
        (hl_cx - hl_r, hl_cy - hl_r, hl_cx + hl_r, hl_cy + hl_r),
        fill=(255, 255, 255, 75),
    )
    hl = hl.filter(ImageFilter.GaussianBlur(radius=max(1, r * 0.05)))
    body = Image.alpha_composite(body, hl)

    # ---- Circular alpha mask + thin dark outline for definition ----
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(body, (0, 0), mask)

    # Thin dark ring around the ball to separate it from neighbors.
    ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse(
        (1, 1, size - 1, size - 1),
        outline=(0, 0, 0, 90),
        width=max(1, r // 30),
    )
    out = Image.alpha_composite(out, ring)
    return out


def _paste_ball(canvas: Image.Image, ball_img: Image.Image, cx: int, cy: int) -> None:
    """Paste a pre-rendered ball image centered at (cx, cy) on canvas."""
    w, h = ball_img.size
    canvas.alpha_composite(ball_img, dest=(cx - w // 2, cy - h // 2))


def _draw_rack(canvas: Image.Image, cx: int, cy: int, ball_r: int) -> None:
    """
    Draw the American Rotation rack centered at (cx, cy) with each ball
    of radius ball_r.

    Positions (American Rotation rack):
      row 1 (apex):           15
      row 2:                  2     3
      row 3 (middle, key):    _    1    _    -- the 1 sits at the rack's center
      row 4:                 13              14
      row 5 (back, partial):  random — we show three generic-looking balls

    Rendered as a slightly tilted forward-facing rack so the back rows
    sit higher in the frame (apex at the bottom). For an icon we use
    apex-DOWN (15 at the bottom front), which is the visual you'd see
    looking at a racked table from the breaking end.
    """
    # Geometry: equilateral-triangle packing. Row spacing is r*sqrt(3).
    # Horizontal spacing within a row is 2r (diameter).
    import math
    dy = int(ball_r * math.sqrt(3))   # vertical distance between rows
    dx = 2 * ball_r                   # horizontal distance between ball centers

    # Rack center math: 5 rows, so the geometric center is between row 2 and row 3.
    # We'll position so the visible mass of balls is centered on (cx, cy).
    # Row offsets from cy: rows -2, -1, 0, +1, +2 multiplied by dy/2-ish.
    # We use rows numbered 0..4 from apex (top), then shift to center.
    # Top of the rack should be at cy - 2*dy, bottom at cy + 2*dy.

    # Apex at TOP (looking down the rack from the back) — this matches the
    # written rack diagram convention: 15 at front (top of the visual),
    # back row at the bottom. The breaker's POV.
    # The vertical span of the rack is 4*dy. To center the rack on cy, offset
    # row positions so the midpoint of (apex, last row) sits on cy.
    total_h = 4 * dy
    top_y = cy - total_h // 2
    row_y = [top_y + i * dy for i in range(5)]

    # ---- Row 0 (apex): the 15 alone ----
    _paste_ball(canvas, _render_ball(15, ball_r), cx, row_y[0])

    # ---- Row 1: the 2 and the 3 (2 balls, flanking center) ----
    _paste_ball(canvas, _render_ball(2, ball_r), cx - ball_r, row_y[1])
    _paste_ball(canvas, _render_ball(3, ball_r), cx + ball_r, row_y[1])

    # ---- Row 2 (middle, 3 balls): 1-ball in the center per AR rules ----
    _paste_ball(canvas, _render_ball(6, ball_r), cx - dx, row_y[2])
    _paste_ball(canvas, _render_ball(1, ball_r), cx,      row_y[2])
    _paste_ball(canvas, _render_ball(4, ball_r), cx + dx, row_y[2])

    # ---- Row 3 (4 balls): 7 outer-left, 13/14 inner, 11 outer-right ----
    # Positions relative to cx: -1.5*dx, -0.5*dx, +0.5*dx, +1.5*dx
    row3_balls = [7, 13, 14, 11]
    for i, num in enumerate(row3_balls):
        x = int(cx + (i - 1.5) * dx)
        _paste_ball(canvas, _render_ball(num, ball_r), x, row_y[3])

    # ---- Row 4 (back, 5 balls, random fill) ----
    # Avoid duplicates with balls already shown above
    # (used so far: 15, 2, 3, 6, 1, 4, 13, 7, 11, 14)
    row4_balls = [12, 10, 9, 5, 8]
    for i, num in enumerate(row4_balls):
        x = int(cx + (i - 2) * dx)
        _paste_ball(canvas, _render_ball(num, ball_r), x, row_y[4])


def build_icon() -> Path:
    """iOS-style full-bleed icon. Teal background, AR rack centered."""
    size = 1024
    img = _vertical_gradient((size, size), ICON_BG_TOP, ICON_BG_BOT).convert("RGBA")

    cx = size // 2
    cy = size // 2
    # Ball radius sized so the 5-ball-wide back row fills about 90% of
    # the canvas width. 10r ≈ 0.88 * size  →  r ≈ size * 0.088.
    ball_r = int(size * 0.090)
    _draw_rack(img, cx, cy, ball_r)

    out = ASSETS / "icon.png"
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


def build_adaptive_icon() -> Path:
    """Android adaptive icon — transparent bg, rack in 66% safe zone."""
    size = 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx = size // 2
    cy = size // 2
    # Smaller ball radius to stay well within the 66% safe zone.
    ball_r = int(size * 0.075)
    _draw_rack(img, cx, cy, ball_r)
    out = ASSETS / "adaptive-icon.png"
    img.save(out, "PNG", optimize=True)
    return out


def build_splash() -> Path:
    """Splash — transparent bg, rack centered. Smaller than the icon."""
    size = 2048
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx = size // 2
    cy = size // 2
    ball_r = int(size * 0.060)
    _draw_rack(img, cx, cy, ball_r)
    out = ASSETS / "splash.png"
    img.save(out, "PNG", optimize=True)
    return out


def build_favicon(icon_path: Path) -> Path:
    """Small web favicon — downscale of the master icon."""
    img = Image.open(icon_path).convert("RGBA")
    img.thumbnail((48, 48), Image.LANCZOS)
    out = ASSETS / "favicon.png"
    img.save(out, "PNG", optimize=True)
    return out


def main() -> None:
    icon = build_icon()
    adaptive = build_adaptive_icon()
    splash = build_splash()
    favicon = build_favicon(icon)
    for p in (icon, adaptive, splash, favicon):
        print(f"Wrote {p.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
