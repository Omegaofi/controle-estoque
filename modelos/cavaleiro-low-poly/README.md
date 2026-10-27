# Cavaleiro low poly

Cavaleiro sem elmo, com capa verde, escudo no braço direito e espada na mão esquerda.
Cerca de 1.000 triângulos, sombreamento chapado (flat) e 12 cores sólidas, sem textura de imagem.

| Arquivo | Uso |
| --- | --- |
| `cavaleiro.glb` | Modelo pronto para Blender, Unity, Godot, Unreal ou three.js |
| `cavaleiro.obj` + `cavaleiro.mtl` | Mesmo modelo em OBJ, um material por cor |
| `knight.js` | Gerador do modelo em three.js (cores em `PALETTE`) |
| `index.html` | Visualizador 3D (abrir por um servidor local, ex. `npx serve .`) |
| `exportar.mjs` | Regera o GLB e o OBJ: `npm install three@0.160.0 && node exportar.mjs` |

O modelo tem 1,8 unidade de altura, pés em y = 0 e está virado para +Z.
