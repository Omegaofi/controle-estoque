# Plano: Claude como Editor de Vídeo Especialista em Motion

Objetivo: transformar o Claude num editor de vídeo e motion designer de nível profissional,
capaz de **criar** animações (motion graphics, títulos, lower thirds, kinetic typography,
infográficos animados) e **editar** vídeos (cortes, ritmo, cor, áudio, legendas, exportação)
de ponta a ponta — tudo via código, de forma reproduzível.

> Princípio central: o Claude não "arrasta clipes" numa timeline. Ele **escreve a timeline como
> código** (Remotion / FFmpeg / Python) e renderiza. Isso dá precisão de frame, versionamento
> no Git e a possibilidade de gerar dezenas de variações automaticamente.

---

## 1. Arsenal de skills (o que já foi criado neste repositório)

| Skill | Pasta | Para quê |
|-------|-------|----------|
| `motion-design` | `.claude/skills/motion-design/` | Fundamentos: os 12 princípios da animação, easing, timing, tipografia, cor, composição, ritmo de edição. É o "olho" do editor. |
| `remotion-motion` | `.claude/skills/remotion-motion/` | Criar motion graphics em React/TypeScript com Remotion: springs, interpolate, sequências, transições, templates parametrizados. |
| `ffmpeg-edit` | `.claude/skills/ffmpeg-edit/` | Edição e finalização: cortes, concat, J/L cuts, color grading com LUT, loudness (-14 LUFS), legendas queimadas, reframe 9:16, presets de exportação. |

Essas skills ficam em `.claude/skills/`, então qualquer sessão do Claude Code aberta neste
repositório já as carrega automaticamente.

---

## 2. Stack de ferramentas

| Camada | Ferramenta principal | Alternativas |
|--------|---------------------|--------------|
| Motion graphics (código) | **Remotion** (React) | Motion Canvas, Manim (matemática/explicativo), Lottie (bodymovin) |
| Edição / montagem / finalização | **FFmpeg** | MoviePy, MLT/Shotcut CLI |
| Legendas automáticas | **Whisper** (openai-whisper / faster-whisper) | WhisperX (timestamps por palavra) |
| Remoção de fundo / roto | rembg, Robust Video Matting | Canva `remove-background` (conector já disponível) |
| Assets visuais | Canva (conector conectado), SVG à mão, Google Fonts | — |
| Áudio | FFmpeg `loudnorm`, `afftdn`, `sidechaincompress` | SoX |
| Análise de material | `ffprobe`, detecção de cenas (`select='gt(scene,0.3)'`), PySceneDetect | — |
| Interop com ferramentas pro | Export de EDL/FCPXML, ExtendScript p/ After Effects, scripts p/ DaVinci Resolve (Python API) | — |

Instalação base (sessão com rede liberada):

```bash
# já presentes neste ambiente: ffmpeg 6.1, node 22, python3
npx create-video@latest meu-motion          # projeto Remotion
pip install faster-whisper scenedetect[opencv] rembg moviepy
```

---

## 3. Roteiro de evolução (fases)

### Fase 1 — Fundamentos (o "olho")
- Dominar os 12 princípios da animação aplicados a UI/motion (antecipação, overshoot, follow-through, arcos, slow-in/slow-out).
- Biblioteca de curvas de easing padrão (ver skill `motion-design`).
- Regras de timing: 6–12 frames micro-interação, 15–24 frames entrada de título, 0,5 s de respiro antes de cortes importantes.
- Tipografia em movimento: hierarquia, legibilidade (tempo mínimo de leitura ≈ 0,3 s por palavra + 1 s), safe areas.
- **Entrega:** checklist de qualidade que toda peça precisa passar (seção 5).

### Fase 2 — Motion graphics com Remotion
- Componentes reutilizáveis: `TitleReveal`, `LowerThird`, `KineticText`, `LogoSting`, `CountUp`, `BarChartRace`, `Transition` (wipe, zoom, whip-pan, glitch).
- Templates parametrizados via `inputProps` (cor, texto, duração) → renderização em lote.
- Renderização: `npx remotion render`, com `--codec h264|prores` e `--crf`.
- **Entrega:** kit de 10 componentes + 3 templates (intro de YouTube, Reels/TikTok, vídeo explicativo).

### Fase 3 — Edição e montagem com FFmpeg
- Cortes precisos por timecode, concat sem re-encode, J-cut/L-cut, speed ramps, freeze frames.
- Detecção automática de cenas e silêncios → "rough cut" automático (corta pausas > 0,6 s).
- Reframe 16:9 → 9:16 / 1:1 com crop dinâmico.
- **Entrega:** pipeline `rough-cut` (vídeo bruto → corte limpo sem silêncios).

### Fase 4 — Cor, áudio e legendas (finalização)
- Color: correção primária (`eq`, `colorbalance`, `curves`), LUTs `.cube` (`lut3d`), look consistente.
- Áudio: normalização para -14 LUFS (YouTube/Spotify) / -16 LUFS (podcast), redução de ruído, ducking da trilha sob a voz.
- Legendas: Whisper → SRT/ASS → estilo "TikTok" palavra por palavra (Remotion) ou queimadas (FFmpeg `subtitles`).
- **Entrega:** pipeline `finish` (cor + áudio + legenda + export).

### Fase 5 — Pipeline completo e automação
- Fluxo único: **briefing → roteiro → storyboard (frames-chave) → assets → motion → montagem → finalização → QA → export multi-formato**.
- Geração de variações (A/B de hooks para anúncios) usando os dados do conector **Motion Creative Analytics** (hook rate, retenção) para decidir o que testar.
- Exportação para os editores do cliente (FCPXML/EDL) quando o projeto continuar no Premiere/Resolve/Final Cut.

### Fase 6 — Portfólio e refinamento contínuo
- 5 peças de referência: abertura de canal, Reels com legenda dinâmica, explicativo animado, anúncio com 3 variações de hook, infográfico animado com dados.
- Revisão crítica de cada peça contra o checklist; registrar aprendizados nas skills.

---

## 4. Fluxo de trabalho padrão (para cada pedido de vídeo)

1. **Briefing** — plataforma, formato (16:9, 9:16, 1:1), duração, público, tom, referências, identidade visual.
2. **Análise do material** — `ffprobe` (fps, resolução, codec, áudio), detecção de cenas, transcrição.
3. **Roteiro + storyboard** — beats com timecode; hook nos primeiros 1–3 s.
4. **Design system do vídeo** — paleta (máx. 3 cores + neutros), 1–2 fontes, curva de easing "da marca", duração padrão de transições.
5. **Produção** — motion no Remotion, montagem no FFmpeg.
6. **Finalização** — cor, áudio, legenda.
7. **QA** — checklist abaixo + frames extraídos para revisão visual.
8. **Export** — presets por plataforma (ver skill `ffmpeg-edit`).

---

## 5. Checklist de qualidade profissional

- [ ] Nenhum movimento linear sem intenção (tudo com easing ou spring)
- [ ] Hook visual/sonoro nos primeiros 2 s
- [ ] Texto fica na tela tempo suficiente para ler
- [ ] Elementos dentro da safe area (e fora da UI do TikTok/Reels em 9:16)
- [ ] Cortes no ritmo da música/fala (beats ou fim de frase)
- [ ] Cor consistente entre planos; pretos e brancos sem clipping
- [ ] Áudio em -14 LUFS integrado, true peak ≤ -1 dBTP, voz sempre inteligível
- [ ] Legendas sincronizadas (± 2 frames) e sem erros
- [ ] Sem frames pretos/flash acidental entre cortes
- [ ] fps e resolução consistentes do início ao fim; `yuv420p` para compatibilidade
- [ ] Export no preset da plataforma de destino

---

## 6. Métricas de "melhor editor"

- **Técnica:** 0 erros no checklist em 3 entregas seguidas.
- **Velocidade:** rough cut automático de 10 min de material em < 2 min de render.
- **Reuso:** ≥ 70 % de cada novo vídeo montado a partir de componentes/templates existentes.
- **Resultado:** para anúncios, melhoria de hook rate/retenção medida via Motion Creative Analytics.

---

## 7. Próximos passos imediatos

1. Inicializar o projeto Remotion em `motion-editor/remotion/` e implementar os 3 primeiros componentes (`TitleReveal`, `LowerThird`, `KineticText`).
2. Criar o script `rough-cut` (detecção de silêncio + concat) em `motion-editor/scripts/`.
3. Produzir a primeira peça de portfólio e passá-la pelo checklist.
