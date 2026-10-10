# Guia de Motion — técnicas de referência

Baseado no vídeo `motion_opencode_v2.mp4` (ChatGPT × Claude → OpenCode).
Storyboard da referência, 1 quadro por segundo: [`storyboard_referencia.jpg`](storyboard_referencia.jpg).

Use este guia sempre que for criar um vídeo/motion. Ele descreve **o que** a referência faz e **como**
reproduzir com Python (PIL + numpy) gerando quadros e enviando para o `ffmpeg` — sem serviços externos.

---

## 1. Especificações padrão

| Item | Valor |
|---|---|
| Resolução | 1920 × 1080 (16:9) |
| Taxa | 24 fps (720 quadros para 30 s) |
| Codec | H.264, `-crf 18`, `-pix_fmt yuv420p`, `-movflags +faststart` |
| Duração | 30 s, salvo pedido diferente |
| Áudio | nenhum (o vídeo deve funcionar mudo) |

Conferir no final: `ffprobe -show_entries stream=width,height,r_frame_rate,nb_frames:format=duration`.

## 2. Identidade visual

**Fundo**
- Quase preto azulado: `#080C11` → `#0A1017` (nunca preto puro).
- Grade quadriculada fina de **60 px**, linhas de 1 px em azul-acinzentado com baixíssimo contraste
  (`~#141B24`); linhas "maiores" a cada 240 px um pouco mais claras.
- **Vinheta radial** escurecendo as bordas e um leve *spotlight* no centro.
- A grade **se desloca devagar** (≈14 px/s na diagonal) para o fundo nunca ficar estático.
- **Grade que acende**: em momentos de impacto (explosão, revelação da logo) um halo radial azul
  (`~#3B6FD8`, alfa baixo, blur grande) é aplicado *somente sobre as linhas da grade* ao redor do
  elemento — a grade "brilha" em anel e some em ~0,8 s.

**Paleta**
| Uso | Cor |
|---|---|
| Texto principal | `#EEF0F4` |
| Texto secundário / legendas | `#808896` |
| Verde (grátis / sucesso / ChatGPT) | `#10A37F` / `#3FB950` |
| Laranja (Claude / destaque quente) | `#D77655` |
| Azul (privado / bordas de mensagem) | `#4C8DFF` |
| Roxo (skills / extensível) | `#A371F7` |

Regra: **cada conceito tem uma cor e ela se repete** — no card, no ícone, no brilho da borda e na
palavra correspondente da frase final ("**Grátis.** **Privado.** **Extensível.**" cada uma na sua cor).

**Tipografia**
- Títulos/rótulos: sans geométrica bold (Inter Bold/SemiBold).
- Terminal e logo "tech": monoespaçada; wordmark em estilo *pixel/blocky* com duas tonalidades
  (`open` cinza, `code` branco).
- Legendas pequenas e discretas em cinza; nada de parágrafos longos na tela.

## 3. Estrutura narrativa (30 s)

| Tempo | Bloco | O que acontece |
|---|---|---|
| 0–3 s | **Apresentação do conflito** | Logo A entra deslizando da esquerda com fade; logo B aparece à direita. Rótulos sob cada uma. Brilho colorido (*bloom*) na cor de cada marca. |
| 3–4 s | **Tensão** | Rachaduras brancas se desenham sobre as logos, leve tremor, rótulos esmaecem. |
| 4–5 s | **Explosão** | Cada logo vira um **anel de centenas de estilhaços** triangulares com núcleo de luz colorido; a grade acende em anel. |
| 5–8 s | **Deriva** | Estilhaços se espalham por toda a tela girando, desacelerando e sumindo aos poucos. |
| 8–9 s | **Montagem** | Fragmentos escuros convergem e **se montam** na nova logo (efeito 3D, sombras). |
| 9–10 s | **Revelação** | Flash claro de tela inteira, logo + wordmark grandes no centro, tagline pequena, grade acendendo atrás. |
| 10–11 s | **Transição por continuidade** | A logo **encolhe e sobe** virando cabeçalho fixo; o terminal surge abaixo com fade. |
| 11–22 s | **Demonstração real** | Terminal (TUI) funcionando: digitação, "Pensando…", chamadas de ferramenta, código colorido, testes passando, comandos `/skills`, `/custo`. Conteúdo **rola para cima** conforme chegam linhas. |
| 22–26 s | **Benefícios** | O terminal desliza para a esquerda; à direita entram **3 cards empilhados** (verde, azul, roxo), um a cada ~1 s. |
| 27–29 s | **Assinatura** | Tudo sai; logo central grande, frase-resumo com palavras coloridas, URL discreta, grade acesa. |
| 29–30 s | **Saída** | Fade para preto. |

Princípio: **mostrar, não dizer**. Os benefícios dos cards já foram *provados* dentro da demo
(ex.: `/custo` → "Custo da sessão: $0.00 · 100% local"), então os cards apenas nomeiam o que se viu.

## 4. Técnicas (e como reproduzir)

### 4.1 Easing — nada se move linearmente
```python
clamp = lambda x, a=0., b=1.: max(a, min(b, x))
def prog(t, a, b): return clamp((t - a) / (b - a))       # 0→1 entre os tempos a e b
def ease_out(p): return 1 - (1 - p) ** 3                    # entradas
def ease_in(p):  return p ** 3                              # saídas
def ease_io(p):  return 4*p**3 if p < .5 else 1 - (-2*p + 2)**3 / 2  # deslocamentos
def back_out(p, s=1.7): p -= 1; return 1 + p*p*((s+1)*p + s)       # "pop" com overshoot
```
- Entradas: `ease_out` / `back_out` (0,4–0,6 s). Saídas: `ease_in` (0,3–0,5 s), mais rápidas que entradas.
- Elementos em grupo entram **escalonados** (stagger de 0,1–0,3 s; cards ~1 s).
- Elementos parados "respiram": flutuação senoidal de 4–8 px ou pulso de escala de 3–5 %.

### 4.2 Supersampling para bordas suaves
Desenhe formas (logos, cards, ícones) em **2×** e reduza com `LANCZOS`; pré-renderize como *sprites*
RGBA uma vez e só posicione/escale por quadro.

### 4.3 Bloom / brilho colorido
Copie a forma, pinte com a cor da marca, aplique `GaussianBlur(raio ≈ 25 % do tamanho)` e componha
**atrás** do sprite. Usado em logos, nos cards (borda brilhante) e no núcleo da explosão.

### 4.4 Rachadura → estilhaços
1. Rachaduras: 5–7 polilinhas irregulares saindo do centro, desenhadas progressivamente (branco 4 px
   com miolo escuro 2 px) + tremor `sin(t·90)·6px`.
2. Estilhaços: triangule o sprite (grade com jitter ou pontos aleatórios) e recorte cada triângulo com
   máscara. Para o visual da referência use **muitos** fragmentos pequenos (150–300 por logo).
3. Explosão: direção radial + aleatoriedade, distância com `ease_out`, rotação contínua, leve gravidade,
   alfa caindo no fim. No impacto: flash curto + anel de grade acesa.

### 4.5 Montagem da nova logo
Inverta a lógica: fragmentos escuros partem de posições espalhadas e convergem (`ease_in`) para seus
lugares na nova logo, girando até 0°. Termine com flash branco (alfa ~0,4, 0,3 s) e `back_out` na escala.

### 4.6 Transição por continuidade
Em vez de cortar, o elemento principal **vira parte da próxima cena** (logo → cabeçalho do terminal).
Interpole posição e escala com `ease_io` enquanto a próxima cena entra com fade + leve subida.

### 4.7 Terminal realista
- Janela com barra de título (bolinhas vermelho/amarelo/verde, ícone de pasta, título da sessão),
  cantos arredondados, sombra suave desfocada.
- Cabeçalho da sessão com **contador vivo** (tokens / % / custo) que incrementa a cada passo.
- Mensagens do usuário em faixa escura com **borda esquerda azul**.
- Linhas de ferramenta com marcadores (`● Glob`, `→ Read`, `← Write`), código com *syntax highlight*,
  `✓` verde para sucesso, spinner braille `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` com "Pensando…".
- Rodapé com modelo/modo (`Build · Qwen2.5 Coder · local`) e atalhos (`esc interrupt · ctrl+p commands`).
- Digitação caractere a caractere (≈ 25–35 caracteres/s) com cursor em bloco piscando.
- **Auto-scroll**: renderize todas as linhas num canvas alto e recorte a janela visível deslizando
  com `ease_out` quando entra conteúdo novo.

### 4.8 Cards de benefício
- Fundo escuro translúcido, cantos arredondados, **borda de 2 px + brilho** na cor do conceito.
- Ícone em círculo com contorno colorido (R$0, cadeado, peça/plug), título bold branco, subtítulo cinza.
- Entram deslizando da direita (+60 px) com fade, empilhados verticalmente, um por vez.

### 4.9 Assinatura final
Logo grande centralizada → frase-resumo com cada palavra na cor do seu card → URL pequena em cinza.
Grade acesa atrás da logo. Último ~0,5 s: fade para preto.

## 5. Pipeline de render

```python
ff = subprocess.Popen(["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1920x1080",
                       "-r", "24", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                       "-pix_fmt", "yuv420p", "-r", "24", "-movflags", "+faststart", OUT],
                      stdin=subprocess.PIPE)
for f in range(720):
    ff.stdin.write(render(f / 24).tobytes())   # render(t) devolve Image RGB 1920x1080
ff.stdin.close(); ff.wait()
```
- Organize por cenas: `scene_x(frame, t)` que retorna cedo se `t` estiver fora do intervalo.
- Pré-calcule fundo, sprites e fragmentos fora do loop.
- Tenha um **modo prévia** (`render.py out.mp4 3 7.5 12 …`) que salva PNGs desses segundos.

## 6. Checklist de qualidade

- [ ] Gerar prévias nos pontos-chave e montar um *contact sheet* antes do render completo.
- [ ] Nenhum texto sobreposto a outro elemento; margens laterais ≥ 80 px.
- [ ] Toda cena tem entrada **e** saída animadas (nada some de um quadro para o outro).
- [ ] Cores de conceito consistentes do começo ao fim.
- [ ] Movimento contínuo: a grade se move e elementos parados "respiram".
- [ ] `ffprobe` confirma 1920×1080, 24/1, 720 quadros, 30,0 s.
- [ ] Logos de terceiros: preferir os arquivos oficiais fornecidos pelo usuário; se forem recriados,
      avisar que são aproximações.
