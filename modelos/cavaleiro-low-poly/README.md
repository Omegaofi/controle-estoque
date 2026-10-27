# Cavaleiro low poly

Cavaleiro low poly realista: sem elmo, com rosto realista, capa verde,
espada longa na mão direita e escudo no braço esquerdo. Proporções humanas
(1,80 m, cerca de 8 cabeças), em pose natural com o peso na perna esquerda.
Cabeça 10% maior que a proporção anatômica, para ler melhor em pixel art, e
cabelo castanho-escuro em corte "old money": testa livre, entradas leves,
laterais e nuca curtas, bastante volume em cima penteado para trás, risca do
lado esquerdo e topete na frente.

- **Rosto:** sem boca; relevo de arco das sobrancelhas, órbitas, maçãs do
  rosto e queixo; nariz com dorso, ponta e asas; olhos escuros e discretos.
  Por cima, uma textura pintada de 128×128 (projetada de frente):
  sobrancelhas, sombra das órbitas e sob o nariz, corado nas maçãs e sombra
  leve de barba feita.
- **Espaldares (ombreiras):** cúpula com crista e borda enrolada, friso de
  latão, oito rebites na borda, placa alta junto ao pescoço com borda de latão,
  quatro lâminas rebitadas e borda de latão na última.
  Os espaldares ficam presos ao tronco, afivelados na couraça: parados,
  encostam nela; em movimento a cúpula acompanha só 30% do giro do ombro e as
  lâminas de baixo 75%, então o vão entre a placa e o braço só abre quando ele
  se mexe.

- **Conexões no corpo:** articulações de cota de malha em ombros, cotovelos,
  pulsos, quadris, joelhos e tornozelos; mangas e saia de malha por baixo das
  placas; correias com fivelas nos braços, coxas e grevas; correias ligando
  espaldares, escarcelas e bainha.
- **Armadura:** couraça com quilha, bordas e cruz de latão no peito, besagews
  nas axilas, espaldares em lâminas com borda de latão, faldas, escarcelas,
  rebites, manoplas com dedos articulados, escarpes em lâminas com esporas.
- **Capa:** lã verde com forro escuro, gola dobrada, barra e laterais bordadas,
  cruz bordada nas costas, broches e corrente no peito.
- **Escudo e espada:** escudo curvo com aro de aço, rebites e correias no verso;
  espada com sulco na lâmina, anéis no cabo e bainha presa ao cinto. A guarda
  da espada fica na vertical, alinhada com a mão, parada e durante o golpe.
  Pegada: o cabo passa por dentro dos dedos fechados, a guarda encosta logo
  depois do indicador (lado do polegar), o gume fica alinhado com os nós dos
  dedos e o resto do cabo e o pomo saem pelo lado do mindinho; parado e
  andando, a lâmina aponta à frente e um pouco para baixo.

**Animação de caminhada** (`animacoes.js`, ciclo de 1,2 s em loop), baseada
no relatório de referência sobre o caminhar do cavaleiro de espada e escudo:
passo de cerca de 0,48 m, um pouco curto por causa do peso nas pernas, 60% do
ciclo com o pé no chão; o quadril desce logo após o contato, sobe na passagem e
vai para o lado do pé de apoio; quadril e tronco giram pouco e em sentidos
opostos; escudo carregado à frente na altura da cintura e espada baixa com
balanço curto e atrasado; a capa segue o tronco com atraso. O ciclo é feito no
lugar (os pés deslizam para trás no apoio), e o visualizador o mostra assim,
sem deslocar o personagem; numa engine, mover a raiz a 0,81 m/s deixa os pés
parados no chão enquanto apoiam.

**Animação de ataque** (`animacoes.js`, 2,4 s em loop): corte horizontal de
direita com a espada, que varre da direita para a esquerda do cavaleiro (na
tela, de quem olha de frente, vai da esquerda para a direita).
O corpo todo participa: guarda, recuo com o tronco torcido (cerca de 65° entre
bacia e tronco), passo à frente com o pé esquerdo, giro do quadril e do tronco
no golpe, acompanhamento e volta à guarda. Pernas e braços usam cinemática
inversa de dois ossos, então os pés ficam no chão e as mãos seguem a trajetória.
A cabeça compensa o giro para manter o olhar no alvo, o escudo abre caminho
para a lâmina e a capa acompanha o tronco com atraso.

**Animação de defesa** (`animacoes.js`, 3,2 s em loop): só o bloqueio, sem
contra-ataque, com o corpo e as pernas trabalhando. Baseada em referências do
movimento real com escudo e de jogos:

- o cavaleiro se põe de lado para o golpe: ombro do escudo à frente, ombro da
  espada para trás;
- as pernas montam a base: o pé do escudo gira para apontar ao oponente, o pé
  da espada dá um passo para trás e para fora e fica virado de lado; base
  larga, joelhos dobrados (apontando para onde os pés apontam) e quadril baixo;
- escudo afastado do corpo, quase em pé, borda na altura do queixo; espada
  armada junto à cabeça, ponta para a frente;
- defesa ativa: o escudo vai ao encontro do golpe pouco antes do impacto;
- no impacto, uma pausa curta; o escudo cede e gira para desviar, o peso vai
  para a perna de trás (que dobra e segura), o pé da frente escorrega um pouco,
  o tronco recua e a cabeça se encolhe; a recuperação é mais lenta;
- guarda sustentada com respiração leve e, no fim, o pé de trás volta.

Os dois `.glb` trazem as animações gravadas como clipes `Caminhada` (no
lugar, para a engine aplicar o deslocamento), `Ataque` e `Defesa`
(30 quadros por segundo, 15 articulações). Nos arquivos a capa vai presa ao tronco, sem o
atraso do tecido que o visualizador simula.

Cerca de 11.000 triângulos (237 peças), sombreamento chapado (flat) e paleta
sóbria de 14 cores dessaturadas. Cada material tem uma textura simples de
64×64 gerada por código, em tons de cinza que multiplicam a cor: aço escovado
com riscos, anéis de cota de malha, lã em sarja, couro, veio de madeira,
pintura gasta, fios de cabelo e ponto de bordado. As UVs são de mapeamento em
caixa (uma repetição a cada 0,2 m), e as texturas vão embutidas nos `.glb`.

No visualizador o personagem aparece em estilo pixel art: sombreamento de desenho
(toon) em 3 tons, contorno escuro por casco invertido e renderização em baixa
resolução ampliada sem suavizar, com borda de 1 pixel na silhueta. O tamanho do
pixel é ajustável (2 a 10 px).

| Arquivo | Uso |
| --- | --- |
| `cavaleiro.glb` | Modelo com os clipes de animação `Caminhada`, `Ataque` e `Defesa`, para Blender, Unity, Godot, Unreal ou three.js |
| `cavaleiro_contorno.glb` | Mesmo modelo com o contorno embutido (malhas `*_Contorno`, material sem iluminação) |
| `cavaleiro.obj` + `cavaleiro.mtl` | Mesmo modelo em OBJ (pose parada, sem animação), um material por cor |
| `knight.js` | Gerador do modelo em three.js: `buildKnight` (cores em `PALETTE`, `{ toon: true }` para cel shading) e `addOutline` |
| `animacoes.js` | Clipes `CAMINHADA`, `ATAQUE` e `DEFESA` e o motor que os toca: chaves da pose, IK de pernas e braços, capa com atraso e `bake()` para glTF |
| `index.html` | Visualizador 3D (abrir por um servidor local, ex. `npx serve .`) |
| `exportar.mjs` | Regera os GLB e o OBJ: `npm install three@0.160.0 && node exportar.mjs` |

O modelo tem 1,8 unidade de altura, pés em y = 0 e está virado para +Z.

O filtro de pixel art é um efeito de renderização: ele existe no visualizador e não
fica gravado nos arquivos. Numa engine, use renderização em baixa resolução com
filtro *nearest* e um material toon para obter o mesmo visual.
