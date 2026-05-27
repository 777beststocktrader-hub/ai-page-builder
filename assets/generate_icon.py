"""Generate PageGenie app icon - 1024x1024 for Shopify App Store"""
from PIL import Image, ImageDraw, ImageFilter
import math

SIZE = 1024
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# ── Background: deep purple → navy gradient ──────────────────────────────────
bg = Image.new("RGB", (SIZE, SIZE))
bg_draw = ImageDraw.Draw(bg)
for y in range(SIZE):
    t = y / SIZE
    r = int(30 + t * (15 - 30))   # 30→15
    g = int(10 + t * (20 - 10))   # 10→20
    b = int(60 + t * (80 - 60))   # 60→80
    bg_draw.line([(0, y), (SIZE, y)], fill=(r, g, b))

# Rounded corners mask
mask = Image.new("L", (SIZE, SIZE), 0)
mask_draw = ImageDraw.Draw(mask)
radius = 180
mask_draw.rounded_rectangle([0, 0, SIZE, SIZE], radius=radius, fill=255)
bg.putalpha(mask)
img.paste(bg, (0, 0), mask)
draw = ImageDraw.Draw(img)

# ── Genie lamp body ──────────────────────────────────────────────────────────
cx, cy = SIZE // 2, SIZE // 2 + 60

# Shadow glow behind lamp
glow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_layer)
gd.ellipse([cx - 280, cy - 120, cx + 280, cy + 220], fill=(255, 180, 40, 40))
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(50))
img = Image.alpha_composite(img, glow_layer)
draw = ImageDraw.Draw(img)

# Lamp body (main ellipse - gold)
lamp_color = (255, 200, 60)
lamp_dark  = (200, 130, 20)
lamp_light = (255, 235, 120)

# Body ellipse
draw.ellipse([cx - 200, cy - 80, cx + 200, cy + 160], fill=lamp_dark)
draw.ellipse([cx - 190, cy - 72, cx + 190, cy + 152], fill=lamp_color)
draw.ellipse([cx - 160, cy - 55, cx + 100, cy + 60],  fill=lamp_light)   # highlight

# Spout (left side) - curved tube
# Draw as a series of circles for a rounded tube effect
for i in range(40):
    t = i / 39
    sx = int(cx - 200 + t * (-120))
    sy = int(cy + 20 - t * 60)
    r  = int(28 - t * 8)
    col_r = int(lamp_color[0] * (1 - t) + lamp_dark[0] * t)
    col_g = int(lamp_color[1] * (1 - t) + lamp_dark[1] * t)
    col_b = int(lamp_color[2] * (1 - t) + lamp_dark[2] * t)
    draw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(col_r, col_g, col_b))

# Spout tip cap
draw.ellipse([cx - 335, cy - 50, cx - 290, cy - 5], fill=lamp_color)

# Handle (right side arc)
for i in range(35):
    t = i / 34
    angle = math.radians(-30 + t * 180)
    hx = int(cx + 200 + 50 * math.cos(angle))
    hy = int(cy + 40 + 70 * math.sin(angle))
    draw.ellipse([hx - 20, hy - 20, hx + 20, hy + 20], fill=lamp_dark)

for i in range(35):
    t = i / 34
    angle = math.radians(-30 + t * 180)
    hx = int(cx + 200 + 38 * math.cos(angle))
    hy = int(cy + 40 + 55 * math.sin(angle))
    draw.ellipse([hx - 12, hy - 12, hx + 12, hy + 12], fill=lamp_color)

# Base/feet
draw.ellipse([cx - 160, cy + 130, cx + 160, cy + 200], fill=lamp_dark)
draw.ellipse([cx - 145, cy + 135, cx + 145, cy + 190], fill=lamp_color)

# ── Magic smoke / sparkle from spout ────────────────────────────────────────
smoke_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
sd = ImageDraw.Draw(smoke_layer)

# Smoke wisps upward from spout tip area
spout_x, spout_y = cx - 315, cy - 28
colors = [
    (180, 100, 255, 140),   # purple
    (100, 180, 255, 120),   # blue
    (255, 220, 80,  100),   # gold
    (220, 130, 255, 90),    # lavender
]
for i, (r_, g_, b_, a_) in enumerate(colors):
    off = (i - 1.5) * 18
    for j in range(8):
        t  = j / 7
        wx = int(spout_x + off + math.sin(t * 3.14 + i) * 20)
        wy = int(spout_y - 60 - t * 260)
        wr = int(18 + t * 28)
        sd.ellipse([wx - wr, wy - wr, wx + wr, wy + wr], fill=(r_, g_, b_, int(a_ * (1 - t * 0.7))))

smoke_layer = smoke_layer.filter(ImageFilter.GaussianBlur(12))
img = Image.alpha_composite(img, smoke_layer)
draw = ImageDraw.Draw(img)

# ── Stars / sparkles ─────────────────────────────────────────────────────────
import random
random.seed(42)

def draw_star(d, x, y, size, color):
    """Draw a 4-point star sparkle"""
    pts = []
    for i in range(8):
        angle = math.radians(i * 45)
        r = size if i % 2 == 0 else size * 0.35
        pts.append((x + r * math.cos(angle), y + r * math.sin(angle)))
    d.polygon(pts, fill=color)

sparkle_positions = [
    (cx - 280, cy - 200, 22, (255, 255, 200, 255)),
    (cx - 240, cy - 300, 14, (200, 160, 255, 255)),
    (cx + 180, cy - 250, 18, (255, 255, 180, 255)),
    (cx + 300, cy - 150, 12, (180, 220, 255, 255)),
    (cx - 60,  cy - 350, 16, (255, 230, 100, 255)),
    (cx + 80,  cy - 380, 10, (200, 180, 255, 255)),
    (cx - 350, cy - 100, 11, (255, 240, 140, 255)),
    (cx + 250, cy - 50,  8,  (220, 200, 255, 255)),
    (cx - 170, cy - 420, 9,  (255, 255, 200, 255)),
]

for (sx, sy, ss, sc) in sparkle_positions:
    draw_star(draw, sx, sy, ss, sc)
    # tiny glow behind star
    draw.ellipse([sx - ss, sy - ss, sx + ss, sy + ss], fill=(*sc[:3], 30))

# ── "AI" shimmer dots along smoke trail ──────────────────────────────────────
for i in range(6):
    dx = int(spout_x - 20 + random.randint(-25, 25))
    dy = int(spout_y - 80 - i * 45)
    dot_r = random.randint(4, 9)
    alpha = 200 - i * 20
    dot_col = [(255, 210, 80, alpha), (160, 100, 255, alpha), (100, 200, 255, alpha)][i % 3]
    draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r], fill=dot_col)

# ── Save ──────────────────────────────────────────────────────────────────────
out_path = r"C:\Users\ja148\ai-page-builder\assets\pagegenie-icon-1024.png"
# Convert to RGB with white bg for final save (some apps need no alpha)
final = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
final.paste(img, (0, 0), img)
final.save(out_path, "PNG")
print(f"Saved: {out_path}")
