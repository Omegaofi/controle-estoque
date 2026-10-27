// Animações do cavaleiro: caminhada, ataque (corte horizontal) e defesa
// (bloqueio com escudo, de lado, com as pernas firmando a base). Um único motor
// toca os clipes.
//
// Pernas e braços usam cinemática inversa de dois ossos: a animação define
// onde ficam os pés e as mãos, e os ângulos de quadril/joelho e ombro/cotovelo
// são calculados a cada quadro.

// Canais da animação: [tempo (s), ...valores]. Interpolação cúbica entre chaves.
// As chaves foram escritas com a espada no lado +x; com a espada no outro lado
// (rig.swordSide = -1) tudo é espelhado: x e giros trocam de sinal.
// Coordenadas: +x = lado do cavaleiro onde está a espada (nas chaves), +y = cima, +z = frente.
// Bacia: deslocamento [x, y, z] a partir da pose original e giro (yaw).
// Tronco: [giro, inclinação à frente, inclinação lateral] sobre a cintura.
// Mãos: posição do pulso no espaço do tronco (origem na cintura). Como o tronco
// já está girado, os valores locais mudam pouco: quem leva a espada é o giro.
// Lâmina: direção da ponta no espaço do tronco.
// Pés: [x, z, altura, giro] no chão.
// Opcionais: poloEspada / poloEscudo (para onde aponta o cotovelo, no espaço do
// tronco) e cabeca ([inclinação, giro] somados à compensação automática).
// Ataque: corte horizontal de direita (golpe de frente, com a mão da espada),
// varrendo do lado da espada para o lado do escudo. O golpe nasce no quadril:
// a bacia e o tronco giram, o pé do lado do escudo dá um passo à frente, a
// cabeça mantém o olhar no alvo, o escudo abre caminho e a capa segue o tronco
// com atraso.
export const ATAQUE = {
  name: 'Ataque',
  duration: 2.4,
  channels: {
    baciaPos: [
      [0, 0.01, -0.04, 0], [0.42, 0.03, -0.05, -0.03], [0.55, 0.02, -0.07, 0.02], [0.63, 0, -0.09, 0.07],
      [0.71, -0.01, -0.09, 0.09], [0.86, -0.02, -0.08, 0.09], [1.1, -0.02, -0.07, 0.08], [1.75, 0.01, -0.04, 0], [2.4, 0.01, -0.04, 0],
    ],
    baciaYaw: [
      [0, 0.15], [0.42, 0.4], [0.55, 0.2], [0.63, -0.1], [0.71, -0.3], [0.86, -0.38], [1.1, -0.34], [1.75, 0.15], [2.4, 0.15],
    ],
    tronco: [
      [0, 0.1, 0.05, 0], [0.42, 0.75, -0.03, 0.05], [0.55, 0.45, 0.03, 0.02], [0.63, 0, 0.08, 0],
      [0.71, -0.5, 0.1, -0.03], [0.86, -0.8, 0.1, -0.05], [1.1, -0.72, 0.08, -0.04], [1.75, 0.1, 0.05, 0], [2.4, 0.1, 0.05, 0],
    ],
    maoEspada: [
      [0, 0.2, 0.08, 0.3], [0.42, 0.38, 0.16, -0.01], [0.55, 0.27, 0.14, 0.39], [0.63, 0.2, 0.13, 0.48],
      [0.71, 0.13, 0.11, 0.47], [0.86, -0.11, 0.03, 0.39], [1.1, -0.13, 0.02, 0.33], [1.75, 0.2, 0.08, 0.3], [2.4, 0.2, 0.08, 0.3],
    ],
    lamina: [
      [0, 0.05, 0.6, 0.8], [0.42, 0.99, 0.1, -0.06], [0.55, 0.58, 0.02, 0.81], [0.63, 0.25, -0.02, 0.98],
      [0.71, -0.23, -0.05, 0.96], [0.86, -0.92, -0.25, 0.27], [1.1, -0.82, -0.35, 0.23], [1.75, 0.05, 0.6, 0.8], [2.4, 0.05, 0.6, 0.8],
    ],
    maoEscudo: [
      [0, -0.17, 0.12, 0.3], [0.42, -0.12, 0.12, 0.32], [0.55, -0.25, 0.1, 0.2], [0.63, -0.33, 0.1, 0.05],
      [0.71, -0.36, 0.08, -0.02], [0.86, -0.34, 0.1, 0], [1.1, -0.3, 0.1, 0.05], [1.75, -0.17, 0.12, 0.3], [2.4, -0.17, 0.12, 0.3],
    ],
    peEspada: [
      [0, 0.17, -0.07, 0, 0.4], [0.71, 0.17, -0.07, 0, 0.4], [0.86, 0.17, -0.07, 0, 0.1], [1.1, 0.17, -0.07, 0, 0.1],
      [1.75, 0.17, -0.07, 0, 0.4], [2.4, 0.17, -0.07, 0, 0.4],
    ],
    peEscudo: [
      [0, -0.13, 0.12, 0, -0.05], [0.4, -0.13, 0.12, 0, -0.05], [0.5, -0.14, 0.19, 0.055, -0.1], [0.6, -0.15, 0.26, 0, -0.15],
      [1.3, -0.15, 0.26, 0, -0.15], [1.45, -0.14, 0.19, 0.045, -0.1], [1.6, -0.13, 0.12, 0, -0.05], [2.4, -0.13, 0.12, 0, -0.05],
    ],
  },
};

// Defesa: só o bloqueio com escudo, sem contra-ataque, com trabalho de pernas.
// Referências do movimento real e de jogos:
// - O corpo fica de lado para o golpe: o ombro do escudo à frente e o da espada
//   para trás, o que diminui a área exposta e põe o escudo entre os dois.
// - As pernas montam a base para receber o impacto: o pé do escudo à frente,
//   apontando para o oponente; o pé da espada recua para trás e para fora,
//   virado de lado, abrindo uma base larga; joelhos dobrados e quadril baixo.
// - Escudo um pouco afastado do corpo, borda na altura do queixo, quase em pé e
//   levemente inclinado; o cavaleiro olha por cima da borda. A espada fica
//   armada junto à cabeça, ponta para a frente, pronta mas sem atacar.
// - O escudo vai ao encontro do golpe pouco antes do impacto (defesa ativa).
// - No impacto: pequena pausa, o escudo cede e gira para desviar, o peso vai
//   para a perna de trás (que dobra e segura), o pé da frente escorrega um
//   pouco, o tronco recua e a cabeça se encolhe. A recuperação é mais lenta.
// - Segura a guarda com uma respiração leve e recolhe o pé de trás no fim.
const G = {
  bacia: [0.01, -0.04, 0], yaw: 0.15, tronco: [0.1, 0.05, 0],
  espada: [0.2, 0.08, 0.3], lamina: [0.05, 0.6, 0.8], escudo: [-0.17, 0.12, 0.3],
  poloEspada: [0.35, -1, -0.25], poloEscudo: [-0.35, -1, -0.3],
  peEspada: [0.17, -0.07, 0, 0.4], peEscudo: [-0.13, 0.12, 0, -0.05],
};
const B = {
  bacia: [0.05, -0.09, -0.06], yaw: 0.6, tronco: [0.35, 0.08, 0],
  espada: [0.09, 0.5, 0.12], lamina: [-0.81, 0.03, 0.58], escudo: [-0.28, 0.2, 0.24],
  poloEspada: [0.7, -0.7, -0.1], poloEscudo: [-0.3, -0.5, -1],
  peEspada: [0.22, -0.28, 0, 1.2], peEscudo: [-0.12, 0.16, 0, 0.2],
};
export const DEFESA = {
  name: 'Defesa',
  duration: 3.2,
  channels: {
    baciaPos: [
      [0, ...G.bacia], [0.14, 0.03, -0.07, -0.03], [0.3, ...B.bacia], [0.5, 0.05, -0.085, -0.06], [0.7, ...B.bacia],
      [0.74, 0.04, -0.09, -0.04], [0.79, 0.08, -0.115, -0.13], [0.84, 0.08, -0.115, -0.13], [1.3, ...B.bacia],
      [1.75, 0.05, -0.083, -0.06], [2.2, ...B.bacia], [2.45, 0.03, -0.07, -0.03], [2.65, ...G.bacia], [3.2, ...G.bacia],
    ],
    baciaYaw: [
      [0, G.yaw], [0.3, B.yaw], [0.7, B.yaw], [0.74, 0.57], [0.79, 0.68], [0.84, 0.68], [1.3, B.yaw], [2.2, B.yaw],
      [2.65, G.yaw], [3.2, G.yaw],
    ],
    tronco: [
      [0, ...G.tronco], [0.3, ...B.tronco], [0.7, ...B.tronco], [0.74, 0.32, 0.12, 0], [0.79, 0.45, -0.02, 0.02],
      [0.84, 0.45, -0.02, 0.02], [1.3, ...B.tronco], [1.75, 0.35, 0.07, 0], [2.2, ...B.tronco], [2.65, ...G.tronco],
      [3.2, ...G.tronco],
    ],
    cabeca: [
      [0, 0, 0], [0.3, 0.05, 0], [0.74, 0.05, 0], [0.79, -0.08, -0.06], [0.84, -0.08, -0.06], [1.3, 0.05, 0],
      [2.2, 0.05, 0], [2.65, 0, 0], [3.2, 0, 0],
    ],
    maoEspada: [
      [0, ...G.espada], [0.3, ...B.espada], [0.74, ...B.espada], [0.79, 0.09, 0.48, 0.07], [0.84, 0.09, 0.48, 0.07],
      [1.3, ...B.espada], [2.2, ...B.espada], [2.65, ...G.espada], [3.2, ...G.espada],
    ],
    lamina: [
      [0, ...G.lamina], [0.3, ...B.lamina], [2.2, ...B.lamina], [2.65, ...G.lamina], [3.2, ...G.lamina],
    ],
    maoEscudo: [
      [0, ...G.escudo], [0.3, ...B.escudo], [0.5, -0.28, 0.205, 0.24], [0.7, ...B.escudo], [0.74, -0.28, 0.21, 0.3],
      [0.79, -0.31, 0.19, 0.16], [0.84, -0.31, 0.19, 0.16], [1.3, ...B.escudo], [1.75, -0.28, 0.205, 0.24],
      [2.2, ...B.escudo], [2.65, ...G.escudo], [3.2, ...G.escudo],
    ],
    poloEspada: [[0, ...G.poloEspada], [0.3, ...B.poloEspada], [2.2, ...B.poloEspada], [2.65, ...G.poloEspada], [3.2, ...G.poloEspada]],
    poloEscudo: [[0, ...G.poloEscudo], [0.3, ...B.poloEscudo], [2.2, ...B.poloEscudo], [2.65, ...G.poloEscudo], [3.2, ...G.poloEscudo]],
    // Pé da espada: passo para trás e para fora, girando de lado; volta no fim.
    peEspada: [
      [0, ...G.peEspada], [0.15, 0.2, -0.18, 0.05, 0.8], [0.3, ...B.peEspada], [2.2, ...B.peEspada],
      [2.42, 0.2, -0.18, 0.045, 0.8], [2.65, ...G.peEspada], [3.2, ...G.peEspada],
    ],
    // Pé do escudo: gira no lugar para apontar ao oponente; escorrega no impacto.
    peEscudo: [
      [0, ...G.peEscudo], [0.3, ...B.peEscudo], [0.79, ...B.peEscudo], [0.86, -0.12, 0.14, 0, 0.2],
      [2.2, -0.12, 0.14, 0, 0.2], [2.65, ...G.peEscudo], [3.2, ...G.peEscudo],
    ],
  },
};

// Caminhada: o cavaleiro de placas andando livre, a partir do relatório de
// referência. Ciclo de 1,2 s (dois passos de 0,6 s) feito no lugar: os pés
// deslizam para trás no apoio e a raiz do personagem anda para a frente a
// rootSpeed m/s, então no chão cada pé fica parado enquanto apoia.
// - 60% do ciclo com o pé no chão e 40% no ar; passo de cerca de 0,48 m, um
//   pouco mais curto que o normal por causa do peso nas pernas.
// - O quadril desce logo depois do contato (o peso "assenta"), sobe na
//   passagem da outra perna e vai para o lado do pé de apoio.
// - O quadril gira pouco com a perna da frente e o tronco gira ao contrário,
//   porque os braços quase não balançam: escudo carregado à frente, na altura
//   da cintura, e espada baixa, com um balanço curto e atrasado.
// - Peito, braços e lâmina chegam um pouco depois do quadril (atraso de
//   alguns quadros), e a capa segue o tronco com atraso.
const WALK_T = 1.2, STANCE = 0.6, REACH = 0.29;
const TAU = Math.PI * 2;
const walkKeys = (f, steps = 24) => Array.from({ length: steps + 1 }, (_, i) => {
  const t = (i / steps) * WALK_T;
  return [t, ...f(t / WALK_T)];
});
// Pé: contato em u0, apoio linear para trás, depois balanço para a frente.
const footAt = (u0, x, yaw) => u => {
  const v = (((u - u0) % 1) + 1) % 1;
  if (v < STANCE) return [x, REACH - (v / STANCE) * 2 * REACH, 0, yaw];
  const s = (v - STANCE) / (1 - STANCE);
  const ease = s * s * (3 - 2 * s);
  return [x, -REACH + 2 * REACH * ease, 0.07 * Math.sin(Math.PI * s), yaw];
};
export const CAMINHADA = {
  name: 'Caminhada',
  duration: WALK_T,
  loop: true,
  rootSpeed: (2 * REACH) / (STANCE * WALK_T),
  channels: {
    baciaPos: walkKeys(u => [0.02 * Math.sin(TAU * u), -0.05 - 0.012 * Math.cos(2 * TAU * (u - 0.07)), 0]),
    baciaYaw: walkKeys(u => [-0.08 * Math.cos(TAU * u)]),
    tronco: walkKeys(u => [0.11 * Math.cos(TAU * (u - 0.03)), 0.05 + 0.01 * Math.cos(2 * TAU * (u - 0.1)), 0.015 * Math.sin(TAU * u)]),
    cabeca: walkKeys(() => [0.02, 0]),
    maoEspada: walkKeys(u => [0.235, -0.06 + 0.008 * Math.cos(2 * TAU * (u - 0.1)), 0.12 - 0.035 * Math.cos(TAU * (u - 0.07))]),
    lamina: walkKeys(u => [0.05, -0.42 - 0.04 * Math.cos(TAU * (u - 0.1)), 0.9]),
    maoEscudo: walkKeys(u => [-0.2, 0.06 + 0.006 * Math.cos(2 * TAU * (u - 0.12)), 0.27 + 0.012 * Math.cos(TAU * (u - 0.1))]),
    peEspada: walkKeys(footAt(0, 0.13, 0.08), 48),
    peEscudo: walkKeys(footAt(0.5, -0.13, -0.08), 48),
  },
};

// Hermite cúbica com tangentes de Catmull-Rom para tempos não uniformes.
// loop = duração do ciclo: as tangentes das pontas usam as chaves do outro
// lado, e o ciclo emenda sem tranco (a primeira e a última chave são iguais).
function sampleKeys(keys, t, loop = 0) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const t0 = k0[0], t1 = k1[0], h = t1 - t0, s = (t - t0) / h;
  const tangent = j => {
    if (loop && (j === 0 || j === n - 1)) {
      const a = keys[n - 2], b = keys[1];
      return c => (b[c] - a[c]) / (b[0] + loop - a[0]);
    }
    const a = keys[Math.max(0, j - 1)], b = keys[Math.min(n - 1, j + 1)];
    return c => (j === 0 || j === n - 1 ? 0 : (b[c] - a[c]) / (b[0] - a[0]));
  };
  const m0 = tangent(i), m1 = tangent(i + 1);
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  const out = [];
  for (let c = 1; c < k0.length; c++) {
    // Sem tangente entre chaves iguais: segura a pose sem balançar.
    const same = k0[c] === k1[c];
    out.push(h00 * k0[c] + h01 * k1[c] + (same ? 0 : h * (h10 * m0(c) + h11 * m1(c))));
  }
  return out;
}

export function createAnimation(THREE, knight, clip = ATAQUE, { deformCape = true } = {}) {
  const rig = knight.rig;
  const CHANNELS = clip.channels, DURATION = clip.duration;
  const sample = (keys, t) => sampleKeys(keys, t, clip.loop ? DURATION : 0);
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const X = V(1, 0, 0);

  // Pose original, para voltar a ela.
  const animated = [rig.bacia, rig.tronco, rig.cabeca];
  for (const s of [1, -1]) {
    animated.push(rig.legs[s].hip, rig.legs[s].knee, rig.legs[s].foot);
    animated.push(rig.arms[s].shoulder, rig.arms[s].elbow, rig.arms[s].hand);
    for (const pl of rig.arms[s].plates ?? []) animated.push(pl.obj);
  }
  const rest = animated.map(o => ({ o, p: o.position.clone(), q: o.quaternion.clone() }));
  const baciaRest = rig.bacia.position.clone();

  // Cinemática inversa de dois ossos. root e mid apontam para -y local; o
  // osso do meio dobra em torno de x (sign +1 joelho, -1 cotovelo).
  // d e pole estão no espaço do pai de root, com origem no pivô de root.
  const e1 = V(), e2 = V(), t1 = V(), t2 = V(), n = V(), q = V();
  const mE = new THREE.Matrix4(), mT = new THREE.Matrix4();
  function twoBone(root, mid, a, b, d, pole, sign) {
    const L = Math.min(Math.max(d.length(), 0.05), (a + b) * 0.999);
    const cosInner = (a * a + b * b - L * L) / (2 * a * b);
    const bend = Math.PI - Math.acos(Math.min(1, Math.max(-1, cosInner)));
    const th = sign * bend;
    mid.rotation.set(th, 0, 0);
    e1.set(0, -a - b * Math.cos(th), -b * Math.sin(th)).normalize();
    e2.crossVectors(X, e1);
    t1.copy(d).normalize();
    q.copy(pole).addScaledVector(t1, -pole.dot(t1)).normalize();
    if (sign > 0) n.crossVectors(q, t1); else n.crossVectors(t1, q);
    n.normalize();
    t2.crossVectors(n, t1);
    mE.makeBasis(e1, e2, X);
    mT.makeBasis(t1, t2, n);
    root.quaternion.setFromRotationMatrix(mT.multiply(mE.transpose()));
  }

  // Capa: cada vértice mistura o tronco (em cima) com um tronco "atrasado"
  // (embaixo), como um tecido que demora a acompanhar o giro.
  const capes = [];
  if (deformCape) {
    const seen = new Set();
    knight.traverse(o => {
      if (!o.isMesh || !/^Capa/.test(o.name) || o.parent !== knight) return;
      o.frustumCulled = false;
      if (seen.has(o.geometry)) return;
      seen.add(o.geometry);
      capes.push({ g: o.geometry, orig: o.geometry.attributes.position.array.slice() });
    });
  }
  knight.updateMatrixWorld(true);
  const knightInv = new THREE.Matrix4();
  const troncoRestInv = new THREE.Matrix4();
  const relTronco = () => knightInv.copy(knight.matrixWorld).invert().multiply(rig.tronco.matrixWorld);
  troncoRestInv.copy(relTronco()).invert();
  const lagP = V(), lagQ = new THREE.Quaternion(), lagS = V(1, 1, 1);
  const curP = V(), curQ = new THREE.Quaternion(), curS = V();
  const mCur = new THREE.Matrix4(), mLag = new THREE.Matrix4();
  const pv = V(), pa = V(), pb = V();
  const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function updateCape(dt) {
    if (!capes.length) return;
    mCur.copy(relTronco()).multiply(troncoRestInv);
    mCur.decompose(curP, curQ, curS);
    const k = dt == null ? 1 : 1 - Math.exp(-dt / 0.11);
    lagP.lerp(curP, k);
    lagQ.slerp(curQ, k);
    mLag.compose(lagP, lagQ, lagS);
    for (const { g, orig } of capes) {
      const arr = g.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        pv.set(orig[i], orig[i + 1], orig[i + 2]);
        const w = smooth(orig[i + 1], 0.5, 1.38);
        pa.copy(pv).applyMatrix4(mLag);
        pb.copy(pv).applyMatrix4(mCur);
        pa.lerp(pb, w);
        arr[i] = pa.x; arr[i + 1] = pa.y; arr[i + 2] = pa.z;
      }
      g.attributes.position.needsUpdate = true;
    }
  }

  const tmp = V(), d = V(), pole = V(), target = V();
  const qInv = new THREE.Quaternion(), qWorld = new THREE.Quaternion(), qSword = new THREE.Quaternion();
  const swordLocalInv = rig.espada.quaternion.clone().invert();
  const bx = V(), by = V(), bz = V(), basis = new THREE.Matrix4();

  function pose(t, dt) {
    t = ((t % DURATION) + DURATION) % DURATION;
    const M = rig.swordSide ?? 1;
    const [px0, py, pz] = sample(CHANNELS.baciaPos, t);
    const px = px0 * M;
    const byaw = sample(CHANNELS.baciaYaw, t)[0] * M;
    const [tyaw0, tpitch, troll0] = sample(CHANNELS.tronco, t);
    const tyaw = tyaw0 * M, troll = troll0 * M;

    rig.bacia.position.set(baciaRest.x + px, baciaRest.y + py, baciaRest.z + pz);
    rig.bacia.rotation.set(0, byaw, 0);
    rig.tronco.rotation.set(tpitch, tyaw, troll, 'YXZ');
    // A cabeça compensa o giro para manter o olhar à frente.
    const [hp, hy] = CHANNELS.cabeca ? sample(CHANNELS.cabeca, t) : [0, 0];
    rig.cabeca.rotation.set(-tpitch * 0.6 + hp, -(tyaw + byaw) * 0.8 + hy * M, 0, 'YXZ');

    // Pés no chão e pernas por IK.
    for (const side of [1, -1]) {
      const leg = rig.legs[side];
      const [fx0, fz, lift, yaw0] = sample(side === M ? CHANNELS.peEspada : CHANNELS.peEscudo, t);
      const fx = fx0 * M, yaw = yaw0 * M;
      leg.foot.position.set(fx, 0.024 + lift, fz);
      leg.foot.rotation.set(Math.PI / 2, yaw, 0, 'YXZ');
      knight.updateMatrixWorld(true);
      target.set(fx, leg.ankleY + lift, fz);
      knight.localToWorld(target);
      d.copy(rig.bacia.worldToLocal(target)).sub(leg.hip.position);
      // Joelho aponta para onde o pé aponta.
      pole.set(Math.sin(yaw), 0, Math.cos(yaw)).applyQuaternion(qInv.copy(rig.bacia.quaternion).invert());
      twoBone(leg.hip, leg.knee, leg.thigh, leg.shin, d, pole, 1);
    }

    // Braços por IK no espaço do tronco.
    const swordArm = rig.arms[M], shieldArm = rig.arms[-M];
    const [lx, ly, lz] = sample(CHANNELS.maoEspada, t);
    d.set(lx * M, ly, lz).sub(swordArm.shoulder.position);
    const [sp0, sp1, sp2] = CHANNELS.poloEspada ? sample(CHANNELS.poloEspada, t) : [0.35, -1, -0.25];
    twoBone(swordArm.shoulder, swordArm.elbow, rig.upperArm, rig.forearm, d, pole.set(sp0 * M, sp1, sp2), -1);
    const [rx, ry, rz] = sample(CHANNELS.maoEscudo, t);
    d.set(rx * M, ry, rz).sub(shieldArm.shoulder.position);
    const [ep0, ep1, ep2] = CHANNELS.poloEscudo ? sample(CHANNELS.poloEscudo, t) : [-0.35, -1, -0.3];
    twoBone(shieldArm.shoulder, shieldArm.elbow, rig.upperArm, rig.forearm, d, pole.set(ep0 * M, ep1, ep2), -1);

    // Orientação da espada: ponta na direção da lâmina e guarda (eixo x local)
    // na vertical, alinhada com a mão; convertida para a rotação do pulso.
    const [ax, ay, az] = sample(CHANNELS.lamina, t);
    by.set(-ax * M, -ay, -az).normalize(); // o eixo +y local da espada aponta para o pomo
    tmp.set(0, 1, 0);
    bx.copy(tmp).addScaledVector(by, -tmp.dot(by));
    if (bx.lengthSq() < 1e-6) bx.set(0, 0, 1);
    bx.normalize();
    bz.crossVectors(bx, by);
    qSword.setFromRotationMatrix(basis.makeBasis(bx, by, bz));
    knight.updateMatrixWorld(true);
    rig.tronco.getWorldQuaternion(qWorld);
    qWorld.multiply(qSword).multiply(swordLocalInv);
    swordArm.elbow.getWorldQuaternion(qInv).invert();
    swordArm.hand.quaternion.copy(qInv.multiply(qWorld));
    shieldArm.hand.quaternion.identity();
    // Espaldares presos ao tronco: seguem só uma parte do giro do ombro.
    for (const arm of [swordArm, shieldArm]) {
      for (const pl of arm.plates ?? []) pl.obj.quaternion.identity().slerp(arm.shoulder.quaternion, pl.w);
    }

    knight.updateMatrixWorld(true);
    updateCape(dt);
  }

  function reset() {
    for (const r of rest) { r.o.position.copy(r.p); r.o.quaternion.copy(r.q); }
    for (const { g, orig } of capes) { g.attributes.position.array.set(orig); g.attributes.position.needsUpdate = true; }
    lagP.set(0, 0, 0); lagQ.identity();
    knight.updateMatrixWorld(true);
  }

  // Grava a animação em trilhas (para exportar em glTF).
  function bake(fps = 30) {
    const frames = Math.round(DURATION * fps);
    const times = [];
    const tracks = animated.map(() => ({ p: [], q: [] }));
    for (let f = 0; f <= frames; f++) {
      const t = f / fps;
      pose(Math.min(t, DURATION - 1e-6), 1 / fps);
      times.push(t);
      animated.forEach((o, i) => { tracks[i].p.push(...o.position.toArray()); tracks[i].q.push(...o.quaternion.toArray()); });
    }
    reset();
    const out = [];
    animated.forEach((o, i) => {
      out.push(new THREE.VectorKeyframeTrack(`${o.uuid}.position`, times, tracks[i].p));
      out.push(new THREE.QuaternionKeyframeTrack(`${o.uuid}.quaternion`, times, tracks[i].q));
    });
    return new THREE.AnimationClip(clip.name, DURATION, out);
  }

  return { name: clip.name, duration: DURATION, rootSpeed: clip.rootSpeed ?? 0, pose, reset, bake };
}

export const createAttack = (THREE, knight, opts) => createAnimation(THREE, knight, ATAQUE, opts);
export const createDefense = (THREE, knight, opts) => createAnimation(THREE, knight, DEFESA, opts);
export const createWalk = (THREE, knight, opts) => createAnimation(THREE, knight, CAMINHADA, opts);
