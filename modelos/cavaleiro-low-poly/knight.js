// Cavaleiro low poly realista: sem elmo e sem rosto (só os olhos), capa verde,
// espada na mão direita e escudo no braço esquerdo. Cores sóbrias com textura
// simples gerada por código (metal escovado, malha, lã, couro, madeira). Proporções humanas (1,80 m, ~8 cabeças), armadura de
// placas sobre cota de malha, com articulações, correias e rebites ligando as peças.
// Recebe o módulo THREE e devolve um THREE.Group com pés em y = 0, olhando para +Z.
// Cores chapadas, sem textura de imagem.

export const PALETTE = {
  pele: 0xae8a77,
  cabelo: 0x3a2b20,
  aco: 0x80868d,
  acoEscuro: 0x50555b,
  malha: 0x42464b,
  capa: 0x37493b,
  capaInterna: 0x27332a,
  couro: 0x4a3a2e,
  latao: 0x8a7752,
  madeira: 0x5a4838,
  escudoFace: 0xa7a18e,
  lamina: 0xa2a8ad,
  olho: 0x1f1915,
  rosto: 0xffffff,
  bordado: 0x7b6d4d,
};

// Rampa de 3 tons para o sombreamento de desenho (cel shading).
export function toonRamp(THREE, steps = [92, 168, 238]) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

// ---------- Geometria ----------

// Une anéis de pontos (mesma quantidade em cada um) numa malha.
// Os anéis seguem a ordem do eixo do "tubo"; dentro do anel, os pontos giram
// da frente (+z) para +x, o que deixa as faces viradas para fora.
function loftPoints(THREE, rings, { closed = true, capStart = false, capEnd = false } = {}) {
  const n = rings[0].length;
  const pos = [];
  const idx = [];
  for (const ring of rings) for (const p of ring) pos.push(...p);
  const cols = closed ? n : n - 1;
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * n + i, b = j * n + ((i + 1) % n), c = (j + 1) * n + i, d = (j + 1) * n + ((i + 1) % n);
      idx.push(a, b, d, a, d, c);
    }
  }
  const cap = (ring, base, flip) => {
    const c = [0, 0, 0];
    for (const p of ring) { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; }
    const ci = pos.length / 3;
    pos.push(...c);
    for (let i = 0; i < n; i++) {
      const a = base + i, b = base + ((i + 1) % n);
      flip ? idx.push(ci, b, a) : idx.push(ci, a, b);
    }
  };
  if (capStart) cap(rings[0], 0, true);
  if (capEnd) cap(rings[rings.length - 1], (rings.length - 1) * n, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Anel elíptico: w = meia largura, f = profundidade da frente, b = das costas,
// k = quilha (aresta central da couraça), p = expoente (>2 fica mais quadrado).
function ellipseRing({ y, w, f, b = f, x = 0, z = 0, k = 0, p = 2 }, seg) {
  const ring = [];
  const e = 2 / p;
  for (let i = 0; i < seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    const s = Math.sin(t), c = Math.cos(t);
    const sx = Math.sign(s) * Math.abs(s) ** e;
    const cz = Math.sign(c) * Math.abs(c) ** e;
    const ridge = c > 0 ? k * c ** 8 : 0;
    ring.push([x + sx * w, y, z + cz * (c >= 0 ? f : b) + ridge]);
  }
  return ring;
}

// Tubo a partir de perfis elípticos ordenados por y (de baixo para cima).
function loft(THREE, profile, seg = 10, opts = { capStart: true, capEnd: true }) {
  const sorted = [...profile].sort((a, b) => a.y - b.y);
  return loftPoints(THREE, sorted.map(r => ellipseRing(r, seg)), opts);
}

// Formato do crânio: mandíbula mais estreita, nuca cheia, rosto achatado.
const gauss = (v, c, w) => Math.exp(-(((v - c) / w) ** 2));
function headPoint(nx, ny, nz, k = 1) {
  let x = nx, y = ny, z = nz;
  // Relevo do rosto (só na frente): arco das sobrancelhas, órbitas dos olhos,
  // maçãs do rosto e queixo. Sem boca.
  const front = Math.min(1, Math.max(0, (nz - 0.55) / 0.3));
  const ax = Math.abs(nx);
  z += front * (
    0.05 * gauss(ny, 0.3, 0.09) * gauss(ax, 0.3, 0.22)
    - 0.06 * gauss(ny, 0.13, 0.08) * gauss(ax, 0.32, 0.12)
    + 0.06 * gauss(ny, -0.82, 0.1) * gauss(nx, 0, 0.25));
  const cheek = 1 + 0.045 * gauss(ny, -0.05, 0.15) * gauss(ax, 0.62, 0.16);
  x *= cheek;
  z *= 1 + 0.02 * gauss(ny, -0.05, 0.15) * gauss(ax, 0.62, 0.16);
  if (y < 0) {
    const t = -y;
    x *= 1 - 0.34 * t * t;
    z *= z > 0 ? 1 - 0.08 * t : 1 - 0.5 * t;
  }
  if (y > -0.25 && z < 0) z *= 1.12;
  if (z > 0.72) z = 0.72 + (z - 0.72) * 0.55;
  return [x * 0.076 * k, y * 0.118 * k, z * 0.1 * k];
}

// Recorta uma "casca" da esfera da cabeça (cabelo, barba) pelos triângulos
// cujo centro passa no teste, e aplica o mesmo formato de crânio. k (escala da
// casca) pode ser um número ou uma função da direção na esfera.
function headShell(THREE, k, keep, wSeg = 16, hSeg = 12, { faceUV = false } = {}) {
  const src = new THREE.SphereGeometry(1, wSeg, hSeg).toNonIndexed();
  const p = src.attributes.position;
  const out = [];
  const uv = [];
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    if (!keep(cx, cy, cz)) continue;
    for (let j = 0; j < 3; j++) {
      const x = p.getX(i + j), y = p.getY(i + j), z = p.getZ(i + j);
      const q = headPoint(x, y, z, typeof k === 'function' ? k(x, y, z) : k);
      out.push(...q);
      // Rosto: projeção de frente sobre a textura do rosto; o resto da cabeça
      // (triângulos virados para os lados e para trás) usa um canto só de pele.
      if (faceUV) uv.push(...(cz < 0.3 ? [0.03, 0.97] : [0.5 + q[0] / 0.16, 0.5 + q[1] / 0.25]));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  if (faceUV) {
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.userData.customUV = true;
  }
  g.computeVertexNormals();
  return g;
}

// Malha livre com as faces viradas para fora de um ponto interno.
function polyGeoOut(THREE, verts, faces, inside) {
  const c = new THREE.Vector3(...inside), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  const fixed = faces.map(([i, j, k]) => {
    a.set(...verts[i]); b.set(...verts[j]); d.set(...verts[k]);
    const n = new THREE.Vector3().subVectors(d, b).cross(new THREE.Vector3().subVectors(a, b));
    const m = a.clone().add(b).add(d).divideScalar(3).sub(c);
    return n.dot(m) < 0 ? [i, k, j] : [i, j, k];
  });
  return polyGeo(THREE, verts, fixed);
}

// Malha livre a partir de vértices e triângulos.
function polyGeo(THREE, verts, faces) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts.flat(), 3));
  g.setIndex(faces.flat());
  g.computeVertexNormals();
  return g;
}

// ---------- Texturas ----------
// Texturas pequenas (64×64) em tons de cinza que multiplicam a cor do material:
// a cor continua vindo da paleta e a textura só dá o "grão" de cada superfície.
// Repetem a cada 0,2 m (ver boxUV).
const TEX = 64;
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Ruído de valor que fecha nas bordas (a textura repete sem emenda).
function valueNoise(seed, cells) {
  const r = rng(seed);
  const g = Array.from({ length: cells * cells }, r);
  const at = (i, j) => g[((j % cells) + cells) % cells * cells + (((i % cells) + cells) % cells)];
  return (x, y) => {
    const fx = (x / TEX) * cells, fy = (y / TEX) * cells;
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * su;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * su;
    return a + (b - a) * sv;
  };
}
const PATTERNS = {
  metal(seed) {
    const r = rng(seed), n = valueNoise(seed, 8), streak = valueNoise(seed + 1, 32);
    const scratches = Array.from({ length: 7 }, () => [r() * TEX, r() * TEX, 4 + r() * 8]);
    return (x, y) => {
      let v = 0.9 + 0.06 * n(x, y) + 0.05 * (streak(x * 0.15, y) - 0.5);
      for (const [sx, sy, len] of scratches) {
        const dx = (x - sx + TEX) % TEX, dy = (y - sy + TEX) % TEX;
        if (dx < len && Math.abs(dy - dx * 0.4) < 0.6) v -= 0.12;
      }
      return v;
    };
  },
  malha(seed) {
    const n = valueNoise(seed, 8);
    return (x, y) => {
      const row = Math.floor(y / 4);
      const cx = ((x + (row % 2) * 2) % 4) - 1.5, cy = (y % 4) - 1.5;
      const d = Math.hypot(cx, cy);
      return (d > 0.9 && d < 2.0 ? 1.0 : 0.6) - 0.08 * n(x, y);
    };
  },
  la(seed) {
    const n = valueNoise(seed, 16);
    return (x, y) => 0.9 + ((x + y) % 4 < 2 ? 0.05 : -0.04) + 0.06 * (n(x, y) - 0.5);
  },
  couro(seed) {
    const n = valueNoise(seed, 6), m = valueNoise(seed + 3, 32);
    return (x, y) => 0.84 + 0.12 * n(x, y) + 0.06 * (m(x, y) - 0.5);
  },
  madeira(seed) {
    const n = valueNoise(seed, 4);
    return (x, y) => 0.86 + 0.1 * Math.sin(x * 0.8 + n(x, y) * 9) + 0.03 * n(y, x);
  },
  pintura(seed) {
    const n = valueNoise(seed, 8), chip = valueNoise(seed + 5, 16);
    return (x, y) => (chip(x, y) > 0.82 ? 0.78 : 0.93 + 0.05 * n(x, y));
  },
  cabelo(seed) {
    const n = valueNoise(seed, 32);
    return (x, y) => 0.8 + 0.2 * n(x * 1, y * 0.15);
  },
  bordado(seed) {
    const n = valueNoise(seed, 8);
    return (x, y) => ((x + (Math.floor(y / 3) % 2) * 2) % 4 < 3 && y % 3 !== 0 ? 1.0 : 0.72) - 0.06 * n(x, y);
  },
  fino(seed) {
    const n = valueNoise(seed, 8);
    return (x, y) => 0.94 + 0.06 * n(x, y);
  },
};
const MATERIAL_PATTERN = {
  aco: 'metal', acoEscuro: 'metal', lamina: 'metal', malha: 'malha', capa: 'la', capaInterna: 'la',
  couro: 'couro', madeira: 'madeira', escudoFace: 'pintura', cabelo: 'cabelo', bordado: 'bordado',
  latao: 'fino', pele: 'fino',
};
export function makeTexture(THREE, pattern, seed = 1) {
  const f = PATTERNS[pattern](seed);
  const data = new Uint8Array(TEX * TEX * 4);
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const v = Math.round(255 * Math.min(1, Math.max(0, f(x, y))));
      data.set([v, v, v, 255], (y * TEX + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, TEX, TEX, THREE.RGBAFormat);
  tex.name = pattern;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Textura do rosto (128×128, colorida): pele com variação leve, sombra das
// órbitas, sobrancelhas, sombra sob o nariz, corado nas maçãs e sombra suave da
// barba feita. Sem boca. As coordenadas seguem a projeção de frente usada nas
// UVs do crânio: u = 0,5 + x/0,16 e v = 0,5 + y/0,25 (em metros, no espaço da cabeça).
export function makeFaceTexture(THREE, skin, brow) {
  const S = 128;
  const rgb = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const base = rgb(skin), dark = rgb(brow);
  const blush = [190, 120, 108], stubble = [128, 104, 92];
  const noise = valueNoise(77, 16);
  const data = new Uint8Array(S * S * 4);
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const x = ((px + 0.5) / S - 0.5) * 0.16, y = ((py + 0.5) / S - 0.5) * 0.25;
      const ax = Math.abs(x);
      let c = base.map(v => v * (0.96 + 0.05 * noise((px / S) * 64, (py / S) * 64)));
      // Órbitas: sombra suave em volta dos olhos.
      const socket = ((ax - 0.03) / 0.021) ** 2 + ((y - 0.017) / 0.013) ** 2;
      if (socket < 1) c = c.map(v => v * (1 - 0.13 * (1 - socket)));
      // Sobrancelhas: traço que afina para fora.
      if (ax > 0.011 && ax < 0.052) {
        const t = (ax - 0.011) / 0.041;
        const cy = 0.035 + 0.006 * Math.sin(t * Math.PI) - 0.004 * t;
        const th = 0.0048 * (1 - 0.55 * t);
        if (Math.abs(y - cy) < th) c = mix(c, dark, 0.85);
      }
      // Sombra sob o nariz e entre o nariz e a boca.
      if (ax < 0.016 && Math.abs(y + 0.036) < 0.004) c = c.map(v => v * 0.86);
      // Corado nas maçãs do rosto.
      const ch = Math.hypot(ax - 0.047, y + 0.02) / 0.022;
      if (ch < 1) c = mix(c, blush, 0.14 * (1 - ch));
      // Barba bem feita: sombra leve no queixo e na mandíbula.
      if (y < -0.05) c = mix(c, stubble, 0.1 * Math.min(1, (-0.05 - y) / 0.02));
      data.set([...c.map(v => Math.round(Math.min(255, Math.max(0, v)))), 255], (py * S + px) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.name = 'rosto';
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Mapeamento em caixa: cada triângulo projeta no plano do eixo mais próximo da
// sua normal, em metros (já com a escala da peça), uma repetição a cada 0,2 m.
const UV_TILE = 0.2;
function boxUV(THREE, geometry, scale) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const s = new THREE.Vector3(...scale);
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i).multiply(s);
    b.fromBufferAttribute(p, i + 1).multiply(s);
    c.fromBufferAttribute(p, i + 2).multiply(s);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (const [k, v] of [[0, a], [1, b], [2, c]]) {
      const [u, w] = ax >= ay && ax >= az ? [v.z, v.y] : ay >= az ? [v.x, v.z] : [v.x, v.y];
      uv[(i + k) * 2] = u / UV_TILE;
      uv[(i + k) * 2 + 1] = w / UV_TILE;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Divide a rotação da mão (relativa ao antebraço) em giro em torno do eixo do
// antebraço (y local, feito pelo próprio antebraço, como na pronação e na
// supinação) e o resto (flexão e desvio do pulso). Assim o pulso não torce.
export function splitWristTwist(THREE, q, maxTwist = 1.7) {
  const tw = new THREE.Quaternion(0, q.y, 0, q.w);
  if (tw.lengthSq() < 1e-9) tw.identity(); else tw.normalize();
  let angle = 2 * Math.atan2(tw.y, tw.w);
  if (angle > Math.PI) angle -= 2 * Math.PI;
  if (angle < -Math.PI) angle += 2 * Math.PI;
  angle = Math.max(-maxTwist, Math.min(maxTwist, angle));
  const twist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  const wrist = twist.clone().invert().multiply(q);
  return { twistAngle: angle, wrist };
}

// ---------- Personagem ----------

// options.toon = true usa MeshToonMaterial em faixas; senão MeshStandardMaterial (exportação).
export function buildKnight(THREE, options = {}) {
  const ramp = options.toon ? toonRamp(THREE) : null;
  const shiny = new Set(['aco', 'acoEscuro', 'lamina', 'latao', 'bordado']);
  const mats = {};
  const textures = {};
  let seed = 1;
  for (const [name, pattern] of Object.entries(MATERIAL_PATTERN)) textures[name] = makeTexture(THREE, pattern, seed++);
  textures.rosto = makeFaceTexture(THREE, PALETTE.pele, PALETTE.cabelo);
  for (const [name, color] of Object.entries(PALETTE)) {
    mats[name] = ramp
      ? Object.assign(new THREE.MeshToonMaterial({ name, color, gradientMap: ramp, map: textures[name] ?? null }), { flatShading: true })
      : new THREE.MeshStandardMaterial({
          name,
          color,
          map: textures[name] ?? null,
          flatShading: true,
          roughness: shiny.has(name) ? 0.42 : 0.9,
          metalness: shiny.has(name) ? 0.45 : 0.0,
        });
  }
  // Capa: lã verde por fora, forro mais escuro por dentro (mesma malha, lados opostos).
  mats.capaInterna.side = THREE.BackSide;
  mats.bordado.side = THREE.DoubleSide;

  const knight = new THREE.Group();
  knight.name = 'Cavaleiro';

  // Geometrias compartilhadas (rebites, capa e forro) ganham UV uma vez só.
  const uvCache = new Map();
  function mesh(name, geometry, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], opts = {}) {
    if (!uvCache.has(geometry)) uvCache.set(geometry, geometry.userData.customUV ? geometry : boxUV(THREE, geometry, scale));
    const m = new THREE.Mesh(uvCache.get(geometry), mats[mat]);
    m.name = name;
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...scale);
    m.castShadow = opts.castShadow ?? true;
    m.receiveShadow = opts.receiveShadow ?? true;
    if (opts.noOutline) m.userData.noOutline = true;
    parent.add(m);
    return m;
  }
  const detail = { castShadow: false, noOutline: true };

  function group(name, parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(...pos);
    g.rotation.set(...rot);
    parent.add(g);
    return g;
  }

  // Prende um objeto ao pai mantendo uma posição/orientação dada no mundo.
  function attachWorld(child, parent, worldPos, worldQuat) {
    knight.updateMatrixWorld(true);
    const m = new THREE.Matrix4().compose(worldPos, worldQuat, new THREE.Vector3(1, 1, 1));
    m.premultiply(parent.matrixWorld.clone().invert());
    m.decompose(child.position, child.quaternion, child.scale);
    parent.add(child);
  }

  const rivetGeo = new THREE.IcosahedronGeometry(0.0055, 0);
  const rivet = (parent, x, y, z, s = 1) => mesh('Rebite', rivetGeo, 'latao', parent, [x, y, z], [0, 0, 0], [s, s, s], detail);
  // Ponto na superfície de um anel elíptico (ângulo t a partir da frente, girando para +x).
  const onRing = (w, f, b, t, out = 0.003) => {
    const c = Math.cos(t);
    return [Math.sin(t) * (w + out), Math.cos(t) * ((c >= 0 ? f : b) + out)];
  };
  // Correia de couro em volta de um membro, com fivela do lado de fora.
  function strap(name, parent, y, w, f, b, side) {
    mesh(name, loft(THREE, [
      { y: y - 0.008, w: w + 0.004, f: f + 0.004, b: b + 0.004 },
      { y: y + 0.008, w: w + 0.004, f: f + 0.004, b: b + 0.004 },
    ], 12, { capStart: false, capEnd: false }), 'couro', parent, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
    mesh(`${name}Fivela`, new THREE.BoxGeometry(0.006, 0.02, 0.016), 'latao', parent, [side * (w + 0.008), y, 0], [0, 0, 0], [1, 1, 1], detail);
  }
  // Articulação de cota de malha: o "recheio" que liga uma placa à outra.
  const joint = (name, parent, r, pos = [0, 0, 0], scale = [1, 1, 1]) =>
    mesh(name, new THREE.SphereGeometry(r, 10, 7), 'malha', parent, pos, [0, 0, 0], scale);

  // ---------- Pernas (peso na perna esquerda, direita relaxada) ----------
  const legs = {};
  const legPose = {
    1: { hip: [0, 0, 0.03], knee: [0.02, 0, 0], yaw: 0.16 },
    [-1]: { hip: [-0.1, 0, -0.05], knee: [0.17, 0, 0], yaw: -0.2 },
  };
  for (const side of [1, -1]) {
    const L = side === 1 ? 'Esquerda' : 'Direita';
    const pose = legPose[side];
    const hip = group(`Quadril${L}`, knight, [0.095 * side, 0.93, 0], pose.hip);
    joint(`ArticulacaoQuadril${L}`, hip, 0.082, [0, 0.0, 0]);
    // Coxote: coxa cheia em cima, afinando até o joelho.
    const thigh = [
      { y: 0.0, w: 0.088, f: 0.088, b: 0.085 },
      { y: -0.06, w: 0.09, f: 0.095, b: 0.088 },
      { y: -0.15, w: 0.086, f: 0.09, b: 0.08 },
      { y: -0.26, w: 0.073, f: 0.077, b: 0.068 },
      { y: -0.35, w: 0.061, f: 0.064, b: 0.058 },
      { y: -0.4, w: 0.056, f: 0.058, b: 0.054 },
    ];
    mesh(`Coxote${L}`, loft(THREE, thigh, 12), 'aco', hip);
    mesh(`BordaCoxote${L}`, loft(THREE, [
      { y: -0.012, w: 0.092, f: 0.092, b: 0.089 },
      { y: 0.006, w: 0.091, f: 0.091, b: 0.088 },
    ], 12, { capStart: false, capEnd: false }), 'acoEscuro', hip);
    strap(`CorreiaCoxa${L}`, hip, -0.2, 0.08, 0.084, 0.074, side);
    for (const t of [-0.7, 0, 0.7]) {
      const [x, z] = onRing(0.091, 0.091, 0.088, t);
      rivet(hip, x, -0.003, z);
    }

    const knee = group(`Joelho${L}`, hip, [0, -0.42, 0], pose.knee);
    joint(`ArticulacaoJoelho${L}`, knee, 0.054, [0, 0, -0.005]);
    mesh(`Joelheira${L}`, new THREE.IcosahedronGeometry(1, 1), 'aco', knee, [0, 0, 0.042], [0, 0, 0], [0.054, 0.06, 0.042]);
    mesh(`AbaJoelho${L}`, new THREE.IcosahedronGeometry(1, 0), 'acoEscuro', knee, [0.053 * side, 0, 0.012], [0, 0, 0], [0.012, 0.048, 0.04]);
    rivet(knee, 0, 0, 0.086, 1.2);
    // Greva: canela reta na frente, panturrilha marcada atrás.
    mesh(`Greva${L}`, loft(THREE, [
      { y: -0.02, w: 0.052, f: 0.056, b: 0.056, k: 0.004 },
      { y: -0.08, w: 0.056, f: 0.057, b: 0.072, k: 0.006 },
      { y: -0.14, w: 0.058, f: 0.055, b: 0.08, k: 0.006 },
      { y: -0.24, w: 0.05, f: 0.05, b: 0.063, k: 0.005 },
      { y: -0.33, w: 0.04, f: 0.043, b: 0.045, k: 0.003 },
      { y: -0.4, w: 0.038, f: 0.041, b: 0.042 },
    ], 12), 'aco', knee);
    mesh(`BordaGreva${L}`, loft(THREE, [
      { y: -0.03, w: 0.055, f: 0.06, b: 0.059 },
      { y: -0.012, w: 0.054, f: 0.059, b: 0.058 },
    ], 12, { capStart: false, capEnd: false }), 'acoEscuro', knee);
    strap(`CorreiaGreva${L}`, knee, -0.3, 0.043, 0.046, 0.05, side);
    for (const y of [-0.08, -0.22]) {
      rivet(knee, 0.059 * side, y, 0.0);
      rivet(knee, -0.059 * side, y, 0.0);
    }
    joint(`ArticulacaoTornozelo${L}`, knee, 0.038, [0, -0.4, 0]);

    // Escarpe (pé de placas) no chão, abaixo do tornozelo, com a ponta um pouco para fora.
    knight.updateMatrixWorld(true);
    const ankle = knee.localToWorld(new THREE.Vector3(0, -0.4, 0));
    const foot = group(`Pe${L}`, knight, [ankle.x, 0.024, ankle.z]);
    foot.rotation.set(Math.PI / 2, pose.yaw, 0, 'YXZ');
    legs[side] = { hip, knee, foot, ankleY: ankle.y, thigh: 0.42, shin: 0.4 };
    const sab = [
      { y: -0.065, w: 0.04, f: 0.024, b: 0.05 },
      { y: -0.01, w: 0.046, f: 0.024, b: 0.085 },
      { y: 0.05, w: 0.048, f: 0.024, b: 0.07 },
      { y: 0.12, w: 0.045, f: 0.024, b: 0.045 },
      { y: 0.18, w: 0.032, f: 0.022, b: 0.025 },
      { y: 0.215, w: 0.012, f: 0.016, b: 0.012 },
    ];
    mesh(`Escarpe${L}`, loft(THREE, sab, 10), 'acoEscuro', foot);
    // Linhas das lâminas do escarpe (a face de cima é o lado -z local).
    for (const [y, w, b] of [[0.035, 0.049, 0.076], [0.085, 0.048, 0.058], [0.135, 0.043, 0.04]]) {
      mesh(`LaminaPe${L}`, new THREE.BoxGeometry(w * 1.7, 0.005, 0.006), 'aco', foot, [0, y, -b - 0.001], [0, 0, 0], [1, 1, 1], detail);
    }
    // Espora de latão no calcanhar.
    mesh(`Espora${L}`, new THREE.CylinderGeometry(0.004, 0.004, 0.04, 4), 'latao', foot, [0, -0.085, -0.04], [0, 0, 0], [1, 1, 1], detail);
    mesh(`Roseta${L}`, new THREE.CylinderGeometry(0.012, 0.012, 0.003, 6), 'latao', foot, [0, -0.107, -0.04], [0, 0, Math.PI / 2], [1, 1, 1], detail);
  }

  // ---------- Quadril: cota de malha, faldas, escarcelas, cinto ----------
  mesh('Pelve', loft(THREE, [
    { y: 0.82, w: 0.15, f: 0.1, b: 0.11 },
    { y: 1.0, w: 0.15, f: 0.1, b: 0.1 },
  ], 12), 'malha', knight);
  mesh('SaiaMalha', loft(THREE, [
    { y: 0.92, w: 0.168, f: 0.114, b: 0.112 },
    { y: 0.84, w: 0.18, f: 0.122, b: 0.124 },
    { y: 0.76, w: 0.19, f: 0.128, b: 0.132 },
    { y: 0.72, w: 0.192, f: 0.13, b: 0.134 },
  ], 16, { capStart: false, capEnd: false }), 'malha', knight);
  const faulds = [[1.0, 0.95, 0.155, 0.168], [0.96, 0.905, 0.165, 0.178], [0.92, 0.86, 0.174, 0.188]];
  faulds.forEach(([y0, y1, w0, w1], i) => {
    mesh(`Falda${i + 1}`, loft(THREE, [
      { y: y0, w: w0, f: w0 * 0.68, b: w0 * 0.64 },
      { y: y1, w: w1, f: w1 * 0.7, b: w1 * 0.66 },
    ], 16, { capStart: false, capEnd: false }), 'aco', knight);
    const w = (w0 + w1) / 2, y = (y0 + y1) / 2;
    for (const t of [-1.5, -0.9, 0.9, 1.5]) {
      const [x, z] = onRing(w, w * 0.69, w * 0.65, t, 0.002);
      rivet(knight, x, y, z);
    }
  });
  // Escarcelas: duas lâminas sobre cada coxa, presas por correias à última falda.
  for (const side of [1, -1]) {
    const S = side === 1 ? 'Esquerda' : 'Direita';
    const tasset = group(`Escarcela${S}`, knight, [0.085 * side, 0.86, 0.123], [-0.1, 0.3 * side, 0]);
    mesh(`EscarcelaLamina${S}1`, new THREE.BoxGeometry(0.13, 0.07, 0.012), 'aco', tasset, [0, -0.035, 0]);
    mesh(`EscarcelaLamina${S}2`, new THREE.BoxGeometry(0.125, 0.07, 0.012), 'aco', tasset, [0, -0.095, 0.006], [-0.06, 0, 0]);
    mesh(`EscarcelaBorda${S}`, new THREE.BoxGeometry(0.127, 0.008, 0.014), 'latao', tasset, [0, -0.128, 0.008], [-0.06, 0, 0], [1, 1, 1], detail);
    mesh(`EscarcelaCorreia${S}`, new THREE.BoxGeometry(0.018, 0.035, 0.016), 'couro', tasset, [0, 0.005, 0.002], [0, 0, 0], [1, 1, 1], detail);
    rivet(tasset, -0.045, -0.03, 0.008);
    rivet(tasset, 0.045, -0.03, 0.008);
  }
  mesh('Cinto', loft(THREE, [
    { y: 0.95, w: 0.172, f: 0.12, b: 0.112 },
    { y: 0.985, w: 0.168, f: 0.117, b: 0.109 },
  ], 16, { capStart: false, capEnd: false }), 'couro', knight);
  mesh('Fivela', new THREE.BoxGeometry(0.04, 0.034, 0.012), 'latao', knight, [0, 0.968, 0.124], [0, 0, 0], [1, 1, 1], detail);
  mesh('PontaCinto', new THREE.BoxGeometry(0.024, 0.05, 0.006), 'couro', knight, [0.03, 0.948, 0.125], [0, 0, 0.15], [1, 1, 1], detail);

  // ---------- Couraça ----------
  mesh('Couraca', loft(THREE, [
    { y: 0.975, w: 0.152, f: 0.1, b: 0.094, k: 0.004, p: 2.3 },
    { y: 1.03, w: 0.146, f: 0.1, b: 0.09, k: 0.006, p: 2.3 },
    { y: 1.09, w: 0.142, f: 0.106, b: 0.09, k: 0.008, p: 2.3 },
    { y: 1.17, w: 0.156, f: 0.122, b: 0.094, k: 0.012, p: 2.3 },
    { y: 1.25, w: 0.17, f: 0.132, b: 0.098, k: 0.014, p: 2.4 },
    { y: 1.32, w: 0.178, f: 0.134, b: 0.1, k: 0.014, p: 2.4 },
    { y: 1.39, w: 0.182, f: 0.124, b: 0.1, k: 0.01, p: 2.5 },
    { y: 1.44, w: 0.17, f: 0.1, b: 0.094, p: 2.4 },
    { y: 1.475, w: 0.135, f: 0.078, b: 0.08 },
    { y: 1.5, w: 0.085, f: 0.066, b: 0.068 },
  ], 16), 'aco', knight);
  mesh('BordaCouraca', loft(THREE, [
    { y: 0.972, w: 0.156, f: 0.104, b: 0.098, k: 0.004, p: 2.3 },
    { y: 0.99, w: 0.154, f: 0.104, b: 0.096, k: 0.005, p: 2.3 },
  ], 16, { capStart: false, capEnd: false }), 'acoEscuro', knight);
  // Cruz de latão no peito e rebites das dobradiças laterais.
  mesh('CruzPeitoV', new THREE.BoxGeometry(0.016, 0.11, 0.008), 'latao', knight, [0, 1.285, 0.146], [-0.06, 0, 0], [1, 1, 1], detail);
  mesh('CruzPeitoH', new THREE.BoxGeometry(0.07, 0.016, 0.008), 'latao', knight, [0, 1.305, 0.144], [-0.06, 0, 0], [1, 1, 1], detail);
  for (const [y, w] of [[1.1, 0.143], [1.2, 0.161], [1.3, 0.176]]) {
    rivet(knight, w + 0.002, y, 0);
    rivet(knight, -w - 0.002, y, 0);
  }
  // Besagews: discos que protegem a axila, presos na frente do ombro.
  for (const side of [1, -1]) {
    const dir = new THREE.Vector3(0.55 * side, 0.05, 0.83).normalize();
    const disc = new THREE.Group();
    disc.name = `Besagew${side === 1 ? 'Esquerdo' : 'Direito'}`;
    mesh('BesagewDisco', new THREE.CylinderGeometry(0.038, 0.038, 0.006, 10), 'aco', disc);
    mesh('BesagewBorda', new THREE.CylinderGeometry(0.041, 0.041, 0.004, 10), 'latao', disc, [0, -0.002, 0], [0, 0, 0], [1, 1, 1], detail);
    rivet(disc, 0, 0.005, 0, 1.4);
    disc.position.set(0.172 * side, 1.37, 0.072);
    disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    knight.add(disc);
  }
  mesh('Gorjal', loft(THREE, [
    { y: 1.455, w: 0.12, f: 0.1, b: 0.092 },
    { y: 1.495, w: 0.085, f: 0.074, b: 0.072 },
    { y: 1.545, w: 0.066, f: 0.062, b: 0.062 },
  ], 12, { capStart: false, capEnd: false }), 'acoEscuro', knight);
  mesh('BordaGorjal', loft(THREE, [
    { y: 1.538, w: 0.069, f: 0.065, b: 0.065 },
    { y: 1.552, w: 0.068, f: 0.064, b: 0.064 },
  ], 12, { capStart: false, capEnd: false }), 'latao', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
  rivet(knight, 0.05, 1.475, 0.088);
  rivet(knight, -0.05, 1.475, 0.088);

  // ---------- Cabeça: sem rosto, só os olhos ----------
  mesh('Pescoco', loft(THREE, [
    { y: 1.5, w: 0.052, f: 0.05, b: 0.055 },
    { y: 1.6, w: 0.047, f: 0.045, b: 0.048 },
  ], 10), 'pele', knight, [0, 0, -0.008]);
  // Cabeça um pouco maior (10%), subindo para o queixo não entrar no gorjal.
  const head = group('Cabeca', knight, [0, 1.694, 0.004]);
  head.scale.setScalar(1.1);
  mesh('Cranio', headShell(THREE, 1, () => true, 24, 18, { faceUV: true }), 'rosto', head);
  // Cabelo "old money": testa livre com a linha do cabelo alta e entradas
  // leves nas têmporas; laterais e nuca curtas e afinadas; em cima o volume
  // nasce da linha do cabelo e sobe penteado para trás, com risca do lado
  // esquerdo e um leve topete na frente.
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // Altura da linha do cabelo (na esfera unitária) conforme o ângulo em volta
  // da cabeça: alta na testa, mais alta nas entradas, baixa nas orelhas e nuca.
  const hairline = (x, z) => {
    const a = Math.abs(Math.atan2(x, z));
    if (a < 0.6) return 0.66 + 0.08 * smooth(0.25, 0.6, a);
    if (a < 1.57) return 0.74 + (0.12 - 0.74) * smooth(0.6, 1.4, a);
    return 0.12 + (-0.55 - 0.12) * smooth(1.57, 2.8, a);
  };
  const hairK = (x, y, z) => {
    const above = y - hairline(x, z);
    const grow = smooth(0.0, 0.3, above);                    // nasce rente à pele
    const top = smooth(0.2, 0.75, y);                        // volume só em cima
    const front = 0.75 + 0.35 * Math.max(0, z);              // mais cheio na frente
    const crown = z < 0 ? 1 - 0.5 * smooth(0, -0.9, z) : 1;  // assenta na coroa
    const part = Math.exp(-(((x - 0.4) / 0.07) ** 2)) * smooth(0.3, 0.55, y) * smooth(-0.5, 0.2, z);
    const quiff = smooth(0.5, 0.85, y) * smooth(0.3, 0.8, z) * grow;
    const side = 1 + 0.3 * smooth(0.4, -0.6, x);              // mais cheio do lado oposto à risca
    return 1.03 + grow * (0.21 * top * front * crown * side + 0.09 * quiff) - 0.06 * part;
  };
  mesh('Cabelo', headShell(THREE, hairK, (x, y, z) =>
    y > hairline(x, z) && !(Math.abs(x) > 0.78 && y < 0.22 && z > -0.3), 34, 26), 'cabelo', head);
  // Nariz: dorso, ponta arredondada e asas.
  mesh('Nariz', polyGeoOut(THREE, [
    [0, 0.03, 0.083], [0, 0.0, 0.093], [0, -0.023, 0.104], [-0.0165, -0.031, 0.085], [0.0165, -0.031, 0.085],
    [0, -0.034, 0.092], [-0.0105, 0.004, 0.085], [0.0105, 0.004, 0.085], [-0.008, -0.026, 0.097], [0.008, -0.026, 0.097],
  ], [
    [0, 6, 1], [0, 1, 7], [6, 8, 1], [1, 8, 2], [1, 2, 9], [1, 9, 7], [6, 3, 8], [7, 9, 4],
    [8, 3, 5], [8, 5, 2], [2, 5, 9], [9, 5, 4],
  ], [0, -0.01, 0.07]), 'pele', head, [0, 0, 0], [0, 0, 0], [1, 1, 1], { noOutline: true });
  for (const side of [1, -1]) {
    const S = side === 1 ? 'Esquerdo' : 'Direito';
    // Olho escuro e discreto, em forma de amêndoa.
    mesh(`Olho${S}`, new THREE.SphereGeometry(1, 8, 5), 'olho', head, [0.03 * side, 0.016, 0.0795], [0, 0.3 * side, 0], [0.0105, 0.0052, 0.004], { noOutline: true });
    mesh(`Orelha${S}`, new THREE.IcosahedronGeometry(1, 0), 'pele', head, [0.077 * side, 0.002, -0.01], [0.15, 0, 0], [0.012, 0.03, 0.02], { noOutline: true });
  }

  // ---------- Braços ----------
  // side = -1 é o lado direito do cavaleiro (esquerda de quem olha de frente).
  function arm(side, shoulderRot, elbowRot, wristRot) {
    const L = side === 1 ? 'Esquerdo' : 'Direito';
    const shoulder = group(`Ombro${L}`, knight, [0.205 * side, 1.44, -0.005], shoulderRot);
    joint(`ArticulacaoOmbro${L}`, shoulder, 0.06, [-0.01 * side, -0.01, 0]);
    // Manga de cota de malha por baixo das placas.
    mesh(`MangaMalha${L}`, loft(THREE, [
      { y: -0.02, w: 0.052, f: 0.052 },
      { y: -0.28, w: 0.044, f: 0.044 },
    ], 10), 'malha', shoulder);
    // Espaldar: cúpula com crista e borda enrolada, friso de latão, placa alta
    // junto ao pescoço, quatro lâminas rebitadas e borda de latão na última.
    // Fica preso ao tronco (afivelado na couraça), não ao braço: a cúpula segue
    // só uma parte do giro do ombro e as lâminas de baixo um pouco mais. Parado,
    // encosta na couraça; o vão só abre quando o braço se mexe.
    const platesCupula = group(`OmbroPlacas${L}`, knight, [0.205 * side, 1.44, -0.005]);
    const platesLaminas = group(`OmbroLaminas${L}`, knight, [0.205 * side, 1.44, -0.005]);
    const plates = [{ obj: platesCupula, w: 0.3 }, { obj: platesLaminas, w: 0.75 }];
    for (const pl of plates) pl.obj.quaternion.identity().slerp(shoulder.quaternion, pl.w);
    const pauldron = group(`Espaldar${L}`, platesCupula, [0.01 * side, 0.008, 0], [0, 0, -0.3 * side]);
    mesh(`EspaldarCupula${L}`, new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 'aco', pauldron,
      [0, 0, 0], [0, 0, 0], [0.105, 0.075, 0.1]);
    // Crista: aresta saliente de frente para trás, seguindo a curva da cúpula.
    mesh(`EspaldarCrista${L}`, new THREE.TorusGeometry(1, 0.06, 4, 12, Math.PI), 'acoEscuro', pauldron,
      [0, 0, 0], [0, Math.PI / 2, 0], [0.1, 0.077, 0.12]);
    // Borda enrolada na base da cúpula.
    mesh(`EspaldarBorda${L}`, new THREE.TorusGeometry(1, 0.06, 4, 18), 'acoEscuro', pauldron,
      [0, 0.002, 0], [Math.PI / 2, 0, 0], [0.106, 0.101, 0.09]);
    // Friso decorativo de latão a meia altura da cúpula.
    mesh(`EspaldarFriso${L}`, new THREE.TorusGeometry(1, 0.035, 3, 18), 'latao', pauldron,
      [0, 0.04, 0], [Math.PI / 2, 0, 0], [0.088, 0.084, 0.12], { castShadow: false, noOutline: true });
    // Rebites ao longo da borda da cúpula.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      rivet(pauldron, Math.sin(a) * 0.098, 0.012, Math.cos(a) * 0.093);
    }
    // Placa alta (haute-piece) junto ao pescoço, com borda de latão.
    mesh(`EspaldarPlacaAlta${L}`, new THREE.BoxGeometry(0.01, 0.045, 0.13), 'aco', pauldron,
      [-0.07 * side, 0.072, 0], [0, 0, 0.18 * side]);
    mesh(`EspaldarPlacaAltaBorda${L}`, new THREE.BoxGeometry(0.013, 0.007, 0.132), 'latao', pauldron,
      [-0.074 * side, 0.095, 0], [0, 0, 0.18 * side], [1, 1, 1], detail);
    // Lâminas abaixo da cúpula, cada uma com rebites na frente e atrás.
    const lames = group(`LaminasOmbro${L}`, platesLaminas, [0.01 * side, 0, 0], [0, 0, -0.25 * side]);
    [[-0.015, -0.045, 0.09, 'acoEscuro'], [-0.04, -0.068, 0.084, 'aco'], [-0.062, -0.088, 0.078, 'acoEscuro'], [-0.082, -0.106, 0.072, 'aco']]
      .forEach(([y0, y1, w, mat], i) => {
        mesh(`LaminaOmbro${L}${i + 1}`, loft(THREE, [
          { y: y0, w, f: w * 0.98 },
          { y: y1, w: w * 1.04, f: w * 1.02 },
        ], 14, { capStart: false, capEnd: false }), mat, lames);
        const ym = (y0 + y1) / 2, wm = w * 1.02 + 0.002;
        for (const t of [0.6, -0.6, Math.PI - 0.6, Math.PI + 0.6]) rivet(lames, Math.sin(t) * wm, ym, Math.cos(t) * wm);
      });
    mesh(`BordaOmbro${L}`, loft(THREE, [
      { y: -0.109, w: 0.076, f: 0.075 },
      { y: -0.101, w: 0.076, f: 0.075 },
    ], 14, { capStart: false, capEnd: false }), 'latao', lames, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
    // Correia que liga o espaldar à couraça.
    mesh(`CorreiaOmbro${L}`, new THREE.BoxGeometry(0.085, 0.005, 0.022), 'couro', platesCupula, [-0.05 * side, 0.062, 0], [0, 0, 0.3 * side], [1, 1, 1], detail);
    mesh(`FivelaOmbro${L}`, new THREE.BoxGeometry(0.016, 0.008, 0.028), 'latao', platesCupula, [-0.07 * side, 0.058, 0], [0, 0, 0.3 * side], [1, 1, 1], detail);
    // Braçal superior com volume de bíceps.
    mesh(`BracalSuperior${L}`, loft(THREE, [
      { y: -0.11, w: 0.051, f: 0.053, b: 0.051 },
      { y: -0.17, w: 0.053, f: 0.058, b: 0.05 },
      { y: -0.22, w: 0.049, f: 0.052, b: 0.047 },
      { y: -0.275, w: 0.043, f: 0.045, b: 0.043 },
    ], 12), 'aco', shoulder);
    strap(`CorreiaBraco${L}`, shoulder, -0.2, 0.05, 0.054, 0.048, side);

    const elbow = group(`Cotovelo${L}`, shoulder, [0, -0.3, 0], elbowRot);
    joint(`ArticulacaoCotovelo${L}`, elbow, 0.046);
    mesh(`Cotoveleira${L}`, new THREE.IcosahedronGeometry(1, 1), 'aco', elbow, [0, 0, -0.01], [0, 0, 0], [0.047, 0.052, 0.05]);
    mesh(`AbaCotovelo${L}`, new THREE.IcosahedronGeometry(1, 0), 'acoEscuro', elbow, [0.043 * side, 0, -0.01], [0, 0, 0], [0.01, 0.042, 0.042]);
    rivet(elbow, 0.053 * side, 0, -0.01, 1.2);
    // Antebraço: mais largo perto do cotovelo, afinando no pulso.
    mesh(`Antebraco${L}`, loft(THREE, [
      { y: -0.03, w: 0.047, f: 0.047, b: 0.046 },
      { y: -0.08, w: 0.049, f: 0.046, b: 0.046 },
      { y: -0.15, w: 0.043, f: 0.04, b: 0.04 },
      { y: -0.23, w: 0.034, f: 0.031, b: 0.031 },
    ], 12), 'aco', elbow);
    strap(`CorreiaAntebraco${L}`, elbow, -0.12, 0.045, 0.042, 0.042, side);
    rivet(elbow, 0.05 * side, -0.06, 0);
    rivet(elbow, -0.05 * side, -0.06, 0);

    const hand = group(`Mao${L}`, elbow, [0, -0.25, 0], wristRot);
    joint(`ArticulacaoPulso${L}`, hand, 0.026, [0, 0.012, 0]);
    mesh(`Manopla${L}`, loft(THREE, [
      { y: 0.01, w: 0.04, f: 0.036 },
      { y: -0.035, w: 0.049, f: 0.041 },
    ], 10, { capStart: false, capEnd: false }), 'acoEscuro', hand);
    mesh(`BordaManopla${L}`, loft(THREE, [
      { y: -0.04, w: 0.05, f: 0.042 },
      { y: -0.032, w: 0.05, f: 0.042 },
    ], 10, { capStart: false, capEnd: false }), 'latao', hand, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
    // Punho fechado: +z local é o dorso da mão (para fora), -z a palma.
    const fist = group(`Punho${L}`, hand, [0, 0, 0], [0, side === 1 ? Math.PI / 2 : -Math.PI / 2, 0]);
    mesh(`Palma${L}`, loft(THREE, [
      { y: -0.005, w: 0.034, f: 0.02, b: 0.019 },
      { y: -0.05, w: 0.04, f: 0.023, b: 0.021 },
      { y: -0.085, w: 0.041, f: 0.024, b: 0.02 },
    ], 8), 'couro', fist);
    mesh(`PlacaDorso${L}`, new THREE.BoxGeometry(0.078, 0.05, 0.008), 'aco', fist, [0, -0.055, 0.024], [0.1, 0, 0]);
    for (let i = 0; i < 4; i++) {
      mesh(`Dedo${L}${i + 1}`, new THREE.BoxGeometry(0.017, 0.03, 0.034), 'couro', fist,
        [-0.028 + i * 0.019, -0.098 + Math.abs(i - 1.5) * 0.003, -0.004], [0.35, 0, 0]);
      mesh(`PlacaDedo${L}${i + 1}`, new THREE.BoxGeometry(0.016, 0.022, 0.006), 'acoEscuro', fist,
        [-0.028 + i * 0.019, -0.094 + Math.abs(i - 1.5) * 0.003, 0.015], [0.35, 0, 0], [1, 1, 1], detail);
    }
    mesh(`Polegar${L}`, new THREE.BoxGeometry(0.018, 0.048, 0.019), 'couro', fist, [-0.042 * side, -0.06, -0.016], [0.2, 0, 0.5 * side]);
    return { shoulder, elbow, hand, fist, plates };
  }

  // Lado da espada: -1 = mão direita. O escudo fica no outro braço.
  const SWORD = -1, SHIELD = -SWORD;
  // Braço da espada caído ao lado; braço do escudo com o antebraço à frente.
  // Braço da espada esticado, levemente à frente e para fora do corpo, para a
  // lâmina apontar para a frente longe do corpo.
  const swordPose = options.swordPose ?? { shoulder: [-0.3, 0, 0.15], elbow: -0.12 };
  const swordArm = arm(SWORD, [swordPose.shoulder[0], swordPose.shoulder[1], swordPose.shoulder[2] * SWORD], [swordPose.elbow, 0, 0], [0, 0, 0]);
  const shieldArm = arm(SHIELD, [-0.32, 0, 0.16 * SHIELD], [-1.12, 0, 0], [0, 0, 0]);
  const left = SWORD === 1 ? swordArm : shieldArm;
  const right = SWORD === 1 ? shieldArm : swordArm;

  // ---------- Escudo (heater) curvo no antebraço do escudo ----------
  const shield = new THREE.Group();
  shield.name = 'Escudo';
  const top = 0.28, tip = -0.38, half = 0.24, curve = 0.055, thick = 0.018;
  const hw = y => (y >= 0.02 ? half : half * Math.max(0.012, (1 - ((0.02 - y) / (0.02 - tip)) ** 1.7)) ** 0.6);
  const zf = x => -curve * (x / half) ** 2;
  const rowsY = [tip, -0.36, -0.32, -0.26, -0.18, -0.09, 0.02, 0.15, top];
  const cols = 7;
  const across = (w, f) => Array.from({ length: cols }, (_, i) => -w + (2 * w * i) / (cols - 1)).map(f);
  // Corpo de madeira: frente (esq→dir) e costas (dir→esq) formam um anel fino.
  const bodyRings = rowsY.map(y => {
    const w = hw(y);
    const front = across(w, x => [x, y, zf(x)]);
    const back = across(w, x => [x, y, zf(x) - thick]).reverse();
    return [...front, ...back];
  });
  mesh('EscudoCorpo', loftPoints(THREE, bodyRings, { capStart: true, capEnd: true }), 'madeira', shield);
  // Aro de aço, pintura e cruz verde, seguindo a curvatura do escudo.
  const sheet = (x0, x1, ys, inset, lift) => loftPoints(THREE, ys.map(y => {
    const w = Math.min(hw(y) * inset, Math.max(Math.abs(x0), Math.abs(x1)));
    const a = Math.max(x0, -w), b = Math.min(x1, w);
    return Array.from({ length: cols }, (_, i) => a + ((b - a) * i) / (cols - 1)).map(x => [x, y, zf(x) + lift]);
  }), { closed: false });
  mesh('EscudoAro', sheet(-half, half, [tip + 0.004, ...rowsY.slice(1, -1), top], 1, 0.001), 'acoEscuro', shield,
    [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
  mesh('EscudoPintura', sheet(-half, half, [tip + 0.03, ...rowsY.slice(2, -1), top - 0.018], 0.9, 0.003), 'escudoFace', shield,
    [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
  mesh('EscudoCruzV', sheet(-0.032, 0.032, [-0.3, -0.18, -0.05, 0.1, 0.25], 0.9, 0.005), 'capa', shield,
    [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
  mesh('EscudoCruzH', sheet(-0.2, 0.2, [0.06, 0.125], 0.9, 0.005), 'capa', shield,
    [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
  for (const [x, y] of [[0, top - 0.01], [-0.22, 0.24], [0.22, 0.24], [-0.225, 0.04], [0.225, 0.04], [-0.17, -0.2], [0.17, -0.2], [0, tip + 0.025]]) {
    rivet(shield, x, y, zf(x) + 0.006, 1.2);
  }
  // Correias (enarmes) e almofada no verso, por onde passa o antebraço.
  mesh('EscudoAlca1', new THREE.BoxGeometry(0.03, 0.17, 0.01), 'couro', shield, [-0.02 * -SHIELD, 0.07, -thick - 0.006], [0, 0, -0.95 * SHIELD], [1, 1, 1], detail);
  mesh('EscudoAlca2', new THREE.BoxGeometry(0.03, 0.17, 0.01), 'couro', shield, [0.03 * -SHIELD, -0.07, -thick - 0.006], [0, 0, -0.95 * SHIELD], [1, 1, 1], detail);
  mesh('EscudoAlmofada', new THREE.BoxGeometry(0.1, 0.12, 0.012), 'couro', shield, [0, 0, -thick - 0.004], [0, 0, -0.95 * SHIELD], [1, 1, 1], detail);

  knight.updateMatrixWorld(true);
  const forearmMid = shieldArm.elbow.localToWorld(new THREE.Vector3(0, -0.13, 0));
  // A face do escudo fica paralela ao antebraço, voltada para fora e um pouco à frente.
  const forearmDir = shieldArm.elbow.localToWorld(new THREE.Vector3(0, -1, 0)).sub(shieldArm.elbow.getWorldPosition(new THREE.Vector3())).normalize();
  const front = new THREE.Vector3(SHIELD, 0.02, 0.3).projectOnPlane(forearmDir).normalize();
  const upW = new THREE.Vector3(-0.06 * SHIELD, 1, 0);
  const xAxis = new THREE.Vector3().crossVectors(upW, front).normalize();
  const yAxis = new THREE.Vector3().crossVectors(front, xAxis);
  const shieldQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, front));
  const shieldPos = forearmMid.clone().addScaledVector(front, 0.08).addScaledVector(yAxis, -0.03);
  attachWorld(shield, shieldArm.elbow, shieldPos, shieldQuat);

  // ---------- Espada longa na mão da espada ----------
  const sword = new THREE.Group();
  sword.name = 'Espada';
  const blade = [];
  for (const [y, w, t] of [[-0.95, 0.002, 0.001], [-0.88, 0.016, 0.005], [-0.5, 0.02, 0.006], [-0.11, 0.024, 0.007]]) {
    blade.push([[0, y, t], [w, y, 0], [0, y, -t], [-w, y, 0]]);
  }
  mesh('Lamina', loftPoints(THREE, blade, { capEnd: true }), 'lamina', sword);
  // Sulco (fuller) dos dois lados da lâmina.
  for (const s of [1, -1]) {
    mesh('Sulco', new THREE.BoxGeometry(0.008, 0.55, 0.002), 'acoEscuro', sword, [0, -0.42, 0.0062 * s], [0, 0, 0], [1, 1, 1], detail);
  }
  mesh('Guarda', loft(THREE, [
    { y: -0.105, w: 0.105, f: 0.011 },
    { y: -0.085, w: 0.1, f: 0.011 },
  ], 6), 'acoEscuro', sword);
  for (const s of [1, -1]) {
    mesh('PontaGuarda', new THREE.IcosahedronGeometry(0.014, 0), 'latao', sword, [0.105 * s, -0.095, 0], [0, 0, 0], [1, 1, 1], detail);
  }
  mesh('Empunhadura', loft(THREE, [
    { y: -0.085, w: 0.013, f: 0.013 },
    { y: 0.0, w: 0.015, f: 0.015 },
    { y: 0.1, w: 0.012, f: 0.012 },
  ], 6), 'couro', sword);
  for (const y of [-0.05, 0.03]) {
    mesh('AnelEmpunhadura', new THREE.CylinderGeometry(0.0165, 0.0165, 0.006, 6), 'latao', sword, [0, y, 0], [0, 0, 0], [1, 1, 1], detail);
  }
  mesh('Pomo', new THREE.CylinderGeometry(0.028, 0.028, 0.02, 8), 'latao', sword, [0, 0.12, 0], [0, 0, Math.PI / 2]);

  // Pegada da espada, no espaço do punho fechado (x atravessa os nós dos dedos,
  // y desce da palma para os dedos, +z é o dorso e -z a palma):
  // - o cabo passa por dentro dos dedos fechados, ao longo de x;
  // - a guarda encosta logo depois do indicador (do lado do polegar) e a lâmina
  //   sai por ali; o resto do cabo e o pomo saem pelo lado do mindinho;
  // - a guarda e o gume ficam alinhados com os nós dos dedos (eixo y).
  const thumbSide = -SWORD; // o polegar fica em x = -0.042 * lado
  const fistQ = swordArm.fist.quaternion;
  const gripInFist = new THREE.Vector3(thumbSide * (0.04 - 0.095), -0.08, -0.016);
  const gripAxes = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 1, 0),           // largura da lâmina e guarda (x da espada)
    new THREE.Vector3(-thumbSide, 0, 0),  // do cabo para o pomo (y da espada)
    new THREE.Vector3(0, 0, thumbSide));  // face da lâmina (z da espada)
  sword.position.copy(gripInFist).applyQuaternion(fistQ).add(swordArm.fist.position);
  sword.quaternion.copy(fistQ).multiply(new THREE.Quaternion().setFromRotationMatrix(gripAxes));
  swordArm.hand.add(sword);
  // Pose parada: a lâmina aponta para a frente, na horizontal e um pouco para
  // fora. O pulso faz a menor rotação a partir da posição neutra da mão para
  // levar a lâmina até lá; o giro em torno do braço fica com o antebraço.
  knight.updateMatrixWorld(true);
  const bladeNow = new THREE.Vector3(0, -1, 0).transformDirection(sword.matrixWorld);
  const aim = new THREE.Vector3(...(options.swordAim ?? [0.12 * SWORD, 0, 1])).normalize();
  const handWorld = swordArm.hand.getWorldQuaternion(new THREE.Quaternion());
  const tilt = new THREE.Quaternion().setFromUnitVectors(bladeNow, aim);
  const elbowWorld = swordArm.elbow.getWorldQuaternion(new THREE.Quaternion());
  const handRel = elbowWorld.clone().invert().multiply(tilt.multiply(handWorld));
  const split = splitWristTwist(THREE, handRel);
  swordArm.elbow.rotation.y = split.twistAngle;
  swordArm.hand.quaternion.copy(split.wrist);
  swordArm.handRest = swordArm.hand.quaternion.clone();
  swordArm.twistRest = split.twistAngle;

  // ---------- Bainha no quadril esquerdo, presa ao cinto ----------
  const scabbard = group('Bainha', knight, [0.18, 0.93, 0.05]);
  scabbard.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0.04, -1, -0.16).normalize());
  mesh('BainhaCouro', loft(THREE, [
    { y: -0.86, w: 0.008, f: 0.014 },
    { y: -0.8, w: 0.011, f: 0.025 },
    { y: -0.02, w: 0.013, f: 0.03 },
    { y: 0.0, w: 0.013, f: 0.03 },
  ], 8), 'couro', scabbard);
  mesh('BainhaBoca', new THREE.CylinderGeometry(1, 1, 0.05, 8), 'latao', scabbard, [0, -0.03, 0], [0, 0, 0], [0.016, 1, 0.034], detail);
  mesh('BainhaPonteira', new THREE.CylinderGeometry(1, 0.4, 0.07, 8), 'latao', scabbard, [0, -0.83, 0], [0, 0, 0], [0.012, 1, 0.024], detail);
  mesh('BainhaCorreia1', new THREE.BoxGeometry(0.012, 0.06, 0.02), 'couro', scabbard, [0.008, 0.03, 0.02], [0, 0, -0.3], [1, 1, 1], detail);
  mesh('BainhaCorreia2', new THREE.BoxGeometry(0.012, 0.06, 0.02), 'couro', scabbard, [0.008, 0.03, -0.02], [0, 0, -0.3], [1, 1, 1], detail);

  // ---------- Capa verde ----------
  // Tecido preso nos ombros (sob os espaldares), caindo pelas costas atrás dos
  // braços, com dobras que aumentam em direção à barra. Por fora lã verde, por
  // dentro forro escuro; barra e laterais bordadas e cruz bordada nas costas.
  const capeFrame = v => {
    const wrap = Math.min(1, v / 0.3);
    return { edge: 0.25 - 0.7 * wrap, y: 1.49 - v * 1.32, rx: 0.215 + 0.11 * v, rz: 0.1 + 0.07 * v, zoff: -0.005 - 0.075 * v };
  };
  const capePoint = (u, v, off = 0) => {
    const f = capeFrame(v);
    const theta = (Math.PI / 2 - f.edge) + u * (Math.PI + 2 * f.edge);
    const fold = 1 + v * ((0.05 + 0.12 * v) * Math.sin(u * Math.PI * 9) + 0.03 * Math.sin(u * Math.PI * 4 + 1));
    const lift = 0.018 * Math.abs(Math.sin(theta)) * Math.max(0, 1 - v / 0.06);
    const hem = 0.025 * Math.sin(u * Math.PI * 5) * Math.max(0, (v - 0.9) / 0.1);
    let x = Math.sin(theta) * f.rx * fold;
    let z = Math.cos(theta) * f.rz * fold + f.zoff;
    const r = Math.hypot(x, z - f.zoff) || 1;
    x += (off * x) / r;
    z += (off * (z - f.zoff)) / r;
    return [x, f.y + lift + hem, z];
  };
  // Superfície da capa entre (u0..u1, v0..v1); anéis de baixo (v1) para cima (v0).
  const capeSurface = (u0, u1, v0, v1, nu, nv, off, vCurve = 1) => {
    const rings = [];
    for (let j = nv; j >= 0; j--) {
      const v = v0 + (v1 - v0) * (j / nv) ** vCurve;
      const ring = [];
      for (let i = 0; i <= nu; i++) ring.push(capePoint(u0 + ((u1 - u0) * i) / nu, v, off));
      rings.push(ring);
    }
    return loftPoints(THREE, rings, { closed: false });
  };
  const capeGeo = capeSurface(0, 1, 0, 1, 27, 16, 0, 1.25);
  const capeOpts = { receiveShadow: false, noOutline: true };
  mesh('Capa', capeGeo, 'capa', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], capeOpts);
  mesh('CapaForro', capeGeo, 'capaInterna', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], { ...capeOpts, castShadow: false });
  // Gola dobrada sobre os ombros.
  mesh('CapaGola', capeSurface(0.02, 0.98, 0, 0.09, 27, 2, 0.012), 'capa', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], capeOpts);
  mesh('CapaGolaBorda', capeSurface(0.02, 0.98, 0.075, 0.09, 27, 1, 0.014), 'bordado', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
  // Barra e laterais bordadas, por fora e por dentro.
  for (const off of [0.003, -0.003]) {
    mesh('CapaBarra', capeSurface(0, 1, 0.955, 1, 54, 1, off), 'bordado', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
    mesh('CapaBordaDir', capeSurface(0, 0.022, 0.03, 1, 1, 14, off), 'bordado', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
    mesh('CapaBordaEsq', capeSurface(0.978, 1, 0.03, 1, 1, 14, off), 'bordado', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
  }
  // Cruz bordada nas costas.
  mesh('CapaCruzV', capeSurface(0.47, 0.53, 0.14, 0.52, 2, 6, 0.004), 'bordado', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
  mesh('CapaCruzH', capeSurface(0.39, 0.61, 0.24, 0.29, 6, 1, 0.004), 'bordado', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1], detail);
  // Broches e corrente que fecham a capa no peito.
  for (const side of [1, -1]) {
    mesh(`Broche${side === 1 ? 'Esquerdo' : 'Direito'}`, new THREE.CylinderGeometry(0.02, 0.02, 0.008, 8), 'latao', knight,
      [0.165 * side, 1.462, 0.075], [Math.PI / 2 - 0.4, 0, 0], [1, 1, 1], detail);
    rivet(knight, 0.165 * side, 1.465, 0.082, 1.3);
  }
  for (let i = 0; i < 7; i++) {
    const x = -0.135 + i * 0.045;
    mesh('ElosCorrente', new THREE.TorusGeometry(0.008, 0.0025, 3, 6), 'latao', knight,
      [x, 1.452 - 0.012 * Math.cos((x / 0.15) * (Math.PI / 2)), 0.108 - 0.045 * (x / 0.135) ** 2], [0, i % 2 ? Math.PI / 2 : 0, 0], [1, 1, 1], detail);
  }

  // ---------- Rig: bacia e tronco ----------
  // Separa a parte de baixo (bacia, pernas, faldas, cinto, bainha) da de cima
  // (couraça, braços, cabeça, broches), para o tronco girar sobre a cintura.
  // Os pés ficam na raiz (presos ao chão pela animação) e a capa também, pois
  // ela é deformada para acompanhar o tronco com atraso.
  const bacia = group('Bacia', knight, [0, 0.93, 0]);
  const tronco = group('Tronco', bacia, [0, 0.09, -0.01]);
  knight.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  for (const child of [...knight.children]) {
    if (child === bacia || /^Pe(Esquerda|Direita)$/.test(child.name) || /^Capa/.test(child.name)) continue;
    if (/^(Broche|ElosCorrente|BordaCouraca|Couraca|Gorjal|BordaGorjal|Cruz|Besagew|Pescoco|Cabeca|Ombro)/.test(child.name)) { tronco.attach(child); continue; }
    if (/^(Quadril|Bainha|Pelve|SaiaMalha|Falda|Escarcela|Cinto)/.test(child.name)) { bacia.attach(child); continue; }
    box.setFromObject(child).getCenter(center);
    (center.y < 1.0 ? bacia : tronco).attach(child);
  }
  // Referências para a animação (fora do userData, que vai para o glTF).
  Object.defineProperty(knight, 'rig', {
    enumerable: false,
    value: {
      bacia, tronco, cabeca: head, legs,
      arms: { 1: left, [-1]: right },
      espada: sword, swordSide: SWORD,
      upperArm: 0.3, forearm: 0.25,
    },
  });

  return knight;
}

// Contorno de desenho por "casco invertido": uma cópia de cada peça, inflada ao
// longo das normais suavizadas e com as faces viradas para dentro. Só aparece
// em volta da silhueta, funciona em qualquer engine (não precisa de shader).
export function addOutline(THREE, root, thickness = 0.012, color = 0x15110e) {
  const mat = new THREE.MeshBasicMaterial({ name: 'contorno', color });
  const meshes = [];
  root.traverse(o => { if (o.isMesh && !o.userData.outline && !o.userData.noOutline) meshes.push(o); });
  for (const m of meshes) {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    const pos = g.attributes.position;
    // Normal média por posição, para o casco não abrir nas arestas chapadas.
    const key = i => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    const sum = new Map();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      const n = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
      for (let k = 0; k < 3; k++) {
        const id = key(i + k);
        if (!sum.has(id)) sum.set(id, new THREE.Vector3());
        sum.get(id).add(n);
      }
    }
    const sx = m.scale.x, sy = m.scale.y, sz = m.scale.z;
    for (let i = 0; i < pos.count; i++) {
      const n = sum.get(key(i)).clone().normalize();
      pos.setXYZ(i,
        pos.getX(i) + n.x * thickness / sx,
        pos.getY(i) + n.y * thickness / sy,
        pos.getZ(i) + n.z * thickness / sz);
    }
    // Inverte a ordem dos vértices de cada triângulo (faces para dentro).
    for (let i = 0; i < pos.count; i += 3) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      pos.setXYZ(i, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      pos.setXYZ(i + 2, x, y, z);
    }
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    const hull = new THREE.Mesh(g, mat);
    hull.name = `${m.name}_Contorno`;
    hull.userData.outline = true;
    hull.position.copy(m.position);
    hull.rotation.copy(m.rotation);
    hull.scale.copy(m.scale);
    m.parent.add(hull);
  }
  return mat;
}
