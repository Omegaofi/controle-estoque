# Formato do projeto (`projects/*.json`)

Renderize com `./studio.sh render projects/arquivo.json [--preview]`.
Caminhos relativos partem da pasta `video-studio/`. Exemplo completo:
`projects/exemplo_completo.json`.

```jsonc
{
  "output": "output/final.mp4",          // padrão: output/<nome-do-projeto>.mp4
  "resolution": [1920, 1080],            // [1080, 1920] para vertical
  "fps": 30,
  "fit": "pad",                          // pad | crop | blur  (padrão para todos os clipes)
  "crf": 18, "preset": "medium",         // qualidade/velocidade do x264
  "theme": {"accent": "#FFD400", "primary": "#FFFFFF", "outline": "#000000",
            "box": "#101418", "font_file": "assets/fonts/MinhaFonte-Bold.ttf"},
  "transition": {"type": "fade", "duration": 0.5},   // transição padrão entre clipes
  "captions": {"style": "karaoke", "max_chars": 32}, // karaoke | classic | none

  "clips": [
    // clipe de vídeo
    {"file": "input/aula.mp4",
     "in": 12.5, "out": 48.0,            // segundos na fonte (out: null = até o fim)
     "speed": 1.0,                       // 0.5–2.0 (áudio com atempo, sem mudar o tom)
     "volume": 1.0, "mute": false,
     "fit": "blur",                      // sobrepõe o "fit" global
     "vf": "eq=contrast=1.05:saturation=1.1",          // filtros extras de vídeo (FFmpeg)
     "af": "highpass=f=80,afftdn=nf=-25",              // filtros extras de áudio (FFmpeg)
     "captions": "output/aula/captions.json",          // tempos relativos ao arquivo-fonte
     "overlays": [                       // tempos relativos ao início deste clipe
       {"type": "lower_third", "start": 1, "end": 5, "name": "Maria", "role": "Professora"}
     ],
     "transition": {"type": "slideleft", "duration": 0.6}},   // transição para o PRÓXIMO clipe

    // cartela gerada (fundo sólido ou gradiente animado + título animado)
    {"title": "Capítulo 2", "subtitle": "Prática", "duration": 3,
     "color": "#0B0F14", "color2": "#1C2A3A"}
  ],

  // overlays com tempo absoluto na timeline final
  "overlays": [
    {"type": "callout", "start": 10, "end": 12.5, "text": "Atenção!"},
    {"type": "title", "start": 20, "end": 23, "text": "Resumo", "subtitle": "3 pontos"},
    {"type": "caption", "start": 30, "end": 33, "text": "Texto livre"}
  ],

  "music": {"file": "assets/music/trilha.mp3", "volume": 0.25, "duck": true,
            "loop": true, "fade_in": 1.0, "fade_out": 2.0},
  "logo": {"file": "assets/graphics/logo.png", "position": "top-right",
           "width": 180, "opacity": 0.85},  // top-left | top-right | bottom-left | bottom-right
  "loudness": -14                          // LUFS alvo; null desativa
}
```

## Transições disponíveis (`xfade` do FFmpeg)
`cut` (corte seco), `fade`, `fadeblack`, `fadewhite`, `dissolve`, `wipeleft`,
`wiperight`, `wipeup`, `wipedown`, `slideleft`, `slideright`, `slideup`,
`slidedown`, `circleopen`, `circleclose`, `radial`, `smoothleft`, `smoothright`,
`zoomin`, `pixelize`, `hblur`, `distance`, `squeezeh`, `squeezev`, `diagtl`, `diagbr`.

Cada transição sobrepõe os clipes pela sua duração, encurtando a timeline na
mesma medida. O áudio recebe `acrossfade` com a mesma duração, o que mantém a sincronia.

## Motion graphics (ASS/libass)
* `title`: entra de baixo com blur e escala 115%→100%; o subtítulo aparece com tracking animado.
* `lower_third`: duas caixas (nome e cargo) que deslizam da esquerda.
* `callout`: texto de destaque no topo, com efeito "pop" (escala com overshoot).
* Legendas `karaoke`: a palavra falada muda para a cor de destaque, no tempo de cada palavra.

O arquivo ASS gerado fica em `output/.work/<projeto>/graphics.ass` e pode ser
aberto/ajustado no Aegisub. O grafo de filtros fica em `filtergraph.txt`, no mesmo lugar.
