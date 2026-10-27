# Cavaleiro low poly

Cavaleiro low poly realista: sem elmo e sem rosto (só os olhos), com capa verde,
escudo no braço direito e espada longa na mão esquerda. Proporções humanas
(1,80 m, cerca de 8 cabeças), em pose natural com o peso na perna esquerda.

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
  espada com sulco na lâmina, anéis no cabo e bainha presa ao cinto.

Cerca de 11.000 triângulos (237 peças), sombreamento chapado (flat) e 15 cores sólidas, sem textura de imagem.

No visualizador o personagem aparece em estilo pixel art: sombreamento de desenho
(toon) em 3 tons, contorno escuro por casco invertido e renderização em baixa
resolução ampliada sem suavizar, com borda de 1 pixel na silhueta. O tamanho do
pixel é ajustável (2 a 10 px).

| Arquivo | Uso |
| --- | --- |
| `cavaleiro.glb` | Modelo pronto para Blender, Unity, Godot, Unreal ou three.js |
| `cavaleiro_contorno.glb` | Mesmo modelo com o contorno embutido (malhas `*_Contorno`, material sem iluminação) |
| `cavaleiro.obj` + `cavaleiro.mtl` | Mesmo modelo em OBJ, um material por cor |
| `knight.js` | Gerador do modelo em three.js: `buildKnight` (cores em `PALETTE`, `{ toon: true }` para cel shading) e `addOutline` |
| `index.html` | Visualizador 3D (abrir por um servidor local, ex. `npx serve .`) |
| `exportar.mjs` | Regera os GLB e o OBJ: `npm install three@0.160.0 && node exportar.mjs` |

O modelo tem 1,8 unidade de altura, pés em y = 0 e está virado para +Z.

O filtro de pixel art é um efeito de renderização: ele existe no visualizador e não
fica gravado nos arquivos. Numa engine, use renderização em baixa resolução com
filtro *nearest* e um material toon para obter o mesmo visual.
