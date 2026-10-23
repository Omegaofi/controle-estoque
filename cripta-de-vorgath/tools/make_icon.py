"""Draws the launcher icon (a pixel-art lich skull on carved stone) into app/res/mipmap-*/ic_launcher.png."""
import os, sys
from PIL import Image, ImageDraw

ART = [
    "................",
    ".....######.....",
    "....#GGGGGG#....",
    "...#GGGGGGGG#...",
    "..#BBBBBBBBBB#..",
    "..#BBBBBBBBBB#..",
    "..#BEEBBBBEEB#..",
    "..#BEOBBBBOEB#..",
    "..#BEEBBBBEEB#..",
    "..#BBBBEEBBBB#..",
    "...#BBBBBBBB#...",
    "....#BTBTBTB#...",
    "....#BBBBBBB#...",
    ".....#######....",
    "................",
    "................",
]
COL = {"#": (18, 10, 24), "G": (224, 173, 69), "B": (217, 206, 176),
       "E": (12, 8, 6), "O": (127, 255, 192), "T": (60, 48, 40)}

def icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = size // 6
    d.rounded_rectangle([0, 0, size - 1, size - 1], r, fill=(40, 31, 26))
    m = max(1, size // 24)
    d.rounded_rectangle([m, m, size - 1 - m, size - 1 - m], r, fill=(27, 22, 19), outline=(90, 70, 50), width=m)
    px = size * 0.8 / 16
    ox = oy = size * 0.1
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([size * .18, size * .18, size * .82, size * .82], fill=(120, 255, 160, 38))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)
    for y, row in enumerate(ART):
        for x, c in enumerate(row):
            if c in COL:
                d.rectangle([ox + x * px, oy + (y + 1) * px, ox + (x + 1) * px - 1, oy + (y + 2) * px - 1], fill=COL[c])
    return img

res = sys.argv[1]
for name, size in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    os.makedirs(f"{res}/mipmap-{name}", exist_ok=True)
    icon(size).save(f"{res}/mipmap-{name}/ic_launcher.png")
icon(512).save(f"{res}/../../icon.png")
