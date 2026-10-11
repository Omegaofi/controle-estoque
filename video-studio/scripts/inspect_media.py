#!/usr/bin/env python3
"""Inspeciona vídeos e salva os metadados em output/<nome>/metadata.json.

Uso:
  python scripts/inspect_media.py input/video.mp4 [outro.mov ...]
  python scripts/inspect_media.py            # todos os vídeos de input/
"""
import argparse
from pathlib import Path

from vslib import job_dir, list_inputs, summarize, write_json


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", type=Path)
    args = ap.parse_args()
    for f in args.files or list_inputs():
        info = summarize(f)
        write_json(job_dir(f) / "metadata.json", info)
        v, a = info["video"] or {}, info["audio"] or {}
        vtxt = (f"vídeo {v.get('codec')} {v.get('width')}x{v.get('height')} @ {v.get('fps')} fps "
                f"({v.get('orientation')}, rot {v.get('rotation')})") if v else "sem vídeo"
        atxt = (f"áudio {a.get('codec')} {a.get('sample_rate')} Hz {a.get('channels')}ch") if a else "sem áudio"
        print(f"{f.name}: {info['duration']:.2f}s, {info['size_mb']} MB, {vtxt}, {atxt}")


if __name__ == "__main__":
    main()
