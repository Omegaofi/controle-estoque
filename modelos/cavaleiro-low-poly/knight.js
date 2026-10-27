// Cavaleiro low poly: sem elmo, capa verde, escudo no braço direito.
// Recebe o módulo THREE e devolve um THREE.Group com ~1.8 unidades de altura,
// pés em y = 0 e olhando para +Z. Cores chapadas, sem textura de imagem.

export const PALETTE = {
  pele: 0xe2ad84,
  cabelo: 0x5b3a22,
  aco: 0xa7b0ba,
  acoEscuro: 0x6d7681,
  capa: 0x2f8a3f,
  capaInterna: 0x1f5e2b,
  couro: 0x6b4426,
  bota: 0x3f2a1c,
  ouro: 0xc9a23a,
  escudoFace: 0xe9e1cc,
  lamina: 0xd3dae1,
  olho: 0x1d1b1a,
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

// options.toon = true usa MeshToonMaterial em faixas; senão MeshStandardMaterial (exportação).
export function buildKnight(THREE, options = {}) {
  const ramp = options.toon ? toonRamp(THREE) : null;
  const mats = {};
  for (const [name, color] of Object.entries(PALETTE)) {
    const metal = name === 'aco' || name === 'lamina' || name === 'ouro';
    mats[name] = ramp
      ? Object.assign(new THREE.MeshToonMaterial({ name, color, gradientMap: ramp }), { flatShading: true })
      : new THREE.MeshStandardMaterial({
          name,
          color,
          flatShading: true,
          roughness: metal ? 0.45 : 0.85,
          metalness: metal ? 0.35 : 0.0,
        });
  }
  mats.capa.side = THREE.DoubleSide;

  const knight = new THREE.Group();
  knight.name = 'Cavaleiro';

  function mesh(name, geometry, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    const m = new THREE.Mesh(geometry, mats[mat]);
    m.name = name;
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
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

  // ---------- Pernas ----------
  for (const side of [1, -1]) {
    const label = side === 1 ? 'Esquerda' : 'Direita';
    const leg = group(`Perna${label}`, knight, [0.13 * side, 0.92, 0], [0, 0, 0.03 * side]);
    mesh(`Coxa${label}`, new THREE.CylinderGeometry(0.115, 0.1, 0.42, 6), 'acoEscuro', leg, [0, -0.21, 0]);
    mesh(`Joelheira${label}`, new THREE.IcosahedronGeometry(0.075, 0), 'aco', leg, [0, -0.44, 0.06]);
    mesh(`Canela${label}`, new THREE.CylinderGeometry(0.1, 0.085, 0.36, 6), 'aco', leg, [0, -0.64, 0]);
    mesh(`Bota${label}`, new THREE.BoxGeometry(0.17, 0.13, 0.28), 'bota', leg, [0, -0.855, 0.04]);
  }

  // ---------- Quadril e tronco ----------
  mesh('Saiote', new THREE.CylinderGeometry(0.25, 0.31, 0.24, 8), 'acoEscuro', knight, [0, 0.86, 0], [0, Math.PI / 8, 0], [1, 1, 0.8]);
  mesh('Cinto', new THREE.CylinderGeometry(0.265, 0.265, 0.07, 8), 'couro', knight, [0, 0.98, 0], [0, Math.PI / 8, 0], [1, 1, 0.8]);
  mesh('Fivela', new THREE.BoxGeometry(0.08, 0.06, 0.03), 'ouro', knight, [0, 0.98, 0.215]);
  mesh('Peitoral', new THREE.CylinderGeometry(0.31, 0.25, 0.5, 8), 'aco', knight, [0, 1.26, 0], [0, Math.PI / 8, 0], [1, 1, 0.75]);
  mesh('Gorjal', new THREE.CylinderGeometry(0.13, 0.2, 0.09, 8), 'acoEscuro', knight, [0, 1.535, 0], [0, Math.PI / 8, 0], [1, 1, 0.85]);

  // ---------- Cabeça (sem elmo) ----------
  mesh('Pescoco', new THREE.CylinderGeometry(0.065, 0.075, 0.1, 6), 'pele', knight, [0, 1.6, 0]);
  const head = group('Cabeca', knight, [0, 1.73, 0.01]);
  mesh('Rosto', new THREE.IcosahedronGeometry(0.15, 1), 'pele', head, [0, 0, 0], [0, 0, 0], [0.92, 1.1, 0.98]);
  mesh('Cabelo', new THREE.SphereGeometry(0.162, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), 'cabelo', head, [0, 0.025, -0.012], [-0.35, 0, 0], [0.95, 1.08, 1.02]);
  mesh('CabeloNuca', new THREE.BoxGeometry(0.25, 0.14, 0.08), 'cabelo', head, [0, -0.04, -0.11], [0.15, 0, 0]);
  mesh('Barba', new THREE.CylinderGeometry(0.1, 0.035, 0.11, 6), 'cabelo', head, [0, -0.12, 0.07], [0.35, 0, 0], [1, 1, 0.7]);
  mesh('Nariz', new THREE.ConeGeometry(0.025, 0.06, 4), 'pele', head, [0, -0.005, 0.15], [Math.PI / 2, Math.PI / 4, 0]);
  for (const side of [1, -1]) {
    mesh(`Olho${side === 1 ? 'Esquerdo' : 'Direito'}`, new THREE.BoxGeometry(0.03, 0.035, 0.02), 'olho', head, [0.055 * side, 0.035, 0.13]);
    mesh(`Orelha${side === 1 ? 'Esquerda' : 'Direita'}`, new THREE.BoxGeometry(0.03, 0.06, 0.04), 'pele', head, [0.14 * side, 0, 0]);
  }

  // ---------- Braços ----------
  // side = -1 é o lado direito do cavaleiro (esquerda de quem olha de frente).
  function arm(side, shoulderRot, elbowRot) {
    const label = side === 1 ? 'Esquerdo' : 'Direito';
    const shoulder = group(`Ombro${label}`, knight, [0.36 * side, 1.43, 0], shoulderRot);
    mesh(`Ombreira${label}`, new THREE.SphereGeometry(0.15, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), 'aco', shoulder, [0, 0.02, 0], [0, 0, -0.35 * side], [1, 0.9, 1]);
    mesh(`Braco${label}`, new THREE.CylinderGeometry(0.075, 0.07, 0.28, 6), 'acoEscuro', shoulder, [0, -0.16, 0]);
    const elbow = group(`Cotovelo${label}`, shoulder, [0, -0.3, 0], elbowRot);
    mesh(`Cotoveleira${label}`, new THREE.IcosahedronGeometry(0.065, 0), 'aco', elbow);
    mesh(`Antebraco${label}`, new THREE.CylinderGeometry(0.085, 0.07, 0.26, 6), 'aco', elbow, [0, -0.14, 0]);
    const hand = group(`Mao${label}`, elbow, [0, -0.3, 0]);
    mesh(`Luva${label}`, new THREE.BoxGeometry(0.1, 0.1, 0.11), 'couro', hand);
    return { shoulder, elbow, hand };
  }

  // Direito: antebraço erguido à frente segurando o escudo.
  const right = arm(-1, [0.15, 0, -0.18], [-1.35, 0, 0]);
  // Esquerdo: braço caído ao lado segurando a espada.
  const left = arm(1, [0.05, 0, 0.12], [-0.35, 0, 0]);

  // ---------- Escudo (heater) no antebraço direito ----------
  const s = new THREE.Shape();
  s.moveTo(-0.24, 0.3);
  s.lineTo(0.24, 0.3);
  s.lineTo(0.24, 0.02);
  s.quadraticCurveTo(0.22, -0.22, 0, -0.38);
  s.quadraticCurveTo(-0.22, -0.22, -0.24, 0.02);
  s.lineTo(-0.24, 0.3);
  const shieldGeo = (scale, depth) => {
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 2 });
    g.scale(scale, scale, 1);
    return g;
  };
  // Escudo preso no lado externo do antebraço, face voltada para fora e para a frente.
  const shield = group('Escudo', right.elbow, [-0.11, -0.15, 0], [0, -Math.PI / 2, Math.PI / 2]);
  mesh('EscudoBorda', shieldGeo(1.0, 0.04), 'acoEscuro', shield, [0, 0, 0]);
  mesh('EscudoFace', shieldGeo(0.9, 0.02), 'escudoFace', shield, [0, 0.008, 0.035]);
  mesh('EscudoFaixa', new THREE.BoxGeometry(0.09, 0.56, 0.02), 'capa', shield, [0, -0.02, 0.05]);
  mesh('EscudoFaixaH', new THREE.BoxGeometry(0.38, 0.08, 0.02), 'capa', shield, [0, 0.1, 0.05]);
  mesh('EscudoCentro', new THREE.CylinderGeometry(0.045, 0.045, 0.03, 6), 'ouro', shield, [0, 0.1, 0.065], [Math.PI / 2, 0, 0]);

  // ---------- Espada na mão esquerda ----------
  const sword = group('Espada', left.hand, [0, -0.02, 0.02], [-0.75, 0, 0]);
  mesh('Pomo', new THREE.IcosahedronGeometry(0.035, 0), 'ouro', sword, [0, 0.13, 0]);
  mesh('Empunhadura', new THREE.CylinderGeometry(0.022, 0.022, 0.18, 5), 'couro', sword, [0, 0.04, 0]);
  mesh('Guarda', new THREE.BoxGeometry(0.24, 0.035, 0.05), 'ouro', sword, [0, -0.06, 0]);
  mesh('Lamina', new THREE.BoxGeometry(0.06, 0.62, 0.015), 'lamina', sword, [0, -0.39, 0]);
  mesh('Ponta', new THREE.ConeGeometry(0.043, 0.1, 4), 'lamina', sword, [0, -0.75, 0], [Math.PI, Math.PI / 4, 0], [1, 1, 0.25]);

  // ---------- Capa verde ----------
  // Cilindro aberto cobrindo as costas, alargando para baixo, com dobras.
  const capeH = 1.3;
  const thetaLen = Math.PI * 1.05;
  const capeGeo = new THREE.CylinderGeometry(0.33, 0.52, capeH, 9, 3, true, Math.PI - thetaLen / 2, thetaLen);
  const pos = capeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (capeH / 2 - y) / capeH; // 0 no topo, 1 embaixo
    const theta = Math.atan2(x, z);
    const fold = 1 + 0.08 * t * Math.sin(theta * 7);
    pos.setXYZ(i, x * fold, y - (t > 0.99 ? 0.04 * Math.cos(theta * 3) : 0), z * fold * 0.8 - 0.06 - 0.12 * t);
  }
  capeGeo.computeVertexNormals();
  // Sem auto-sombra: a capa é uma folha dupla e mancharia a si mesma.
  mesh('Capa', capeGeo, 'capa', knight, [0, 1.5 - capeH / 2, -0.02]).receiveShadow = false;
  mesh('GolaCapa', new THREE.CylinderGeometry(0.2, 0.3, 0.08, 8, 1, true), 'capaInterna', knight, [0, 1.52, -0.02], [0, Math.PI / 8, 0], [1, 1, 0.8]);
  for (const side of [1, -1]) {
    mesh(`Broche${side === 1 ? 'Esquerdo' : 'Direito'}`, new THREE.IcosahedronGeometry(0.035, 0), 'ouro', knight, [0.2 * side, 1.5, 0.15]);
  }

  return knight;
}

// Contorno de desenho por "casco invertido": uma cópia de cada peça, inflada ao
// longo das normais suavizadas e com as faces viradas para dentro. Só aparece
// em volta da silhueta, funciona em qualquer engine (não precisa de shader).
export function addOutline(THREE, root, thickness = 0.012, color = 0x15110e) {
  const mat = new THREE.MeshBasicMaterial({ name: 'contorno', color });
  const meshes = [];
  root.traverse(o => { if (o.isMesh && !o.userData.outline) meshes.push(o); });
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
