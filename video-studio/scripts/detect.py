#!/usr/bin/env python3
"""Detecta cenas (PySceneDetect) e silêncios (FFmpeg silencedetect).

Gera em output/<nome>/:
  analysis.json  -> cenas, silêncios e trechos com fala
  scenes/        -> uma miniatura por cena (com --thumbs)

Uso:
  python scripts/detect.py input/video.mp4 [--scene-threshold 27] \
      [--noise -35dB] [--min-silence 0.5] [--thumbs]
"""
import argparse
import re
from pathlib import Path

from vslib import job_dir, list_inputs, log, run, summarize, write_json


def detect_scenes(path: Path, threshold: float, adaptive: bool) -> list[dict]:
    from scenedetect import AdaptiveDetector, ContentDetector, detect
    detector = AdaptiveDetector() if adaptive else ContentDetector(threshold=threshold)
    scenes = detect(str(path), detector)
    return [{"index": i, "start": round(s.get_seconds(), 3), "end": round(e.get_seconds(), 3)}
            for i, (s, e) in enumerate(scenes)]


def detect_silences(path: Path, noise: str, min_silence: float, duration: float) -> list[dict]:
    proc = run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vn",
                "-af", f"silencedetect=noise={noise}:d={min_silence}", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", proc.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", proc.stderr)]
    if len(ends) < len(starts):          # silêncio até o fim do arquivo
        ends.append(duration)
    return [{"start": round(max(0.0, s), 3), "end": round(e, 3), "duration": round(e - max(0.0, s), 3)}
            for s, e in zip(starts, ends)]


def speech_ranges(silences: list[dict], duration: float) -> list[dict]:
    out, cur = [], 0.0
    for s in silences:
        if s["start"] > cur:
            out.append({"start": round(cur, 3), "end": s["start"]})
        cur = s["end"]
    if cur < duration:
        out.append({"start": round(cur, 3), "end": round(duration, 3)})
    return out


def thumbnails(path: Path, scenes: list[dict], folder: Path) -> None:
    folder.mkdir(exist_ok=True)
    for sc in scenes:
        t = sc["start"] + min(0.5, (sc["end"] - sc["start"]) / 2)
        run(["ffmpeg", "-y", "-hide_banner", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1",
             "-vf", "scale=480:-2", folder / f"scene_{sc['index']:03d}.jpg"])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", type=Path)
    ap.add_argument("--scene-threshold", type=float, default=27.0,
                    help="sensibilidade do ContentDetector (menor = mais cortes)")
    ap.add_argument("--adaptive", action="store_true", help="usa AdaptiveDetector (bom para câmera em movimento)")
    ap.add_argument("--noise", default="-35dB", help="nível considerado silêncio")
    ap.add_argument("--min-silence", type=float, default=0.5, help="duração mínima do silêncio (s)")
    ap.add_argument("--thumbs", action="store_true", help="salva uma miniatura por cena")
    args = ap.parse_args()

    for f in args.files or list_inputs():
        info = summarize(f)
        out = job_dir(f)
        log(f"cenas: {f.name}")
        scenes = detect_scenes(f, args.scene_threshold, args.adaptive) if info["video"] else []
        if not scenes and info["video"]:
            scenes = [{"index": 0, "start": 0.0, "end": round(info["duration"], 3)}]
        silences = []
        if info["audio"]:
            log(f"silêncios: {f.name}")
            silences = detect_silences(f, args.noise, args.min_silence, info["duration"])
        total_sil = sum(s["duration"] for s in silences)
        result = {
            "file": str(f), "duration": info["duration"],
            "params": vars(args) | {"files": None},
            "scenes": scenes, "silences": silences,
            "speech": speech_ranges(silences, info["duration"]) if info["audio"] else [],
            "silence_total": round(total_sil, 3),
        }
        write_json(out / "analysis.json", result)
        if args.thumbs:
            thumbnails(f, scenes, out / "scenes")
        print(f"{f.name}: {len(scenes)} cena(s), {len(silences)} silêncio(s) "
              f"somando {total_sil:.1f}s de {info['duration']:.1f}s -> {out / 'analysis.json'}")


if __name__ == "__main__":
    main()
