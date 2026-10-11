#!/usr/bin/env python3
"""Cria uma vinheta/intro animada com MoviePy (github.com/Zulko/moviepy).

Fundo em gradiente animado, barra de destaque que cresce, título que sobe
com easing e subtítulo que aparece em seguida. O resultado é um .mp4 que
pode entrar como clipe comum num projeto do render.py.

Uso:
  python scripts/motion_title.py "Título" --subtitle "Episódio 1" \
      [--duration 4] [--size 1920x1080] [--out assets/graphics/intro.mp4]
"""
import argparse
from pathlib import Path

import numpy as np
from moviepy import ColorClip, CompositeVideoClip, TextClip, VideoClip, vfx

from vslib import ASSETS, find_font


def hex_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def ease_out(x: float) -> float:
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def text_clip(font: str, text: str, size: int, color: str) -> tuple[TextClip, int, int]:
    """TextClip com folga inferior (evita cortar descendentes) e limites visíveis do texto."""
    pad = round(size * 0.45)
    clip = TextClip(font=font, text=text, font_size=size, color=color, method="label",
                    margin=(pad // 3, pad // 3, pad // 3, pad))
    rows = np.where(clip.mask.get_frame(0).max(axis=1) > 0.5)[0]
    return clip, int(rows.min()), int(rows.max())


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("title")
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--duration", type=float, default=4.0)
    ap.add_argument("--size", default="1920x1080")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--bg", default="#0B0F14")
    ap.add_argument("--bg2", default="#1C2A3A")
    ap.add_argument("--accent", default="#FFD400")
    ap.add_argument("--out", type=Path, default=ASSETS / "graphics" / "intro.mp4")
    a = ap.parse_args()

    W, H = (int(x) for x in a.size.lower().split("x"))
    s = H / 1080 if W >= H else W / 1080
    D = a.duration
    c0, c1 = hex_rgb(a.bg), hex_rgb(a.bg2)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    diag = (xx / W + yy / H) / 2

    def background(t: float) -> np.ndarray:
        k = 0.5 + 0.5 * np.sin(2 * np.pi * (diag - t / 6))
        frame = c0 + (c1 - c0) * k[..., None]
        return frame.astype(np.uint8)

    bg = VideoClip(background, duration=D)
    font = str(find_font(bold=True))
    title, top, bottom = text_clip(font, a.title, round(130 * s), "white")
    title = title.with_duration(D - 0.3).with_start(0.3)
    ty = H / 2 - (top + bottom) / 2 - 40 * s      # centro visual do texto um pouco acima do meio
    text_bottom = ty + bottom
    title = title.with_position(lambda t: ("center", ty + 120 * s * (1 - ease_out(t / 0.8))))
    title = title.with_effects([vfx.CrossFadeIn(0.5)])

    bar_w = max(title.w * 0.6, 200 * s)
    bar = ColorClip((int(bar_w), max(4, int(10 * s))), color=tuple(int(v) for v in hex_rgb(a.accent)))
    bar = bar.with_duration(D - 0.6).with_start(0.6)
    bar = bar.with_effects([vfx.Resize(lambda t: (max(2, int(bar_w * ease_out(t / 0.6))), max(4, int(10 * s))))])
    bar = bar.with_position(lambda t: ((W - bar_w * ease_out(t / 0.6)) / 2, text_bottom + 28 * s))

    layers = [bg, title, bar]
    if a.subtitle:
        sub, sub_top, _ = text_clip(font, a.subtitle, round(52 * s), a.accent)
        sub = sub.with_duration(D - 1.0).with_start(1.0)
        sub = sub.with_position(("center", text_bottom + 70 * s - sub_top)).with_effects([vfx.CrossFadeIn(0.6)])
        layers.append(sub)

    clip = CompositeVideoClip(layers, size=(W, H)).with_duration(D)
    clip = clip.with_effects([vfx.FadeOut(0.5)])
    a.out.parent.mkdir(parents=True, exist_ok=True)
    clip.write_videofile(str(a.out), fps=a.fps, codec="libx264", audio=False,
                         ffmpeg_params=["-pix_fmt", "yuv420p", "-crf", "18"], logger=None)
    print(f"intro -> {a.out}")


if __name__ == "__main__":
    main()
