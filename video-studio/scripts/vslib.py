"""Funções compartilhadas pelos scripts do video-studio.

Todos os scripts usam FFmpeg/FFprobe do sistema e as ferramentas Python
instaladas em video-studio/.venv.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

STUDIO = Path(__file__).resolve().parent.parent
INPUT = STUDIO / "input"
OUTPUT = STUDIO / "output"
ASSETS = STUDIO / "assets"
MODELS = STUDIO / "models"
VENV_BIN = STUDIO / ".venv" / "bin"

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".mts"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus"}


def log(msg: str) -> None:
    print(f"[studio] {msg}", file=sys.stderr, flush=True)


def run(cmd: list[str], cwd: Path | None = None, quiet: bool = True) -> subprocess.CompletedProcess:
    """Executa um comando e aborta com a saída de erro se falhar."""
    log(" ".join(str(c) for c in cmd[:6]) + (" ..." if len(cmd) > 6 else ""))
    proc = subprocess.run([str(c) for c in cmd], cwd=cwd, text=True,
                          capture_output=quiet)
    if proc.returncode != 0:
        if quiet:
            sys.stderr.write(proc.stderr[-4000:])
        raise SystemExit(f"comando falhou ({proc.returncode}): {cmd[0]}")
    return proc


def tool(name: str) -> str:
    """Resolve um executável, preferindo o do .venv do estúdio."""
    local = VENV_BIN / name
    if local.exists():
        return str(local)
    found = shutil.which(name)
    if not found:
        raise SystemExit(f"ferramenta não encontrada: {name}")
    return found


def probe(path: Path) -> dict:
    proc = run(["ffprobe", "-v", "error", "-print_format", "json",
                "-show_format", "-show_streams", path])
    return json.loads(proc.stdout)


def summarize(path: Path) -> dict:
    """Resumo prático dos metadados de um arquivo de mídia."""
    data = probe(path)
    fmt = data.get("format", {})
    out = {
        "file": str(path),
        "duration": float(fmt.get("duration", 0) or 0),
        "size_mb": round(int(fmt.get("size", 0) or 0) / 1e6, 2),
        "bit_rate": int(fmt.get("bit_rate", 0) or 0),
        "container": fmt.get("format_name"),
        "video": None,
        "audio": None,
    }
    for s in data.get("streams", []):
        if s["codec_type"] == "video" and out["video"] is None and \
                s.get("disposition", {}).get("attached_pic", 0) == 0:
            num, den = (s.get("avg_frame_rate") or s.get("r_frame_rate") or "0/1").split("/")
            fps = float(num) / float(den) if float(den) else 0.0
            rotation = 0
            for sd in s.get("side_data_list", []) or []:
                if "rotation" in sd:
                    rotation = int(sd["rotation"])
            w, h = s.get("width"), s.get("height")
            if abs(rotation) in (90, 270):
                w, h = h, w
            sar = s.get("sample_aspect_ratio", "1:1")
            out["video"] = {
                "codec": s.get("codec_name"), "width": w, "height": h,
                "fps": round(fps, 3), "pix_fmt": s.get("pix_fmt"),
                "rotation": rotation, "sar": sar,
                "orientation": "vertical" if h and w and h > w else "horizontal",
            }
        elif s["codec_type"] == "audio" and out["audio"] is None:
            out["audio"] = {
                "codec": s.get("codec_name"),
                "sample_rate": int(s.get("sample_rate", 0) or 0),
                "channels": s.get("channels"),
            }
    return out


def job_dir(src: Path) -> Path:
    """Pasta de trabalho em output/<nome-do-arquivo>/."""
    d = OUTPUT / src.stem
    (d / "work").mkdir(parents=True, exist_ok=True)
    return d


def list_inputs(folder: Path = INPUT) -> list[Path]:
    return sorted(p for p in folder.iterdir()
                  if p.suffix.lower() in VIDEO_EXTS and not p.name.startswith("."))


def find_font(bold: bool = True) -> Path:
    """Usa uma fonte de assets/fonts; senão, pede ao fontconfig."""
    fonts = sorted((ASSETS / "fonts").glob("*.[ot]tf"))
    if fonts:
        pref = [f for f in fonts if ("bold" in f.name.lower()) == bold]
        return (pref or fonts)[0]
    pattern = "Inter:bold" if bold else "Inter"
    proc = subprocess.run(["fc-match", "-f", "%{file}", pattern], text=True,
                          capture_output=True)
    if proc.returncode == 0 and proc.stdout:
        return Path(proc.stdout.strip())
    raise SystemExit("nenhuma fonte encontrada; coloque um .ttf/.otf em assets/fonts/")


def font_family(path: Path) -> str:
    proc = subprocess.run(["fc-query", "-f", "%{family[0]}", str(path)], text=True,
                          capture_output=True)
    return proc.stdout.strip() or "Sans"


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
