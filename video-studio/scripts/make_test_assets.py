#!/usr/bin/env python3
"""Gera mídia de teste 100% sintética (sem direitos autorais) com FFmpeg.

  input/teste-broll-vertical.mp4  -> 4 cenas distintas, 1080x1920, sem áudio
  assets/music/trilha-teste.m4a   -> trilha sintética (acordes) de 32 s
  assets/graphics/logo-teste.png  -> logo simples com transparência

Uso: python scripts/make_test_assets.py
"""
from vslib import ASSETS, INPUT, run

SCENES = [
    "testsrc2=s=1080x1920:r=30:d=3",
    "mandelbrot=s=1080x1920:r=30,trim=duration=3",
    "life=s=1080x1920:r=30:mold=10:ratio=0.5:death_color=#203040:life_color=#FFD400,trim=duration=3",
    "cellauto=s=1080x1920:r=30:rule=110,trim=duration=3",
]


def main() -> None:
    INPUT.mkdir(exist_ok=True)
    srcs = []
    for s in SCENES:
        srcs += ["-f", "lavfi", "-i", s]
    chain = "".join(f"[{i}:v]format=yuv420p,setsar=1[s{i}];" for i in range(len(SCENES)))
    chain += "".join(f"[s{i}]" for i in range(len(SCENES))) + f"concat=n={len(SCENES)}:v=1:a=0[v]"
    run(["ffmpeg", "-y", "-hide_banner", *srcs, "-filter_complex", chain, "-map", "[v]",
         "-c:v", "libx264", "-crf", "30", "-pix_fmt", "yuv420p", INPUT / "teste-broll-vertical.mp4"])

    # Progressão I-V-vi-IV em Lá (acordes com envelope suave + batida leve)
    chords = [(220.00, 277.18, 329.63), (164.81, 207.65, 246.94),
              (185.00, 220.00, 277.18), (146.83, 185.00, 220.00)]
    parts = []
    for k, (a, b, c) in enumerate(chords):
        cond = f"between(mod(t,8),{2 * k},{2 * k + 2})"
        parts.append(f"{cond}*(sin(2*PI*{a}*t)+0.8*sin(2*PI*{b}*t)+0.6*sin(2*PI*{c}*t)"
                     f"+0.5*sin(2*PI*{a / 2}*t))")
    env = "(0.6+0.4*exp(-3*mod(t,0.5)))"
    kick = "0.9*exp(-18*mod(t,0.5))*sin(2*PI*55*t)"
    expr = f"0.12*{env}*({'+'.join(parts)})+0.35*{kick}"
    (ASSETS / "music").mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi", "-i",
         f"aevalsrc='{expr}|{expr}':s=48000:d=32", "-af", "lowpass=f=5000,aecho=0.8:0.5:60:0.25,"
         "afade=t=in:d=0.5,afade=t=out:st=31:d=1", "-c:a", "aac", "-b:a", "192k",
         ASSETS / "music" / "trilha-teste.m4a"])

    (ASSETS / "graphics").mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi", "-i", "color=c=black@0.0:s=360x120,format=rgba",
         "-vf", "drawbox=x=0:y=0:w=120:h=120:color=#FFD400@1:t=fill:replace=1,"
                "drawbox=x=30:y=30:w=60:h=60:color=#0B0F14@1:t=fill:replace=1,"
                "drawtext=text='STUDIO':x=140:y=34:fontsize=48:fontcolor=white",
         "-frames:v", "1", ASSETS / "graphics" / "logo-teste.png"])
    print("mídia de teste gerada")


if __name__ == "__main__":
    main()
