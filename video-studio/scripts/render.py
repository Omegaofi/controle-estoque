#!/usr/bin/env python3
"""Monta e renderiza uma timeline descrita em JSON (projects/*.json) com FFmpeg.

Recursos: cortes por in/out, cartelas de título, transições (xfade), legendas
estilizadas, lower-thirds/títulos/callouts animados (ASS), logo, trilha com
ducking automático sob a voz, normalização de loudness e saída 1080p com
proporção preservada (pad, crop ou fundo desfocado).

Uso:
  python scripts/render.py projects/meu_projeto.json [--preview]

--preview renderiza em 540p com preset rápido para conferência.
Veja docs/PROJETO_JSON.md para o formato completo.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from ass import AssDoc, Theme, group_words
from vslib import STUDIO, ASSETS, font_family, find_font, log, run, summarize

TRANSITIONS = {"fade", "fadeblack", "fadewhite", "dissolve", "wipeleft", "wiperight", "wipeup",
               "wipedown", "slideleft", "slideright", "slideup", "slidedown", "circleopen",
               "circleclose", "radial", "smoothleft", "smoothright", "zoomin", "pixelize",
               "hblur", "distance", "squeezeh", "squeezev", "diagtl", "diagbr"}


def resolve(p: str | None) -> Path | None:
    if not p:
        return None
    path = Path(p)
    return path if path.is_absolute() else (STUDIO / path)


def fit_filter(mode: str, w: int, h: int, label_in: str, label_out: str) -> str:
    if mode == "crop":
        return (f"[{label_in}]scale={w}:{h}:force_original_aspect_ratio=increase,"
                f"crop={w}:{h},setsar=1[{label_out}]")
    if mode == "blur":
        return (f"[{label_in}]split=2[{label_out}a][{label_out}b];"
                f"[{label_out}a]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
                f"boxblur=luma_radius=40:luma_power=2,eq=brightness=-0.08[{label_out}bg];"
                f"[{label_out}b]scale={w}:{h}:force_original_aspect_ratio=decrease[{label_out}fg];"
                f"[{label_out}bg][{label_out}fg]overlay=(W-w)/2:(H-h)/2,setsar=1[{label_out}]")
    return (f"[{label_in}]scale={w}:{h}:force_original_aspect_ratio=decrease,"
            f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[{label_out}]")


class Renderer:
    def __init__(self, project: dict, project_path: Path, preview: bool):
        self.p = project
        self.preview = preview
        w, h = project.get("resolution", [1920, 1080])
        if preview:
            w, h = w // 2 // 2 * 2, h // 2 // 2 * 2
        self.w, self.h = w, h
        self.fps = project.get("fps", 30)
        self.fit = project.get("fit", "pad")
        name = project_path.stem + ("_preview" if preview else "")
        self.out = resolve(project.get("output")) or STUDIO / "output" / f"{name}.mp4"
        if preview:
            self.out = self.out.with_name(self.out.stem + "_preview.mp4")
        self.work = STUDIO / "output" / ".work" / name
        self.work.mkdir(parents=True, exist_ok=True)
        self.inputs: list[list[str]] = []
        self.graph: list[str] = []

        font_path = resolve(project.get("theme", {}).get("font_file")) or find_font(bold=True)
        theme = Theme(font=font_family(font_path), **{k: v for k, v in project.get("theme", {}).items()
                                                      if k in ("primary", "accent", "outline", "box")})
        self.font_dir = font_path.parent
        self.ass = AssDoc(self.w, self.h, theme)

    def add_input(self, args: list[str]) -> int:
        self.inputs.append(args)
        return len(self.inputs) - 1

    # ------------------------------------------------------------------ clipes
    def prepare_clip(self, i: int, clip: dict) -> tuple[str, str, float]:
        """Cria os streams normalizados [v{i}] e [a{i}]; devolve a duração."""
        w, h, fps = self.w, self.h, self.fps
        if "title" in clip or "color" in clip:
            dur = float(clip.get("duration", 3))
            c0 = clip.get("color", "#0B0F14")
            c1 = clip.get("color2")
            src = (f"gradients=s={w}x{h}:r={fps}:d={dur}:c0={c0}:c1={c1}:speed=0.008:type=linear"
                   if c1 else f"color=c={c0}:s={w}x{h}:r={fps}:d={dur}")
            vi = self.add_input(["-f", "lavfi", "-i", src])
            self.graph.append(f"[{vi}:v]setsar=1,format=yuv420p,fps={fps}[v{i}]")
            has_audio, ai = False, None
        else:
            src = resolve(clip["file"])
            info = summarize(src)
            start = float(clip.get("in", 0))
            end = float(clip["out"]) if clip.get("out") is not None else info["duration"]
            dur = end - start
            if dur <= 0:
                raise SystemExit(f"clipe {i}: duração inválida ({start}-{end})")
            if info["video"] is None:
                raise SystemExit(f"clipe {i}: {src} não tem vídeo")
            vi = self.add_input(["-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(src)])
            speed = float(clip.get("speed", 1.0))
            setpts = "setpts=PTS-STARTPTS" + (f",setpts=PTS/{speed}" if speed != 1 else "")
            self.graph.append(f"[{vi}:v]{setpts},fps={fps}[v{i}raw]")
            self.graph.append(fit_filter(clip.get("fit", self.fit), w, h, f"v{i}raw", f"v{i}fit"))
            extra = clip.get("vf")              # filtros extras (cor, zoom etc.)
            self.graph.append(f"[v{i}fit]{extra + ',' if extra else ''}format=yuv420p[v{i}]")
            has_audio, ai = info["audio"] is not None and not clip.get("mute"), vi
            dur = dur / speed
        if has_audio:
            vol = clip.get("volume", 1.0)
            speed = float(clip.get("speed", 1.0))
            tempo = f",atempo={speed}" if speed != 1 else ""
            af = f",{clip['af']}" if clip.get("af") else ""   # ex.: redução de ruído
            self.graph.append(f"[{ai}:a]asetpts=PTS-STARTPTS{tempo}{af},aresample=48000,"
                              f"aformat=sample_fmts=fltp:channel_layouts=stereo,volume={vol},"
                              f"apad,atrim=0:{dur:.3f}[a{i}]")
        else:
            self.graph.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{dur:.3f},"
                              f"aformat=sample_fmts=fltp:channel_layouts=stereo[a{i}]")
        return f"v{i}", f"a{i}", dur

    # --------------------------------------------------------------- timeline
    def build(self) -> float:
        clips = self.p["clips"]
        if not clips:
            raise SystemExit("o projeto não tem clipes")
        default_tr = self.p.get("transition", {"type": "fade", "duration": 0.5})
        cur_v, cur_a, length = None, None, 0.0
        starts: list[float] = []
        for i, clip in enumerate(clips):
            v, a, dur = self.prepare_clip(i, clip)
            if cur_v is None:
                cur_v, cur_a, length = v, a, dur
                starts.append(0.0)
                continue
            tr = clips[i - 1].get("transition", default_tr) or {"type": "cut"}
            ttype, td = tr.get("type", "fade"), float(tr.get("duration", 0.5))
            td = min(td, dur / 2, length / 2)
            if ttype == "cut" or td <= 0.04:
                self.graph.append(f"[{cur_v}][{v}]concat=n=2:v=1:a=0,fps={self.fps}[vx{i}]")
                self.graph.append(f"[{cur_a}][{a}]concat=n=2:v=0:a=1[ax{i}]")
                starts.append(length)
                length += dur
            else:
                if ttype not in TRANSITIONS:
                    raise SystemExit(f"transição desconhecida: {ttype}")
                off = length - td
                self.graph.append(f"[{cur_v}][{v}]xfade=transition={ttype}:duration={td:.3f}:"
                                  f"offset={off:.3f}[vx{i}]")
                self.graph.append(f"[{cur_a}][{a}]acrossfade=d={td:.3f}:c1=tri:c2=tri[ax{i}]")
                starts.append(off)
                length = off + dur
            cur_v, cur_a = f"vx{i}", f"ax{i}"
        self.cur_v, self.cur_a = cur_v, cur_a
        self.starts = starts
        return length

    # ----------------------------------------------------------- texto/grafismo
    def build_text(self, length: float) -> None:
        cap_cfg = self.p.get("captions", {})
        style = cap_cfg.get("style", "karaoke")
        max_chars = int(cap_cfg.get("max_chars", 32 if self.w >= self.h else 22))
        for clip, t0 in zip(self.p["clips"], self.starts):
            dur_end = t0 + self.clip_len(clip)
            if "title" in clip:
                self.ass.title(t0 + 0.1, dur_end - 0.1, clip["title"], clip.get("subtitle", ""))
            for ov in clip.get("overlays", []):
                self.overlay(ov, offset=t0)
            cap_path = resolve(clip.get("captions"))
            if not cap_path or style == "none":
                continue
            data = json.loads(cap_path.read_text(encoding="utf-8"))
            cin = float(clip.get("in", 0))
            cout = cin + self.clip_len(clip) * float(clip.get("speed", 1))
            speed = float(clip.get("speed", 1))
            words = []
            for seg in data["segments"]:
                for wd in seg["words"]:
                    if wd["start"] >= cin - 0.05 and wd["end"] <= cout + 0.05:
                        words.append({"start": t0 + (wd["start"] - cin) / speed,
                                      "end": t0 + (wd["end"] - cin) / speed, "word": wd["word"]})
            for line in group_words(words, max_chars=max_chars):
                if style == "classic":
                    self.ass.caption(line[0]["start"], line[-1]["end"], " ".join(x["word"] for x in line))
                else:
                    self.ass.karaoke(line)
        for ov in self.p.get("overlays", []):
            self.overlay(ov, offset=0.0)

    def clip_len(self, clip: dict) -> float:
        if "title" in clip or "color" in clip:
            return float(clip.get("duration", 3))
        src = resolve(clip["file"])
        end = clip.get("out")
        end = float(end) if end is not None else summarize(src)["duration"]
        return (end - float(clip.get("in", 0))) / float(clip.get("speed", 1))

    def overlay(self, ov: dict, offset: float) -> None:
        s, e = offset + float(ov["start"]), offset + float(ov["end"])
        kind = ov.get("type")
        if kind == "lower_third":
            self.ass.lower_third(s, e, ov["name"], ov.get("role", ""))
        elif kind == "title":
            self.ass.title(s, e, ov["text"], ov.get("subtitle", ""))
        elif kind == "callout":
            self.ass.callout(s, e, ov["text"])
        elif kind == "caption":
            self.ass.caption(s, e, ov["text"])
        else:
            raise SystemExit(f"overlay desconhecido: {kind}")

    # ------------------------------------------------------------------ áudio
    def build_audio(self, length: float) -> str:
        music = self.p.get("music")
        cur = self.cur_a
        if music and music.get("file"):
            mfile = resolve(music["file"])
            loop = ["-stream_loop", "-1"] if music.get("loop", True) else []
            mi = self.add_input(loop + ["-i", str(mfile)])
            vol = music.get("volume", 0.25)
            fin, fout = music.get("fade_in", 1.0), music.get("fade_out", 2.0)
            self.graph.append(
                f"[{mi}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
                f"atrim=0:{length:.3f},asetpts=PTS-STARTPTS,volume={vol},"
                f"afade=t=in:d={fin},afade=t=out:st={max(0, length - fout):.3f}:d={fout}[mus]")
            if music.get("duck", True):
                self.graph.append(f"[{cur}]asplit=2[voice][sc]")
                self.graph.append("[mus][sc]sidechaincompress=threshold=0.02:ratio=10:attack=15:"
                                  "release=350:makeup=1[musd]")
                self.graph.append("[voice][musd]amix=inputs=2:duration=first:normalize=0[mix]")
            else:
                self.graph.append(f"[{cur}][mus]amix=inputs=2:duration=first:normalize=0[mix]")
            cur = "mix"
        lufs = self.p.get("loudness", -14)
        if lufs is not None:
            self.graph.append(f"[{cur}]loudnorm=I={lufs}:TP=-1.5:LRA=11,aresample=48000[aout]")
        else:
            self.graph.append(f"[{cur}]anull[aout]")
        return "aout"

    # ----------------------------------------------------------------- vídeo
    def build_video_fx(self) -> str:
        cur = self.cur_v
        if self.ass.events:
            ass_file = self.work / "graphics.ass"
            ass_file.write_text(self.ass.render(), encoding="utf-8")
            fontsdir = os.path.relpath(self.font_dir, self.work)
            self.graph.append(f"[{cur}]subtitles=graphics.ass:fontsdir='{fontsdir}'[vtxt]")
            cur = "vtxt"
        logo = self.p.get("logo")
        if logo and logo.get("file"):
            li = self.add_input(["-loop", "1", "-i", str(resolve(logo["file"]))])
            lw = int(logo.get("width", 180) * self.w / 1920)
            m = int(40 * self.w / 1920)
            pos = {"top-right": f"W-w-{m}:{m}", "top-left": f"{m}:{m}",
                   "bottom-right": f"W-w-{m}:H-h-{m}", "bottom-left": f"{m}:H-h-{m}"}[
                logo.get("position", "top-right")]
            self.graph.append(f"[{li}:v]scale={lw}:-1,format=rgba,"
                              f"colorchannelmixer=aa={logo.get('opacity', 0.85)}[logo]")
            self.graph.append(f"[{cur}][logo]overlay={pos}:shortest=1:format=auto,format=yuv420p[vlogo]")
            cur = "vlogo"
        return cur

    def render(self) -> Path:
        length = self.build()
        self.build_text(length)
        vout = self.build_video_fx()
        aout = self.build_audio(length)
        (self.work / "filtergraph.txt").write_text(";\n".join(self.graph), encoding="utf-8")
        self.out.parent.mkdir(parents=True, exist_ok=True)
        enc = (["-preset", "veryfast", "-crf", "26"] if self.preview
               else ["-preset", self.p.get("preset", "medium"), "-crf", str(self.p.get("crf", 18))])
        cmd = ["ffmpeg", "-y", "-hide_banner", "-nostdin"]
        for args in self.inputs:
            cmd += args
        cmd += ["-filter_complex_script", "filtergraph.txt", "-map", f"[{vout}]", "-map", f"[{aout}]",
                "-t", f"{length:.3f}", "-r", str(self.fps),
                "-c:v", "libx264", *enc, "-pix_fmt", "yuv420p", "-profile:v", "high",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(self.out)]
        log(f"renderizando {length:.2f}s em {self.w}x{self.h}@{self.fps} -> {self.out}")
        run(cmd, cwd=self.work)
        return self.out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", type=Path)
    ap.add_argument("--preview", action="store_true", help="render rápido em meia resolução")
    args = ap.parse_args()
    project = json.loads(args.project.read_text(encoding="utf-8"))
    out = Renderer(project, args.project, args.preview).render()
    info = summarize(out)
    v = info["video"]
    print(f"OK {out}: {info['duration']:.2f}s {v['width']}x{v['height']} @ {v['fps']} fps, {info['size_mb']} MB")


if __name__ == "__main__":
    main()
