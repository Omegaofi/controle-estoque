#!/usr/bin/env python3
"""Remove silêncios e pausas com o auto-editor (github.com/WyattBlue/auto-editor).

Gera output/<nome>/<nome>_cut.mp4 e, opcionalmente, um projeto para
editores (Resolve, Premiere, Final Cut, Kdenlive, ShotCut) para ajuste fino.

Uso:
  python scripts/cut_silences.py input/video.mp4 [--threshold 4%] [--margin 0.2s]
      [--speed 0]          # 0 = cortar; >1 = acelerar silêncios (ex.: 8)
      [--export resolve]   # também exporta a timeline
      [--preview]          # só mostra as estatísticas
"""
import argparse
from pathlib import Path

from vslib import job_dir, list_inputs, run, tool


def cut(src: Path, threshold: str, margin: str, speed: float, export: str | None,
        preview: bool = False) -> Path:
    out = job_dir(src)
    edit = f"audio:threshold={threshold}"
    action = "cut" if speed <= 0 else f"speed:{speed}"
    base = [tool("auto-editor"), src, "--edit", edit, "--margin", margin,
            "--when-silent", action, "--no-open", "--progress", "none"]
    if preview:
        print(run(base + ["--preview"]).stdout)
        return src
    dst = out / f"{src.stem}_cut.mp4"
    # bitrate alto: este arquivo é intermediário e ainda será recodificado no render
    run(base + ["-o", dst, "-b:v", "12M", "-b:a", "256k"])
    if export:
        run(base + ["--export", export, "-o", out / f"{src.stem}_timeline"])
    return dst


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", type=Path)
    ap.add_argument("--threshold", default="4%", help="volume abaixo do qual é silêncio (ex.: 4%%, -30dB)")
    ap.add_argument("--margin", default="0.2s", help="folga mantida ao redor da fala")
    ap.add_argument("--speed", type=float, default=0, help="0 corta; >1 acelera os silêncios")
    ap.add_argument("--export", help="premiere | resolve | final-cut-pro | kdenlive | shotcut | v3")
    ap.add_argument("--preview", action="store_true")
    args = ap.parse_args()
    for f in args.files or list_inputs():
        dst = cut(f, args.threshold, args.margin, args.speed, args.export, args.preview)
        if not args.preview:
            print(f"{f.name} -> {dst}")


if __name__ == "__main__":
    main()
