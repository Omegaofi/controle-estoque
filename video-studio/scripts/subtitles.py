#!/usr/bin/env python3
"""Gera legendas sincronizadas com faster-whisper (github.com/SYSTRAN/faster-whisper).

Saídas em output/<nome>/:
  captions.json  -> segmentos com tempo de cada palavra (usado pelo render.py)
  <nome>.srt     -> legenda padrão, para YouTube/players/editores

Uso:
  python scripts/subtitles.py output/x/x_cut.mp4 --lang pt
  python scripts/subtitles.py video.mp4 --model models/faster-whisper-small
  python scripts/subtitles.py video.mp4 --from-srt legenda.srt   # importa SRT existente

O modelo é procurado em models/faster-whisper-<tamanho>. Se não existir,
o faster-whisper tenta baixá-lo do Hugging Face (precisa de rede).
"""
import argparse
import re
from pathlib import Path

from ass import group_words
from vslib import MODELS, job_dir, log, write_json


def srt_time(t: float) -> str:
    ms = int(round(max(0.0, t) * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def parse_srt_time(s: str) -> float:
    h, m, rest = s.strip().replace(".", ",").split(":")
    sec, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000


def transcribe(media: Path, model_ref: str, lang: str | None, threads: int) -> dict:
    from faster_whisper import WhisperModel
    local = Path(model_ref)
    if not local.exists() and (MODELS / f"faster-whisper-{model_ref}").exists():
        local = MODELS / f"faster-whisper-{model_ref}"
    ref = str(local) if local.exists() else model_ref
    log(f"carregando modelo {ref} (CPU int8)")
    try:
        model = WhisperModel(ref, device="cpu", compute_type="int8", cpu_threads=threads,
                             download_root=str(MODELS))
    except Exception as exc:  # rede bloqueada, modelo ausente ou corrompido
        raise SystemExit(
            f"não foi possível carregar o modelo Whisper '{model_ref}': {type(exc).__name__}: {exc}\n"
            f"Baixe-o em uma máquina com acesso a huggingface.co (Systran/faster-whisper-{model_ref}) e "
            f"copie a pasta para {MODELS}/faster-whisper-{model_ref}/ — veja docs/README.md.") from None
    segments, info = model.transcribe(str(media), language=lang, word_timestamps=True,
                                      vad_filter=True, vad_parameters={"min_silence_duration_ms": 400},
                                      condition_on_previous_text=False)
    out = {"language": info.language, "language_probability": round(info.language_probability, 3),
           "duration": info.duration, "source": "faster-whisper", "segments": []}
    for seg in segments:
        words = [{"start": round(w.start, 3), "end": round(w.end, 3), "word": w.word.strip()}
                 for w in (seg.words or []) if w.word.strip()]
        out["segments"].append({"start": round(seg.start, 3), "end": round(seg.end, 3),
                                "text": seg.text.strip(), "words": words})
        log(f"{seg.start:7.2f}-{seg.end:7.2f} {seg.text.strip()}")
    return out


def from_srt(path: Path) -> dict:
    """Importa um SRT; o tempo de cada palavra é estimado pelo tamanho dela."""
    blocks = re.split(r"\n\s*\n", path.read_text(encoding="utf-8-sig").strip())
    segs = []
    for b in blocks:
        lines = [x for x in b.strip().splitlines() if x.strip()]
        idx = next((i for i, x in enumerate(lines) if "-->" in x), None)
        if idx is None:
            continue
        a, z = (parse_srt_time(x) for x in lines[idx].split("-->"))
        text = " ".join(lines[idx + 1:]).strip()
        tokens = text.split()
        total = sum(len(t) + 1 for t in tokens) or 1
        words, cur = [], a
        for t in tokens:
            d = (z - a) * (len(t) + 1) / total
            words.append({"start": round(cur, 3), "end": round(cur + d, 3), "word": t})
            cur += d
        segs.append({"start": a, "end": z, "text": text, "words": words})
    return {"language": None, "source": f"srt:{path.name}", "segments": segs}


def write_srt(captions: dict, dst: Path, max_chars: int) -> None:
    words = [w for s in captions["segments"] for w in s["words"]]
    lines = group_words(words, max_chars=max_chars) if words else \
        [[{"start": s["start"], "end": s["end"], "word": s["text"]}] for s in captions["segments"]]
    out = []
    for i, line in enumerate(lines, 1):
        out.append(f"{i}\n{srt_time(line[0]['start'])} --> {srt_time(line[-1]['end'])}\n"
                   f"{' '.join(w['word'] for w in line)}\n")
    dst.write_text("\n".join(out), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("media", type=Path)
    ap.add_argument("--model", default="small", help="tiny|base|small|medium|large-v3 ou caminho local")
    ap.add_argument("--lang", default="pt", help="idioma falado (pt, en, es...); 'auto' detecta")
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--from-srt", type=Path, help="usa um SRT existente em vez de transcrever")
    ap.add_argument("--max-chars", type=int, default=32, help="caracteres por linha de legenda")
    ap.add_argument("--out", type=Path, help="pasta de saída (padrão: output/<nome>/)")
    args = ap.parse_args()

    out = args.out or job_dir(args.media)
    out.mkdir(parents=True, exist_ok=True)
    if args.from_srt:
        captions = from_srt(args.from_srt)
    else:
        captions = transcribe(args.media, args.model, None if args.lang == "auto" else args.lang, args.threads)
    write_json(out / "captions.json", captions)
    write_srt(captions, out / f"{args.media.stem}.srt", args.max_chars)
    print(f"{len(captions['segments'])} segmentos -> {out / 'captions.json'} e {out / (args.media.stem + '.srt')}")


if __name__ == "__main__":
    main()
