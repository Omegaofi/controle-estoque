---
name: motion-design
description: Fundamentos profissionais de motion design e edição de vídeo — princípios de animação, easing, timing, tipografia em movimento, cor, composição e ritmo de corte. Use antes de criar ou revisar qualquer animação, motion graphic, título, transição ou edição de vídeo.
---

# Motion Design — fundamentos do editor profissional

Aplique estas regras a toda peça antes de escrever código (Remotion/FFmpeg) e use-as para revisar o resultado.

## 1. Princípios de animação aplicados a motion
- **Slow in / slow out:** nada se move linearmente sem motivo. Use easing ou spring.
- **Antecipação:** um pequeno movimento contrário (2–4 frames) antes da ação principal.
- **Overshoot + settle:** elementos de entrada passam ~3–8 % do alvo e voltam (spring com damping 10–15).
- **Follow-through / overlap:** elementos de um grupo NÃO chegam juntos — escalonar (stagger) 2–4 frames entre itens.
- **Arcos:** movimentos de posição longos seguem curvas, não retas.
- **Squash & stretch** sutil para elementos "físicos" (bolas, ícones), nunca em texto.
- **Hierarquia de movimento:** um elemento principal por vez; o resto é secundário (menor amplitude, mais atraso).

## 2. Easing (cubic-bezier) padrão
| Uso | Curva |
|-----|-------|
| Entrada (ease-out) | `0.16, 1, 0.3, 1` (expo out) |
| Saída (ease-in) | `0.7, 0, 0.84, 0` |
| Movimento na tela (ease-in-out) | `0.65, 0, 0.35, 1` |
| "Snappy" UI | `0.2, 0.8, 0.2, 1` |
Regra: entradas desaceleram, saídas aceleram. Saída ≈ 60–75 % da duração da entrada.

## 3. Timing (a 30 fps; escale para outros fps)
- Micro-interação: 6–12 frames
- Entrada de título/elemento: 15–24 frames
- Transição entre cenas: 10–20 frames
- Texto na tela: ≥ 1 s + 0,3 s por palavra
- Hold de logo final: 1,5–3 s
- Stagger entre letras: 1–2 frames; entre palavras: 3–5; entre linhas/cards: 4–8

## 4. Tipografia em movimento
- Máximo 2 famílias; sans-serif geométrica/grotesca para legibilidade (Inter, Montserrat, Poppins, Space Grotesk).
- Tamanho mínimo: 1080p → corpo ≥ 42 px; 9:16 → legendas 60–80 px, peso 700+, contorno/sombra.
- Kinetic typography: anime por palavra/sílaba sincronizado com a fala; destaque 1 palavra-chave por frase com cor.
- Tracking levemente aberto em caixa alta (+2 a +8 %).

## 5. Cor e composição
- Paleta: 1 cor primária, 1 acento, neutros. Contraste texto/fundo ≥ 4.5:1.
- Regra dos terços; espaço negativo; alinhamento consistente em grid.
- Safe areas: título 90 % / ação 93 % do quadro. Em 9:16 evite os 250 px inferiores e 150 px superiores (UI das plataformas) e a faixa direita (botões).

## 6. Ritmo de edição
- Hook em 0–2 s: movimento, pergunta ou resultado final primeiro.
- Corte a cada 2–4 s em conteúdo social; varie a duração para não ficar mecânico.
- Corte no beat da música ou no fim da frase; J-cut (áudio antes) e L-cut (áudio continua) para fluidez.
- Pattern interrupt a cada 5–8 s (zoom, mudança de enquadramento, gráfico, SFX).
- Match cut / cut on action para transições invisíveis; transições chamativas só com intenção.
- Sound design: whoosh em transições, pop/click em entradas, riser antes de revelações. Áudio é 50 % do motion.

## 7. Revisão (QA)
Extraia frames-chave para revisar visualmente:
`ffmpeg -i out.mp4 -vf "fps=2,scale=480:-1,tile=4x4" -frames:v 1 contact.png`
Confira: legibilidade, safe area, consistência de cor, nenhum frame preto, movimento sem "pulos".
