// Gera cavaleiro.glb, cavaleiro_contorno.glb e cavaleiro.obj/.mtl a partir de knight.js.
// Uso: npm install three@0.160.0 && node exportar.mjs
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildKnight, addOutline, PALETTE } from './knight.js';

// O GLTFExporter usa FileReader, que não existe no Node.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(b => { this.result = b; this.onloadend?.(); }); }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(b => {
      this.result = `data:${blob.type};base64,` + Buffer.from(b).toString('base64');
      this.onloadend?.();
    });
  }
};

const knight = buildKnight(THREE);
knight.updateMatrixWorld(true);

const glb = await new GLTFExporter().parseAsync(knight, { binary: true });
fs.writeFileSync('cavaleiro.glb', Buffer.from(glb));

// Versão com o contorno de desenho (casco invertido) embutido na malha.
const outlined = buildKnight(THREE);
addOutline(THREE, outlined, 0.016);
outlined.updateMatrixWorld(true);
const glbOutline = await new GLTFExporter().parseAsync(outlined, { binary: true });
fs.writeFileSync('cavaleiro_contorno.glb', Buffer.from(glbOutline));

// OBJ com normais chapadas e um material por cor.
const obj = ['# Cavaleiro low poly', 'mtllib cavaleiro.mtl'];
let base = 1;
const v = new THREE.Vector3(), n = new THREE.Vector3();
knight.traverse(m => {
  if (!m.isMesh) return;
  const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
  g.applyMatrix4(m.matrixWorld);
  g.computeVertexNormals();
  const p = g.attributes.position, nn = g.attributes.normal;
  obj.push(`o ${m.name}`, `usemtl ${m.material.name}`);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    n.fromBufferAttribute(nn, i);
    obj.push(`v ${v.x.toFixed(5)} ${v.y.toFixed(5)} ${v.z.toFixed(5)}`, `vn ${n.x.toFixed(4)} ${n.y.toFixed(4)} ${n.z.toFixed(4)}`);
  }
  for (let i = 0; i < p.count; i += 3) {
    const a = base + i, b = a + 1, c = a + 2;
    obj.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
    if (m.material.side === THREE.DoubleSide) obj.push(`f ${c}//${c} ${b}//${b} ${a}//${a}`);
  }
  base += p.count;
});
fs.writeFileSync('cavaleiro.obj', obj.join('\n') + '\n');

const srgb = h => [16, 8, 0].map(s => (((h >> s) & 255) / 255).toFixed(4)).join(' ');
const mtl = Object.entries(PALETTE).map(([k, h]) => `newmtl ${k}\nKd ${srgb(h)}\nKa 0 0 0\nKs 0.1 0.1 0.1\nNs 10\nd 1\nillum 2\n`);
fs.writeFileSync('cavaleiro.mtl', mtl.join('\n'));
console.log('ok');
