#!/usr/bin/env python3
"""Fluxo automático: input/ -> análise -> cortes -> legendas -> projeto -> render 1080p.

Para cada vídeo em input/ (ou os arquivos indicados):
  1. inspeciona metadados;
  2. detecta cenas (PySceneDetect) e silêncios (FFmpeg);
  3. escolhe o modo:
       talk    -> vídeo falado: remove silêncios com auto-editor e legenda;
       montage -> b-roll sem fala: monta os melhores trechos de cada cena
                  com transições;
  4. gera legendas com faster-whisper se o modelo estiver em models/;
  5. escreve projects/auto_<nome>.json (editável) e renderiza em output/.

Uso:
  python scripts/pipeline.py                        # tudo de input/
  python scripts/pipeline.py input/aula.mp4 --title "Aula 1" --subtitle "Introdução"
  python scripts/pipeline.py --combine --title "Resumo da semana"   # um vídeo só
  python scripts/pipeline.py --vertical             # 1080x1920 (Reels/Shorts/TikTok)
  python scripts/pipeline.py --preview              # render rápido em 540p
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cut_silences
import detect
from render import Renderer
from vslib import ASSETS, AUDIO_EXTS, MODELS, STUDIO, job_dir, list_inputs, log, summarize, write_json


def rel(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(STUDIO))
    except ValueError:
        return str(p.resolve())


def pick_music(arg: str | None) -> Path | None:
    if arg == "none":
        return None
    if arg:
        return Path(arg)
    tracks = sorted(p for p in (ASSETS / "music").glob("*") if p.suffix.lower() in AUDIO_EXTS)
    return tracks[0] if tracks else None


def local_model(name: str) -> Path | None:
    p = Path(name)
    if p.exists():
        return p
    cand = MODELS / f"faster-whisper-{name}"
    return cand if (cand / "model.bin").exists() else None


def analyse(src: Path, args) -> dict:
    info = summarize(src)
    write_json(job_dir(src) / "metadata.json", info)
    scenes = detect.detect_scenes(src, args.scene_threshold, False)
    if not scenes:
        scenes = [{"index": 0, "start": 0.0, "end": round(info["duration"], 3)}]
    silences = (detect.detect_silences(src, args.noise, args.min_silence, info["duration"])
                if info["audio"] else [])
    speech = detect.speech_ranges(silences, info["duration"]) if info["audio"] else []
    speech_time = sum(r["end"] - r["start"] for r in speech)
    result = {"file": str(src), "duration": info["duration"], "scenes": scenes, "silences": silences,
              "speech": speech, "speech_ratio": round(speech_time / max(info["duration"], 0.01), 3)}
    write_json(job_dir(src) / "analysis.json", result)
    return {"info": info, **result}


def talk_clips(src: Path, an: dict, args) -> list[dict]:
    cut = cut_silences.cut(src, args.threshold, args.margin, 0, args.export) if not args.no_cut else src
    clip = {"file": rel(cut)}
    if args.denoise:
        clip["af"] = "highpass=f=80,afftdn=nf=-25:tn=1,lowpass=f=12000"
    model = local_model(args.model)
    if args.captions == "none":
        pass
    elif args.srt:
        import subtitles
        cap = subtitles.from_srt(args.srt)
        write_json(job_dir(src) / "captions.json", cap)
        clip["captions"] = rel(job_dir(src) / "captions.json")
    elif model:
        import subtitles
        cap = subtitles.transcribe(cut, str(model), None if args.lang == "auto" else args.lang, args.threads)
        write_json(job_dir(src) / "captions.json", cap)
        subtitles.write_srt(cap, job_dir(src) / f"{src.stem}.srt", 32)
        clip["captions"] = rel(job_dir(src) / "captions.json")
    else:
        log(f"AVISO: modelo Whisper '{args.model}' não encontrado em {MODELS}; vídeo sem legendas")
    if args.speaker:
        name, _, role = args.speaker.partition("|")
        clip["overlays"] = [{"type": "lower_third", "start": 0.8, "end": 5.5, "name": name, "role": role}]
    return [clip]


def montage_clips(src: Path, an: dict, args) -> list[dict]:
    """Um trecho por cena (do meio da cena), ignorando cenas muito curtas."""
    clips = []
    for sc in an["scenes"]:
        length = sc["end"] - sc["start"]
        if length < args.min_scene:
            continue
        take = min(length, args.max_scene)
        start = sc["start"] + (length - take) / 2
        clips.append({"file": rel(src), "in": round(start, 3), "out": round(start + take, 3),
                      "mute": not args.keep_audio})
    return clips or [{"file": rel(src)}]


def build_project(name: str, body: list[dict], args) -> dict:
    vertical = args.vertical
    clips: list[dict] = []
    if args.title:
        clips.append({"title": args.title, "subtitle": args.subtitle or "", "duration": 3.0,
                      "color": "#0B0F14", "color2": "#1C2A3A",
                      "transition": {"type": "fadeblack", "duration": 0.6}})
    clips += body
    if args.outro:
        clips.append({"title": args.outro, "duration": 2.5, "color": "#0B0F14", "color2": "#1C2A3A"})
    proj = {
        "output": f"output/{name}_{'1080x1920' if vertical else '1080p'}.mp4",
        "resolution": [1080, 1920] if vertical else [1920, 1080],
        "fps": args.fps,
        "fit": args.fit or ("crop" if vertical else "blur"),
        "transition": {"type": args.transition, "duration": args.transition_duration},
        "captions": {"style": args.style},
        "clips": clips,
        "loudness": -14,
    }
    music = pick_music(args.music)
    if music:
        proj["music"] = {"file": rel(music), "volume": args.music_volume, "duck": True,
                         "fade_in": 1.0, "fade_out": 2.0}
    logo = ASSETS / "graphics" / "logo.png"
    if logo.exists():
        proj["logo"] = {"file": rel(logo), "position": "top-right", "width": 180, "opacity": 0.85}
    return proj


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", type=Path)
    ap.add_argument("--mode", choices=["auto", "talk", "montage"], default="auto")
    ap.add_argument("--combine", action="store_true", help="junta todos os arquivos num único vídeo")
    ap.add_argument("--title", help="cartela de abertura")
    ap.add_argument("--subtitle", help="linha abaixo do título")
    ap.add_argument("--outro", help="cartela de encerramento")
    ap.add_argument("--speaker", help='lower-third: "Nome|Cargo"')
    ap.add_argument("--music", help="arquivo de trilha; 'none' desativa (padrão: 1º de assets/music)")
    ap.add_argument("--music-volume", type=float, default=0.25)
    ap.add_argument("--vertical", action="store_true", help="saída 1080x1920")
    ap.add_argument("--fit", choices=["pad", "crop", "blur"])
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--transition", default="fade")
    ap.add_argument("--transition-duration", type=float, default=0.5)
    ap.add_argument("--preview", action="store_true")
    # análise
    ap.add_argument("--scene-threshold", type=float, default=27.0)
    ap.add_argument("--noise", default="-35dB")
    ap.add_argument("--min-silence", type=float, default=0.5)
    # cortes
    ap.add_argument("--no-cut", action="store_true", help="não remove silêncios")
    ap.add_argument("--threshold", default="4%")
    ap.add_argument("--margin", default="0.2s")
    ap.add_argument("--export", help="também exporta timeline: resolve | premiere | kdenlive ...")
    ap.add_argument("--min-scene", type=float, default=0.8)
    ap.add_argument("--max-scene", type=float, default=4.0)
    ap.add_argument("--denoise", action="store_true", help="reduz ruído de fundo da voz (FFmpeg afftdn)")
    ap.add_argument("--keep-audio", action="store_true", help="mantém o áudio original na montagem")
    # legendas
    ap.add_argument("--captions", choices=["auto", "none"], default="auto")
    ap.add_argument("--style", choices=["karaoke", "classic", "none"], default="karaoke")
    ap.add_argument("--model", default="small")
    ap.add_argument("--lang", default="pt")
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--srt", type=Path, help="usa este SRT como legenda (em vez do Whisper)")
    args = ap.parse_args()

    files = args.files or list_inputs()
    if not files:
        raise SystemExit("nenhum vídeo em input/")
    bodies = []
    for src in files:
        log(f"== {src.name}")
        an = analyse(src, args)
        mode = args.mode
        if mode == "auto":
            mode = "talk" if an["info"]["audio"] and an["speech_ratio"] >= 0.2 else "montage"
        log(f"modo {mode}: {len(an['scenes'])} cena(s), fala {an['speech_ratio'] * 100:.0f}%")
        body = talk_clips(src, an, args) if mode == "talk" else montage_clips(src, an, args)
        bodies.append((src, body))

    jobs = ([("combinado" if len(files) > 1 else files[0].stem, [c for _, b in bodies for c in b])]
            if args.combine else [(src.stem, body) for src, body in bodies])
    for name, body in jobs:
        proj = build_project(name, body, args)
        ppath = STUDIO / "projects" / f"auto_{name}.json"
        write_json(ppath, proj)
        log(f"projeto salvo em {rel(ppath)} (edite e rode render.py para refinar)")
        out = Renderer(proj, ppath, args.preview).render()
        info = summarize(out)
        print(f"OK {rel(out)}: {info['duration']:.2f}s {info['video']['width']}x{info['video']['height']}")


if __name__ == "__main__":
    main()
