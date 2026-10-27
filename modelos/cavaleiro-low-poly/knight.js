// Cavaleiro low poly realista: sem elmo, capa verde, escudo no braço direito.
// Proporções humanas (1,80 m, ~8 cabeças), armadura de placas sobre cota de malha.
// Recebe o módulo THREE e devolve um THREE.Group com pés em y = 0, olhando para +Z.
// Cores chapadas, sem textura de imagem.

export const PALETTE = {
  pele: 0xc6927a,
  cabelo: 0x3a2a1f,
  aco: 0x939aa3,
  acoEscuro: 0x5e646c,
  malha: 0x4a4f55,
  capa: 0x2f6a3a,
  capaInterna: 0x234f2b,
  couro: 0x5a3c26,
  latao: 0xa8843f,
  madeira: 0x6b5034,
  escudoFace: 0xd8ceb2,
  lamina: 0xbcc3cb,
  olho: 0x2a2320,
  labio: 0x9a6452,
};

// Rampa de 3 tons para o sombreamento de desenho (cel shading).
export function toonRamp(THREE, steps = [70, 160, 255]) {
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
function headPoint(nx, ny, nz, k = 1) {
  let x = nx, y = ny, z = nz;
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
// cujo centro passa no teste, e aplica o mesmo formato de crânio.
function headShell(THREE, k, keep, wSeg = 16, hSeg = 12) {
  const src = new THREE.SphereGeometry(1, wSeg, hSeg).toNonIndexed();
  const p = src.attributes.position;
  const out = [];
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    if (!keep(cx, cy, cz)) continue;
    for (let j = 0; j < 3; j++) out.push(...headPoint(p.getX(i + j), p.getY(i + j), p.getZ(i + j), k));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

// Malha livre a partir de vértices e triângulos.
function polyGeo(THREE, verts, faces) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts.flat(), 3));
  g.setIndex(faces.flat());
  g.computeVertexNormals();
  return g;
}

// ---------- Personagem ----------

// options.toon = true usa MeshToonMaterial em faixas; senão MeshStandardMaterial (exportação).
export function buildKnight(THREE, options = {}) {
  const ramp = options.toon ? toonRamp(THREE) : null;
  const shiny = new Set(['aco', 'acoEscuro', 'lamina', 'latao']);
  const mats = {};
  for (const [name, color] of Object.entries(PALETTE)) {
    mats[name] = ramp
      ? Object.assign(new THREE.MeshToonMaterial({ name, color, gradientMap: ramp }), { flatShading: true })
      : new THREE.MeshStandardMaterial({
          name,
          color,
          flatShading: true,
          roughness: shiny.has(name) ? 0.42 : 0.9,
          metalness: shiny.has(name) ? 0.45 : 0.0,
        });
  }
  mats.capa.side = THREE.DoubleSide;

  const knight = new THREE.Group();
  knight.name = 'Cavaleiro';

  function mesh(name, geometry, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], opts = {}) {
    const m = new THREE.Mesh(geometry, mats[mat]);
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

  // ---------- Pernas ----------
  for (const side of [1, -1]) {
    const L = side === 1 ? 'Esquerda' : 'Direita';
    const tilt = 0.035 * side;
    const leg = group(`Perna${L}`, knight, [0.095 * side, 0.92, 0], [0, 0, tilt]);
    // Coxote (coxa)
    mesh(`Coxote${L}`, loft(THREE, [
      { y: 0, w: 0.085, f: 0.085, b: 0.08 },
      { y: -0.12, w: 0.082, f: 0.088, b: 0.078 },
      { y: -0.27, w: 0.068, f: 0.074, b: 0.066 },
      { y: -0.39, w: 0.056, f: 0.06, b: 0.055 },
    ], 10), 'aco', leg);
    // Joelheira com aba lateral
    mesh(`Joelheira${L}`, new THREE.IcosahedronGeometry(1, 1), 'aco', leg, [0, -0.42, 0.04], [0, 0, 0], [0.052, 0.058, 0.04]);
    mesh(`AbaJoelho${L}`, new THREE.IcosahedronGeometry(1, 0), 'acoEscuro', leg, [0.05 * side, -0.42, 0.012], [0, 0, 0], [0.012, 0.045, 0.038]);
    // Grevas (canela + panturrilha)
    mesh(`Greva${L}`, loft(THREE, [
      { y: -0.44, w: 0.052, f: 0.056, b: 0.055 },
      { y: -0.54, w: 0.056, f: 0.055, b: 0.074 },
      { y: -0.66, w: 0.048, f: 0.05, b: 0.058 },
      { y: -0.78, w: 0.038, f: 0.042, b: 0.04 },
      { y: -0.82, w: 0.04, f: 0.044, b: 0.044 },
    ], 10), 'aco', leg);
    // Escarpe (pé de placas), apoiado no chão
    const ankleX = 0.095 * side + 0.8 * Math.sin(tilt);
    const foot = group(`Pe${L}`, knight, [ankleX, 0.024, 0.0], [Math.PI / 2, 0, 0]);
    mesh(`Escarpe${L}`, loft(THREE, [
      { y: -0.065, w: 0.04, f: 0.024, b: 0.05 },
      { y: -0.01, w: 0.046, f: 0.024, b: 0.085 },
      { y: 0.05, w: 0.048, f: 0.024, b: 0.07 },
      { y: 0.12, w: 0.045, f: 0.024, b: 0.045 },
      { y: 0.18, w: 0.032, f: 0.022, b: 0.025 },
      { y: 0.215, w: 0.012, f: 0.016, b: 0.012 },
    ], 8), 'acoEscuro', foot);
  }

  // ---------- Quadril: cota de malha, faldas, cinto ----------
  mesh('SaiaMalha', loft(THREE, [
    { y: 0.9, w: 0.165, f: 0.112, b: 0.11 },
    { y: 0.8, w: 0.18, f: 0.122, b: 0.122 },
    { y: 0.72, w: 0.19, f: 0.128, b: 0.13 },
  ], 12, { capStart: false, capEnd: false }), 'malha', knight);
  const faulds = [[1.0, 0.95, 0.155, 0.168], [0.96, 0.905, 0.165, 0.178], [0.92, 0.86, 0.174, 0.188]];
  faulds.forEach(([y0, y1, w0, w1], i) => {
    mesh(`Falda${i + 1}`, loft(THREE, [
      { y: y0, w: w0, f: w0 * 0.68, b: w0 * 0.64 },
      { y: y1, w: w1, f: w1 * 0.7, b: w1 * 0.66 },
    ], 12, { capStart: false, capEnd: false }), 'aco', knight);
  });
  for (const side of [1, -1]) {
    mesh(`Escarcela${side === 1 ? 'Esquerda' : 'Direita'}`, new THREE.BoxGeometry(0.13, 0.13, 0.012), 'acoEscuro', knight,
      [0.085 * side, 0.8, 0.122], [-0.12, 0.28 * side, 0]);
  }
  mesh('Cinto', loft(THREE, [
    { y: 0.95, w: 0.172, f: 0.12, b: 0.112 },
    { y: 0.985, w: 0.168, f: 0.117, b: 0.109 },
  ], 12, { capStart: false, capEnd: false }), 'couro', knight);
  mesh('Fivela', new THREE.BoxGeometry(0.04, 0.034, 0.012), 'latao', knight, [0, 0.968, 0.124]);

  // ---------- Couraça ----------
  mesh('Couraca', loft(THREE, [
    { y: 0.975, w: 0.152, f: 0.1, b: 0.094, k: 0.004, p: 2.3 },
    { y: 1.07, w: 0.145, f: 0.104, b: 0.09, k: 0.008, p: 2.3 },
    { y: 1.18, w: 0.158, f: 0.122, b: 0.095, k: 0.014, p: 2.3 },
    { y: 1.3, w: 0.174, f: 0.132, b: 0.1, k: 0.014, p: 2.4 },
    { y: 1.4, w: 0.178, f: 0.118, b: 0.1, k: 0.01, p: 2.5 },
    { y: 1.465, w: 0.15, f: 0.085, b: 0.086, p: 2.3 },
    { y: 1.5, w: 0.085, f: 0.066, b: 0.068 },
  ], 12), 'aco', knight);
  mesh('Gorjal', loft(THREE, [
    { y: 1.455, w: 0.12, f: 0.1, b: 0.092 },
    { y: 1.495, w: 0.085, f: 0.074, b: 0.072 },
    { y: 1.545, w: 0.066, f: 0.062, b: 0.062 },
  ], 10, { capStart: false, capEnd: false }), 'acoEscuro', knight);

  // ---------- Cabeça (sem elmo) ----------
  mesh('Pescoco', loft(THREE, [
    { y: 1.5, w: 0.05, f: 0.048, b: 0.05 },
    { y: 1.6, w: 0.046, f: 0.044, b: 0.046 },
  ], 8), 'pele', knight, [0, 0, -0.008]);
  const head = group('Cabeca', knight, [0, 1.683, 0.004]);
  mesh('Rosto', headShell(THREE, 1, () => true), 'pele', head);
  // Cabelo curto: linha do cabelo alta na testa, desce até a nuca.
  mesh('Cabelo', headShell(THREE, 1.07, (x, y, z) => y > (z > 0 ? -0.08 + 0.62 * z : -0.08 + 0.5 * z) && !(Math.abs(x) > 0.8 && y < 0.25 && z > -0.3)), 'cabelo', head);
  // Barba curta: queixo, mandíbula e costeletas, com abertura para a boca.
  mesh('Barba', headShell(THREE, 1.035, (x, y, z) => {
    if (z < -0.35) return false;
    const jaw = y < -0.38 || (Math.abs(x) > 0.62 && y < 0.18);
    const mouth = Math.abs(x) < 0.28 && y > -0.64 && y < -0.47 && z > 0.5;
    return jaw && !mouth;
  }), 'cabelo', head);
  mesh('Bigode', new THREE.BoxGeometry(0.044, 0.009, 0.012), 'cabelo', head, [0, -0.047, 0.078], [0.25, 0, 0], [1, 1, 1], { noOutline: true });
  mesh('Boca', new THREE.BoxGeometry(0.03, 0.007, 0.008), 'labio', head, [0, -0.064, 0.075], [0, 0, 0], [1, 1, 1], { noOutline: true });
  // Nariz em cunha
  mesh('Nariz', polyGeo(THREE,
    [[0, 0.026, 0.082], [0, -0.022, 0.104], [-0.016, -0.03, 0.084], [0.016, -0.03, 0.084], [0, -0.03, 0.08]],
    [[0, 2, 1], [0, 1, 3], [2, 4, 1], [1, 4, 3]]), 'pele', head, [0, 0, 0], [0, 0, 0], [1, 1, 1], { noOutline: true });
  for (const side of [1, -1]) {
    const S = side === 1 ? 'Esquerdo' : 'Direito';
    mesh(`Olho${S}`, new THREE.BoxGeometry(0.019, 0.008, 0.006), 'olho', head, [0.03 * side, 0.016, 0.083], [0, 0.25 * side, 0], [1, 1, 1], { noOutline: true });
    mesh(`Sobrancelha${S}`, new THREE.BoxGeometry(0.026, 0.007, 0.01), 'cabelo', head, [0.031 * side, 0.032, 0.085], [0, 0.25 * side, -0.12 * side], [1, 1, 1], { noOutline: true });
    mesh(`Orelha${S}`, new THREE.IcosahedronGeometry(1, 0), 'pele', head, [0.077 * side, 0.002, -0.01], [0.15, 0, 0], [0.012, 0.03, 0.02], { noOutline: true });
  }

  // ---------- Braços ----------
  // side = -1 é o lado direito do cavaleiro (esquerda de quem olha de frente).
  function arm(side, shoulderRot, elbowRot) {
    const L = side === 1 ? 'Esquerdo' : 'Direito';
    const shoulder = group(`Ombro${L}`, knight, [0.2 * side, 1.44, -0.005], shoulderRot);
    // Espaldar: cúpula + duas lâminas
    mesh(`Espaldar${L}`, new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 'aco', shoulder,
      [0.012 * side, 0.02, 0], [0, 0, -0.32 * side], [0.105, 0.075, 0.1]);
    [[-0.02, -0.06, 0.088], [-0.055, -0.095, 0.078]].forEach(([y0, y1, w], i) => {
      mesh(`LaminaOmbro${L}${i + 1}`, loft(THREE, [
        { y: y0, w, f: w * 0.98 },
        { y: y1, w: w * 1.04, f: w * 1.02 },
      ], 10, { capStart: false, capEnd: false }), 'acoEscuro', shoulder, [0.01 * side, 0, 0], [0, 0, -0.25 * side]);
    });
    // Braçal superior
    mesh(`BracalSuperior${L}`, loft(THREE, [
      { y: -0.02, w: 0.054, f: 0.055 },
      { y: -0.13, w: 0.052, f: 0.053 },
      { y: -0.28, w: 0.042, f: 0.044 },
    ], 10), 'aco', shoulder);
    const elbow = group(`Cotovelo${L}`, shoulder, [0, -0.3, 0], elbowRot);
    mesh(`Cotoveleira${L}`, new THREE.IcosahedronGeometry(1, 1), 'aco', elbow, [0, 0, -0.008], [0, 0, 0], [0.046, 0.05, 0.05]);
    mesh(`AbaCotovelo${L}`, new THREE.IcosahedronGeometry(1, 0), 'acoEscuro', elbow, [0.042 * side, 0, -0.01], [0, 0, 0], [0.01, 0.04, 0.04]);
    // Antebraço (braçal inferior) e manopla
    mesh(`Antebraco${L}`, loft(THREE, [
      { y: -0.02, w: 0.045, f: 0.045 },
      { y: -0.09, w: 0.046, f: 0.044 },
      { y: -0.23, w: 0.034, f: 0.031 },
    ], 10), 'aco', elbow);
    const hand = group(`Mao${L}`, elbow, [0, -0.25, 0]);
    mesh(`Punho${L}`, loft(THREE, [
      { y: 0.01, w: 0.04, f: 0.036 },
      { y: -0.035, w: 0.048, f: 0.04 },
    ], 8, { capStart: false, capEnd: false }), 'acoEscuro', hand);
    mesh(`Luva${L}`, loft(THREE, [
      { y: -0.005, w: 0.034, f: 0.02 },
      { y: -0.05, w: 0.042, f: 0.024 },
      { y: -0.085, w: 0.044, f: 0.03, b: 0.022 },
      { y: -0.105, w: 0.037, f: 0.022 },
    ], 8), 'couro', hand, [0, 0, 0], [0, side === 1 ? Math.PI / 2 : -Math.PI / 2, 0]);
    mesh(`Polegar${L}`, new THREE.BoxGeometry(0.018, 0.045, 0.018), 'couro', hand, [0, -0.05, 0.03], [0.5, 0, 0]);
    return { shoulder, elbow, hand };
  }

  // Direito: antebraço à frente, segurando o escudo.
  const right = arm(-1, [-0.32, 0, -0.16], [-1.12, 0, 0]);
  // Esquerdo: braço caído ao lado, segurando a espada.
  const left = arm(1, [-0.08, 0, 0.13], [-0.5, 0, 0]);

  // ---------- Escudo (heater) curvo no antebraço direito ----------
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
  // Pintura e cruz verde, seguindo a curvatura do escudo.
  const sheet = (x0, x1, ys, inset, lift) => loftPoints(THREE, ys.map(y => {
    const w = Math.min(hw(y) * inset, Math.max(Math.abs(x0), Math.abs(x1)));
    const a = Math.max(x0, -w), b = Math.min(x1, w);
    return Array.from({ length: cols }, (_, i) => a + ((b - a) * i) / (cols - 1)).map(x => [x, y, zf(x) + lift]);
  }), { closed: false });
  mesh('EscudoPintura', sheet(-half, half, [tip + 0.03, ...rowsY.slice(2, -1), top - 0.018], 0.9, 0.002), 'escudoFace', shield,
    [0, 0, 0], [0, 0, 0], [1, 1, 1], { noOutline: true });
  mesh('EscudoCruzV', sheet(-0.032, 0.032, [-0.3, -0.18, -0.05, 0.1, 0.25], 0.9, 0.004), 'capa', shield,
    [0, 0, 0], [0, 0, 0], [1, 1, 1], { noOutline: true });
  mesh('EscudoCruzH', sheet(-0.2, 0.2, [0.06, 0.125], 0.9, 0.004), 'capa', shield,
    [0, 0, 0], [0, 0, 0], [1, 1, 1], { noOutline: true });
  mesh('EscudoAlca', new THREE.BoxGeometry(0.03, 0.2, 0.012), 'couro', shield, [0, 0.02, -thick - 0.004], [0, 0, 0.9]);

  knight.updateMatrixWorld(true);
  const forearmMid = right.elbow.localToWorld(new THREE.Vector3(0, -0.13, 0));
  // A face do escudo fica paralela ao antebraço, voltada para fora e um pouco à frente.
  const forearmDir = right.elbow.localToWorld(new THREE.Vector3(0, -1, 0)).sub(right.elbow.getWorldPosition(new THREE.Vector3())).normalize();
  const front = new THREE.Vector3(-1, 0.02, 0.3).projectOnPlane(forearmDir).normalize();
  const upW = new THREE.Vector3(0.06, 1, 0);
  const xAxis = new THREE.Vector3().crossVectors(upW, front).normalize();
  const yAxis = new THREE.Vector3().crossVectors(front, xAxis);
  const shieldQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, front));
  const shieldPos = forearmMid.clone().addScaledVector(front, 0.075).addScaledVector(yAxis, -0.03);
  attachWorld(shield, right.elbow, shieldPos, shieldQuat);

  // ---------- Espada longa na mão esquerda ----------
  const sword = new THREE.Group();
  sword.name = 'Espada';
  const blade = [];
  for (const [y, w, t] of [[-0.95, 0.002, 0.001], [-0.88, 0.016, 0.005], [-0.5, 0.02, 0.006], [-0.11, 0.024, 0.007]]) {
    blade.push([[0, y, t], [w, y, 0], [0, y, -t], [-w, y, 0]]);
  }
  mesh('Lamina', loftPoints(THREE, blade, { capEnd: true }), 'lamina', sword);
  mesh('Guarda', loft(THREE, [
    { y: -0.105, w: 0.105, f: 0.011 },
    { y: -0.085, w: 0.1, f: 0.011 },
  ], 6), 'acoEscuro', sword);
  mesh('Empunhadura', loft(THREE, [
    { y: -0.085, w: 0.013, f: 0.013 },
    { y: 0.0, w: 0.015, f: 0.015 },
    { y: 0.1, w: 0.012, f: 0.012 },
  ], 6), 'couro', sword);
  mesh('Pomo', new THREE.CylinderGeometry(0.028, 0.028, 0.02, 8), 'latao', sword, [0, 0.12, 0], [0, 0, Math.PI / 2]);

  knight.updateMatrixWorld(true);
  const gripPos = left.hand.localToWorld(new THREE.Vector3(0, -0.06, 0.005));
  const bladeDir = new THREE.Vector3(0.05, -0.78, 0.48).normalize();
  const swordQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), bladeDir);
  attachWorld(sword, left.hand, gripPos, swordQuat);

  // ---------- Capa verde ----------
  // Folha de tecido presa nos ombros (sob os espaldares), caindo pelas costas
  // atrás dos braços, com dobras que aumentam em direção à barra.
  const capeCols = 18, capeRows = 10;
  const capeRings = [];
  for (let j = 0; j <= capeRows; j++) {
    const v = (j / capeRows) ** 1.25;
    const wrap = Math.min(1, v / 0.3);
    const edge = 0.25 - 0.7 * wrap; // quanto a borda avança para a frente
    const y = 1.49 - v * 1.32;
    const rx = 0.215 + 0.11 * v;
    const rz = 0.1 + 0.07 * v;
    const zoff = -0.005 - 0.075 * v;
    const ring = [];
    for (let i = 0; i <= capeCols; i++) {
      const u = i / capeCols;
      const theta = (Math.PI / 2 - edge) + u * (Math.PI + 2 * edge);
      const fold = 1 + (0.04 + 0.1 * v) * Math.sin(u * Math.PI * 7) * v;
      const lift = j === 0 ? 0.018 * Math.abs(Math.sin(theta)) : 0;
      const hem = j === capeRows ? 0.025 * Math.sin(u * Math.PI * 5) : 0;
      ring.push([Math.sin(theta) * rx * fold, y + lift + hem, Math.cos(theta) * rz * fold + zoff]);
    }
    // A folha é varrida de cima para baixo; inverte para ficar de baixo para cima.
    capeRings.unshift(ring);
  }
  mesh('Capa', loftPoints(THREE, capeRings, { closed: false }), 'capa', knight, [0, 0, 0], [0, 0, 0], [1, 1, 1],
    { receiveShadow: false, noOutline: true });
  for (const side of [1, -1]) {
    mesh(`Broche${side === 1 ? 'Esquerdo' : 'Direito'}`, new THREE.CylinderGeometry(0.018, 0.018, 0.008, 8), 'latao', knight,
      [0.165 * side, 1.462, 0.075], [Math.PI / 2 - 0.4, 0, 0], [1, 1, 1], { noOutline: true });
  }
  mesh('CordaoCapa', new THREE.CylinderGeometry(0.004, 0.004, 0.33, 4), 'couro', knight,
    [0, 1.456, 0.085], [0, 0, Math.PI / 2], [1, 1, 1], { noOutline: true });

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
