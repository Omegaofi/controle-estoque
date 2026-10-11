# Video Studio: edição de vídeo automatizada e open source

Fluxo local para editar vídeos reais: remoção de silêncios, detecção de cenas,
legendas sincronizadas, trilha com ducking, transições, motion graphics e
render final em 1080p (16:9 ou 9:16), tudo com ferramentas gratuitas e locais.

```
video-studio/
├── input/            # coloque aqui os vídeos brutos
├── output/           # resultados (um subdiretório de análise por vídeo + MP4 finais)
├── assets/
│   ├── music/        # trilhas (o pipeline usa a 1ª em ordem alfabética)
│   ├── fonts/        # .ttf/.otf opcionais (senão usa Inter do sistema)
│   └── graphics/     # logo.png (aplicado automaticamente se existir), intros
├── projects/         # projetos JSON da timeline (editáveis)
├── scripts/          # os scripts do fluxo
├── models/           # modelos Whisper (faster-whisper-<tamanho>/)
├── tools/repos/      # código-fonte clonado das ferramentas (referência)
├── docs/             # esta documentação
├── setup.sh          # instalação reproduzível em .venv
└── studio.sh         # atalho: ./studio.sh <script> [args]
```

## 1. Ferramentas avaliadas

Verificado em 11/10/2026: repositórios confirmados via git (último commit) e
metadados no PyPI/npm.

| Ferramenta | Repositório oficial | Licença | Atividade | Situação | Papel no estúdio |
|---|---|---|---|---|---|
| **FFmpeg** 6.1.1 | github.com/FFmpeg/FFmpeg (espelho) | LGPL/GPL | ativo | **já instalado** no sistema (apt) | motor de tudo: corte, escala, xfade, libass, loudnorm, sidechain |
| **auto-editor** 29.3.1 | github.com/WyattBlue/auto-editor | Unlicense (domínio público) | commit em 09/10/2026 | **instalado** (.venv) | remove silêncios/pausas; exporta timeline p/ Resolve, Premiere, FCP, Kdenlive, ShotCut |
| **PySceneDetect** 0.7.1 | github.com/Breakthrough/PySceneDetect | BSD-3-Clause | commit em 09/10/2026, release 22/07/2026 | **instalado** (.venv) | detecção de cenas/cortes (Content/Adaptive detector) |
| **MoviePy** 2.2.1 | github.com/Zulko/moviepy | MIT | commit em 26/08/2026 | **instalado** (.venv) | animações em Python (intro/vinheta com easing) |
| **faster-whisper** 1.2.1 | github.com/SYSTRAN/faster-whisper | MIT | commit em 10/10/2026 | **instalado** (.venv); **modelo não baixado** (ver limitações) | transcrição local com tempo por palavra → legendas |
| openai/whisper | github.com/openai/whisper | MIT | release 25/06/2025 | não instalado | descartado: exige PyTorch (~GBs); o faster-whisper usa os mesmos modelos com menos RAM e mais velocidade na CPU |
| Remotion 4.0.534 | github.com/remotion-dev/remotion | licença própria: grátis p/ indivíduos e empresas ≤ 3 pessoas; acima disso, paga | muito ativo | não instalado (sua decisão) | motion graphics em React; os grafismos aqui são feitos com ASS/libass + MoviePy |

Também considerei e descartei, por redundância: pydub e noisereduce (o FFmpeg já
tem `afftdn`, `arnndn`, `loudnorm`, `sidechaincompress`), WhisperX (exige
PyTorch) e MLT/OpenShot (orientados a editores com GUI).

### Por que este conjunto
* **FFmpeg** faz a renderização final: um único `filter_complex` monta toda a
  timeline, o que garante áudio e vídeo com a mesma duração.
* **auto-editor** é o padrão de fato para "jump cuts" automáticos e ainda
  exporta o corte para editores profissionais, permitindo o ajuste fino manual.
* **PySceneDetect** encontra mudanças de cena para montar b-roll/highlights.
* **faster-whisper** roda 100% local, em CPU e int8, com timestamps por palavra,
  o que viabiliza a legenda karaokê.
* **MoviePy** atende animações que pedem código Python quadro a quadro.

### Observação de segurança
O pacote `auto-editor` do PyPI é um wrapper: na primeira execução, ele baixa o
binário oficial do release do próprio projeto
(`github.com/WyattBlue/auto-editor/releases/download/29.3.1/auto-editor-linux-x86_64`).
Não foi executado nenhum script remoto além das instalações via pip/uv e dos
clones `git clone --depth 1` dos repositórios acima.

## 2. Instalação

Requisitos: Linux/macOS, FFmpeg ≥ 6 com libass e libfreetype, e Python ≥ 3.10.

```bash
cd video-studio
./setup.sh                      # cria .venv e instala as versões travadas
./setup.sh --with-repos         # + clona o código-fonte em tools/repos/
./setup.sh --model small        # + baixa o modelo Whisper (precisa de huggingface.co)
```

**Modelo Whisper offline:** em uma máquina com internet, rode
`huggingface-cli download Systran/faster-whisper-small --local-dir faster-whisper-small`
e copie a pasta para `video-studio/models/faster-whisper-small/` (precisa conter `model.bin`).
Tamanhos: `tiny` (75 MB), `base` (145 MB), `small` (~480 MB, recomendado para PT-BR),
`medium` (1,5 GB) e `large-v3` (3 GB, lento em CPU).

## 3. Uso rápido

```bash
# 1) coloque vídeos em input/ (e, se quiser, uma trilha em assets/music/ e logo em assets/graphics/logo.png)
# 2) rode o fluxo completo:
./studio.sh pipeline --title "Aula 1" --subtitle "Introdução" --speaker "Maria Silva|Professora"

# render rápido em 540p para conferir antes do final:
./studio.sh pipeline --preview

# todos os vídeos de input/ num único vídeo, formato Reels/Shorts:
./studio.sh pipeline --combine --vertical --title "Resumo"
```

O pipeline salva `projects/auto_<nome>.json`. Edite esse arquivo (cortes, textos,
transições, volume da trilha) e renderize de novo, sem refazer a análise:

```bash
./studio.sh render projects/auto_aula.json
```

### Scripts individuais

| Comando | O que faz | Saída |
|---|---|---|
| `./studio.sh inspect_media [arquivos]` | codec, resolução, fps, rotação, áudio | `output/<nome>/metadata.json` |
| `./studio.sh detect [arquivos] --thumbs` | cenas + silêncios + trechos com fala | `output/<nome>/analysis.json`, `scenes/*.jpg` |
| `./studio.sh cut_silences video --threshold 4% --margin 0.2s` | remove pausas (auto-editor) | `output/<nome>/<nome>_cut.mp4` |
| `./studio.sh cut_silences video --speed 8` | acelera as pausas em vez de cortar | idem |
| `./studio.sh cut_silences video --export resolve` | + timeline para Resolve/Premiere/FCP/Kdenlive/ShotCut | `output/<nome>/<nome>_timeline.*` |
| `./studio.sh subtitles video --lang pt` | transcreve (faster-whisper) | `captions.json` + `.srt` |
| `./studio.sh subtitles video --from-srt arq.srt` | importa uma legenda existente | idem |
| `./studio.sh motion_title "Título" --subtitle "..."` | intro animada (MoviePy) | `assets/graphics/intro.mp4` |
| `./studio.sh render projects/x.json [--preview]` | monta e renderiza a timeline | caminho em `"output"` |
| `./studio.sh make_test_assets` | gera mídia sintética de teste | `input/`, `assets/` |

### Opções principais do pipeline
* `--mode auto|talk|montage`: `auto` usa `talk` quando há ≥ 20% de fala, senão `montage`.
* `talk`: corta silêncios, legenda (se houver modelo ou `--srt`) e aplica lower-third (`--speaker`).
* `montage`: pega até `--max-scene` segundos do meio de cada cena detectada (ignora cenas `< --min-scene`).
* `--style karaoke|classic|none`, `--music arquivo|none`, `--music-volume 0.25`.
* `--transition fade|dissolve|slideleft|circleopen|...` e `--transition-duration 0.5`.
* `--fit pad|crop|blur`: como encaixar fontes de proporção diferente (padrão: `blur` em 16:9, `crop` em 9:16).
* `--denoise`: reduz ruído de fundo da voz (highpass + `afftdn`).
* `--no-cut`, `--threshold`, `--margin`, `--noise`, `--min-silence`, `--scene-threshold`.

## 4. Garantias de qualidade do render

* **Proporção:** cada clipe é escalado com `force_original_aspect_ratio` e recebe
  pad, crop ou fundo desfocado. Nunca é esticado. `setsar=1` evita pixels não quadrados.
* **Sincronia:** cada clipe é normalizado para fps constante e áudio 48 kHz
  estéreo, com `apad`/`atrim` para a duração exata do vídeo. Transições usam
  `xfade` + `acrossfade` com a mesma duração, e a saída é limitada com `-t`.
  Nos testes, as durações de vídeo e áudio coincidiram em todas as saídas.
* **Loudness:** `loudnorm` em −14 LUFS / −1,5 dBTP (padrão YouTube/Spotify). A
  trilha recebe *ducking* via `sidechaincompress` sempre que há voz.
* **Encode:** H.264 High, CRF 18, yuv420p, AAC 192 kbps e `+faststart` (pronto para web).

## 5. Teste executado (11/10/2026)

Vídeo de exemplo: `example.mp4` do repositório do auto-editor (fala real, 1280x720,
42,4 s, domínio público), copiado para `input/exemplo-fala.mp4`, além de mídia
sintética gerada por `make_test_assets` (b-roll vertical 1080x1920 com 4 padrões e trilha de acordes).

| Etapa | Resultado medido |
|---|---|
| detect | 4 silêncios (26,2 s de 42,4 s); b-roll: 5 cenas detectadas |
| cut_silences | 42,4 s → 17,4 s (−59%); com `--speed 8`: 20,5 s |
| export resolve | `exemplo-fala_timeline.fcpxml` gerado |
| motion_title | intro 1920x1080, 4 s (render ~45 s em 4 CPUs) |
| render `projects/exemplo_completo.json` | 28,60 s, 1920x1080@30, vídeo = áudio = 28,600 s, −14,5 LUFS integrados |
| pipeline (2 arquivos, separados) | `exemplo-fala_1080p.mp4` (21,8 s) e `teste-broll-vertical_1080p.mp4` (14,3 s) |
| pipeline `--combine --vertical` | `combinado_1080x1920.mp4` (29,2 s) |
| subtitles (Whisper) | **não testado**: download do modelo bloqueado pela rede do ambiente (huggingface.co → 403) |

As legendas nos vídeos de teste vêm de `projects/legenda_teste.srt`, um texto
**fictício**, marcado como teste, usado só para validar estilo e sincronia. Ele
não é uma transcrição da fala.

## 6. Limitações conhecidas

* **Transcrição não validada aqui:** o código do faster-whisper está instalado,
  mas o modelo não pôde ser baixado. Coloque o modelo em `models/` (seção 2) e
  rode `./studio.sh subtitles ...` para validar.
* **CPU apenas:** sem GPU, o Whisper `small` leva aproximadamente 0,5–1× o tempo real do áudio
  em 4 núcleos, e o render 1080p fica em torno de 0,5× o tempo real.
* **Detecção de silêncio por volume:** ruído de fundo alto exige ajustar
  `--threshold` (auto-editor) e `--noise` (análise). Use `cut_silences --preview` para calibrar.
* **Redução de ruído** é desligada por padrão: use `--denoise` no pipeline ou o campo
  `"af"` do clipe. É um denoise espectral (`afftdn`), bom para chiado constante,
  mas limitado para ruído variável (vozes ao fundo, trânsito). Para esses casos, o
  `arnndn` do FFmpeg funciona com um modelo RNNoise (`.rnnn`) baixado à parte.
* **Motion graphics** são baseados em ASS/libass (fade, movimento, escala, blur)
  e MoviePy. Animações complexas (partículas, 3D, After Effects-like) exigiriam
  Remotion ou Blender, que não foram instalados.
* **Música:** a trilha de teste é sintética. Use músicas com licença adequada
  (ex.: YouTube Audio Library, Free Music Archive, Pixabay Music), respeitando os termos de cada uma.
* **Sincronia com batida:** não há detecção de beats (ex.: librosa) para cortar no tempo da música.
* O contêiner desta sessão é efêmero: `.venv`, `models/`, `tools/repos/`, `input/` e `output/`
  estão no `.gitignore`. Use `./setup.sh` para recriar o ambiente.
