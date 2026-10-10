---
name: ffmpeg-edit
description: Editar e finalizar vídeos com FFmpeg — análise de material, cortes, concat, speed ramp, reframe 9:16, color grading/LUT, normalização de áudio, ducking, legendas e presets de exportação por plataforma. Use para qualquer edição, montagem ou exportação de vídeo existente.
---

# FFmpeg — edição e finalização profissional

## Análise
```bash
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt,channels:format=duration -of json in.mp4
ffmpeg -i in.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep pts_time     # cortes de cena
ffmpeg -i in.mp4 -af silencedetect=noise=-35dB:d=0.6 -f null - 2>&1 | grep silence_       # silêncios (rough cut)
ffmpeg -i in.mp4 -af ebur128 -f null - 2>&1 | tail -12                                     # loudness
```

## Cortes e montagem
```bash
ffmpeg -ss 00:01:02.500 -to 00:01:10 -i in.mp4 -c:v libx264 -crf 18 -c:a aac clip.mp4     # corte preciso (re-encode)
ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4                                         # concat (mesmos codecs)
# transição entre clipes
ffmpeg -i a.mp4 -i b.mp4 -filter_complex "[0][1]xfade=transition=fade:duration=0.5:offset=4.5;[0:a][1:a]acrossfade=d=0.5" out.mp4
# speed ramp 2x (vídeo + áudio)
ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" -map [v] -map [a] fast.mp4
# freeze frame de 1 s no fim
ffmpeg -i in.mp4 -vf tpad=stop_mode=clone:stop_duration=1 out.mp4
```
- Rough cut automático: usar `silencedetect`, gerar segmentos falados (com margem de 0,1 s), cortar e concatenar.
- J/L cut: deslocar o áudio com `adelay` / `atrim` independente do vídeo no `filter_complex`.
- Transições `xfade`: fade, wipeleft, slideup, circleopen, smoothleft, zoomin, dissolve, pixelize…

## Reframe e composição
```bash
ffmpeg -i in.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" vertical.mp4                       # 16:9 → 9:16 centro
ffmpeg -i in.mp4 -vf "split[a][b];[a]scale=1080:1920,boxblur=30[bg];[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" vert_blur.mp4
ffmpeg -i base.mp4 -i overlay.mov -filter_complex "overlay=0:0" out.mp4                      # overlay ProRes 4444 do Remotion
ffmpeg -i in.mp4 -vf "zoompan=z='min(zoom+0.0008,1.15)':d=1:s=1920x1080:fps=30" punchin.mp4 # zoom lento (Ken Burns)
```

## Cor
```bash
ffmpeg -i in.mp4 -vf "eq=contrast=1.08:saturation=1.15:gamma=0.98,colorbalance=rs=.03:bs=-.03" graded.mp4
ffmpeg -i in.mp4 -vf "lut3d=look.cube" graded.mp4
ffmpeg -i log.mp4 -vf "curves=preset=increase_contrast" out.mp4
```
Mantenha o mesmo grade em todos os planos; verifique com `-vf "waveform"` ou `histogram`.

## Áudio
```bash
ffmpeg -i in.mp4 -af "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-18dB:ratio=3,loudnorm=I=-14:TP=-1:LRA=11" -c:v copy out.mp4
# ducking: música abaixa sob a voz
ffmpeg -i voz.wav -i musica.mp3 -filter_complex "[1:a]volume=0.5[m];[m][0:a]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=300[d];[d][0:a]amix=inputs=2:normalize=0" mix.wav
```
Alvos: YouTube/Reels/TikTok −14 LUFS · podcast −16 LUFS · broadcast −23 LUFS. True peak ≤ −1 dBTP.

## Legendas
```bash
# transcrição (faster-whisper) → SRT, depois queimar com estilo
ffmpeg -i in.mp4 -vf "subtitles=subs.srt:force_style='FontName=Montserrat,FontSize=16,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=3,Alignment=2,MarginV=120'" out.mp4
```
Para legendas animadas palavra a palavra, usar a skill `remotion-motion`.

## Presets de exportação
| Destino | Comando |
|---------|---------|
| YouTube 1080p | `-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 320k -movflags +faststart` |
| Reels/TikTok/Shorts | 1080×1920, 30 fps, `-c:v libx264 -crf 20 -maxrate 12M -bufsize 24M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart` |
| Master/intermediário | `-c:v prores_ks -profile:v 3 -c:a pcm_s16le` |
| Overlay com alpha | `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le` |
| Web leve | `-c:v libx264 -crf 26 -preset slow` ou `-c:v libvpx-vp9 -crf 32 -b:v 0` |
| GIF | `-vf "fps=15,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse"` |

Sempre: fps constante (`-r 30` / `fps=30`), `yuv420p` para compatibilidade, e conferir o resultado com `ffprobe` + contact sheet (skill `motion-design`).
