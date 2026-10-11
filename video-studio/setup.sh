#!/usr/bin/env bash
# Instala o video-studio em um ambiente isolado (.venv), sem tocar no Python do sistema.
# Uso: ./setup.sh [--with-repos] [--model small]
set -euo pipefail
cd "$(dirname "$0")"

need() { command -v "$1" >/dev/null || { echo "faltando: $1 ($2)"; exit 1; }; }
need ffmpeg  "sudo apt install ffmpeg"
need ffprobe "sudo apt install ffmpeg"
need python3 "Python >= 3.10"

for f in drawtext subtitles xfade loudnorm sidechaincompress silencedetect; do
  ffmpeg -hide_banner -filters 2>/dev/null | grep -q " $f " || echo "AVISO: FFmpeg sem o filtro $f"
done

mkdir -p input output projects models docs assets/{music,fonts,graphics} tools/repos

if command -v uv >/dev/null; then
  uv venv .venv --python 3.12
  uv pip install --python .venv/bin/python -r requirements.lock.txt
else
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.lock.txt
fi

# Opcional: código-fonte das ferramentas (referência/documentação; ~380 MB)
if [[ "${1:-}" == "--with-repos" ]]; then
  for r in WyattBlue/auto-editor Breakthrough/PySceneDetect SYSTRAN/faster-whisper Zulko/moviepy; do
    d="tools/repos/$(basename "$r")"
    [[ -d "$d/.git" ]] || git clone --depth 1 "https://github.com/$r" "$d"
  done
  shift
fi

# Opcional: modelo Whisper (precisa de acesso a huggingface.co)
if [[ "${1:-}" == "--model" ]]; then
  .venv/bin/python -c "from huggingface_hub import snapshot_download as d; d('Systran/faster-whisper-$2', local_dir='models/faster-whisper-$2')"
fi

.venv/bin/auto-editor --version >/dev/null   # baixa o binário oficial do auto-editor na 1ª execução
echo "pronto. Teste: ./studio.sh pipeline --preview"
