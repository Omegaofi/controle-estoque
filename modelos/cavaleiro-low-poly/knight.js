// Cavaleiro low poly realista: sem elmo e sem rosto (só os olhos), capa verde,
// escudo no braço direito. Proporções humanas (1,80 m, ~8 cabeças), armadura de
// placas sobre cota de malha, com articulações, correias e rebites ligando as peças.
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
  olho: 0x1e1a18,
  bordado: 0xc29a45,
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
  const shiny = new Set(['aco', 'acoEscuro', 'lamina', 'latao', 'bordado']);
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
  // Capa: lã verde por fora, forro mais escuro por dentro (mesma malha, lados opostos).
  mats.capaInterna.side = THREE.BackSide;
  mats.bordado.side = THREE.DoubleSide;

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
  const head = group('Cabeca', knight, [0, 1.683, 0.004]);
  mesh('Cabeca', headShell(THREE, 1, () => true, 18, 14), 'pele', head);
  mesh('Cabelo', headShell(THREE, 1.07, (x, y, z) => y > (z > 0 ? -0.08 + 0.62 * z : -0.08 + 0.5 * z) && !(Math.abs(x) > 0.8 && y < 0.25 && z > -0.3), 18, 14), 'cabelo', head);
  for (const side of [1, -1]) {
    const S = side === 1 ? 'Esquerdo' : 'Direito';
    mesh(`Olho${S}`, new THREE.SphereGeometry(1, 6, 4), 'olho', head, [0.03 * side, 0.016, 0.081], [0, 0.3 * side, 0], [0.011, 0.0075, 0.005], { noOutline: true });
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
    // Espaldar: cúpula, três lâminas (a última com borda de latão) e rebites.
    mesh(`Espaldar${L}`, new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 'aco', shoulder,
      [0.012 * side, 0.02, 0], [0, 0, -0.32 * side], [0.105, 0.075, 0.1]);
    [[-0.02, -0.055, 0.088, 'acoEscuro'], [-0.05, -0.085, 0.08, 'aco'], [-0.08, -0.105, 0.072, 'acoEscuro']].forEach(([y0, y1, w, mat], i) => {
      mesh(`LaminaOmbro${L}${i + 1}`, loft(THREE, [
        { y: y0, w, f: w * 0.98 },
        { y: y1, w: w * 1.04, f: w * 1.02 },
      ], 12, { capStart: false, capEnd: false }), mat, shoulder, [0.01 * side, 0, 0], [0, 0, -0.25 * side]);
    });
    mesh(`BordaOmbro${L}`, loft(THREE, [
      { y: -0.108, w: 0.076, f: 0.075 },
      { y: -0.1, w: 0.076, f: 0.075 },
    ], 12, { capStart: false, capEnd: false }), 'latao', shoulder, [0.01 * side, 0, 0], [0, 0, -0.25 * side], [1, 1, 1], detail);
    // Correia que liga o espaldar à couraça.
    mesh(`CorreiaOmbro${L}`, new THREE.BoxGeometry(0.085, 0.005, 0.022), 'couro', shoulder, [-0.05 * side, 0.072, 0], [0, 0, 0.32 * side], [1, 1, 1], detail);
    mesh(`FivelaOmbro${L}`, new THREE.BoxGeometry(0.016, 0.008, 0.028), 'latao', shoulder, [-0.07 * side, 0.068, 0], [0, 0, 0.32 * side], [1, 1, 1], detail);
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
    joint(`ArticulacaoPulso${L}`, hand, 0.03, [0, 0.01, 0]);
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
    mesh(`Polegar${L}`, new THREE.BoxGeometry(0.018, 0.048, 0.019), 'couro', fist, [-0.042, -0.06, -0.016], [0.2, 0, 0.5]);
    return { shoulder, elbow, hand };
  }

  // Direito: antebraço à frente, segurando o escudo.
  const right = arm(-1, [-0.32, 0, -0.16], [-1.12, 0, 0], [0, 0, 0]);
  // Esquerdo: braço caído ao lado, segurando a espada.
  const left = arm(1, [-0.08, 0, 0.13], [-0.5, 0, 0], [0, 0, 0]);

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
  mesh('EscudoAlca1', new THREE.BoxGeometry(0.03, 0.17, 0.01), 'couro', shield, [-0.02, 0.07, -thick - 0.006], [0, 0, 0.95], [1, 1, 1], detail);
  mesh('EscudoAlca2', new THREE.BoxGeometry(0.03, 0.17, 0.01), 'couro', shield, [0.03, -0.07, -thick - 0.006], [0, 0, 0.95], [1, 1, 1], detail);
  mesh('EscudoAlmofada', new THREE.BoxGeometry(0.1, 0.12, 0.012), 'couro', shield, [0, 0, -thick - 0.004], [0, 0, 0.95], [1, 1, 1], detail);

  knight.updateMatrixWorld(true);
  const forearmMid = right.elbow.localToWorld(new THREE.Vector3(0, -0.13, 0));
  // A face do escudo fica paralela ao antebraço, voltada para fora e um pouco à frente.
  const forearmDir = right.elbow.localToWorld(new THREE.Vector3(0, -1, 0)).sub(right.elbow.getWorldPosition(new THREE.Vector3())).normalize();
  const front = new THREE.Vector3(-1, 0.02, 0.3).projectOnPlane(forearmDir).normalize();
  const upW = new THREE.Vector3(0.06, 1, 0);
  const xAxis = new THREE.Vector3().crossVectors(upW, front).normalize();
  const yAxis = new THREE.Vector3().crossVectors(front, xAxis);
  const shieldQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, front));
  const shieldPos = forearmMid.clone().addScaledVector(front, 0.08).addScaledVector(yAxis, -0.03);
  attachWorld(shield, right.elbow, shieldPos, shieldQuat);

  // ---------- Espada longa na mão esquerda ----------
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

  knight.updateMatrixWorld(true);
  const gripPos = left.hand.localToWorld(new THREE.Vector3(0, -0.06, 0.005));
  const bladeDir = new THREE.Vector3(0.05, -0.78, 0.48).normalize();
  const swordQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), bladeDir);
  attachWorld(sword, left.hand, gripPos, swordQuat);

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
