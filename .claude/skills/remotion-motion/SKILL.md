---
name: remotion-motion
description: Criar motion graphics, títulos animados, lower thirds, kinetic typography, legendas dinâmicas, gráficos animados e templates de vídeo com Remotion (React/TypeScript). Use quando o pedido envolver gerar animação ou vídeo por código.
---

# Remotion — motion graphics em código

Leia também a skill `motion-design` para as regras de timing/easing.

## Setup
```bash
npx create-video@latest --blank meu-projeto && cd meu-projeto && npm i
npx remotion studio            # preview
npx remotion render <CompId> out/video.mp4 --codec h264 --crf 18
npx remotion render <CompId> out/video.mov --codec prores --prores-profile 4444   # com alpha (overlay)
npx remotion still <CompId> out/frame.png --frame 45        # checar um frame
```

## Regras essenciais
- Tudo é função de `useCurrentFrame()`; nunca use `setTimeout`, CSS transitions ou animações baseadas em tempo real.
- Use `fps` de `useVideoConfig()` para converter segundos: `frames = seg * fps`.
- Sempre `extrapolateLeft/Right: 'clamp'` em `interpolate`.
- Fontes: `@remotion/google-fonts`; imagens/vídeos com `<Img>`, `<OffthreadVideo>`, `staticFile()`.
- Parametrize com props + `zod` schema para gerar variações em lote.

## Padrões
```tsx
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';

// Entrada com spring (overshoot natural)
const frame = useCurrentFrame();
const {fps} = useVideoConfig();
const s = spring({frame, fps, config: {damping: 12, stiffness: 120, mass: 0.8}});
const y = interpolate(s, [0, 1], [60, 0]);

// Easing por curva bezier
const opacity = interpolate(frame, [0, 18], [0, 1], {
  easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});

// Stagger por palavra (kinetic typography)
const words = text.split(' ');
words.map((w, i) => {
  const p = spring({frame: frame - i * 4, fps, config: {damping: 14}});
  return <span style={{display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>{w}&nbsp;</span>;
});

// Montagem de cenas
<Sequence from={0} durationInFrames={90}><Intro /></Sequence>
<Sequence from={75} durationInFrames={120}><Scene2 /></Sequence>  {/* overlap de 15f p/ transição */}
```
- Transições prontas: `@remotion/transitions` (`TransitionSeries`, `fade`, `slide`, `wipe`, `flip`) com `springTiming`/`linearTiming`.
- Formas/paths: `@remotion/shapes`, `@remotion/paths` (`evolvePath` para "desenhar" linhas/logos).
- Áudio: `<Audio>` + `@remotion/media-utils` (`useAudioData`, `visualizeAudio`) para visualizers e sincronizar com beats.
- Lottie: `@remotion/lottie`. 3D: `@remotion/three`.
- Legendas estilo TikTok: `@remotion/captions` (`createTikTokStyleCaptions`) a partir de transcrição Whisper com timestamps por palavra.

## Componentes do kit (implementar como reutilizáveis)
`TitleReveal` (máscara + slide), `LowerThird` (barra + nome/cargo, entra/sai), `KineticText`, `LogoSting`,
`CountUp` (números animados), `BarChartRace`, `Callout` (seta/círculo destacando ponto), `CaptionTrack`.

## Formatos
16:9 → 1920×1080 · 9:16 → 1080×1920 · 1:1 → 1080×1080 · 4:5 → 1080×1350. Padrão 30 fps (60 para UI/jogos, 24 cinematográfico).
