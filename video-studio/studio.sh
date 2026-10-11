#!/usr/bin/env bash
# Atalho: ./studio.sh <script> [args]   ex.: ./studio.sh pipeline --title "Aula 1"
# Scripts: inspect_media detect cut_silences subtitles motion_title render pipeline make_test_assets
set -euo pipefail
cd "$(dirname "$0")"
s="${1:?uso: ./studio.sh <script> [args]}"; shift
exec .venv/bin/python "scripts/${s%.py}.py" "$@"
