/**
 * Builds an original low-poly purple dragon GLB for Gaslamp & Familiar.
 * Visual target: Sketchfab "Low poly Dragon/Drake" by pigart (download disabled
 * on Sketchfab — see client/public/models/ATTRIBUTION.md).
 *
 * Usage: node scripts/gen-purple-dragon.mjs
 */
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// FileReader polyfill for GLTFExporter under Node
globalThis.FileReader = class FileReader {
  result = null;
  onloadend = null;
  onerror = null;
  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
      .then((buf) => {
        this.result = buf;
        this.onloadend?.();
      })
      .catch((e) => this.onerror?.(e));
  }
  readAsDataURL(blob) {
    blob
      .arrayBuffer()
      .then((buf) => {
        this.result = "data:application/octet-stream;base64," + Buffer.from(buf).toString("base64");
        this.onloadend?.();
      })
      .catch((e) => this.onerror?.(e));
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../client/public/models/purple-dragon.glb");

const PURPLE = 0x6b3fa0;
const PURPLE_DARK = 0x3a1f5c;
const PURPLE_LIGHT = 0x9b6fd4;
const BELLY = 0xc4a6e8;
const EYE = 0xf0e6ff;

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.72,
    metalness: opts.metalness ?? 0.08,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    flatShading: true,
  });
}

function addMesh(parent, geo, material, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
}

function buildDragon() {
  const root = new THREE.Group();
  root.name = "PurpleDragon";
  const bodyMat = mat(PURPLE);
  const darkMat = mat(PURPLE_DARK);
  const lightMat = mat(PURPLE_LIGHT, { emissive: 0x2a1040, emissiveIntensity: 0.15 });
  const bellyMat = mat(BELLY, { roughness: 0.85 });
  const eyeMat = mat(EYE, { emissive: 0xaa88ff, emissiveIntensity: 0.45 });

  addMesh(root, new THREE.CapsuleGeometry(0.55, 1.1, 4, 8), bodyMat, 0, 0.95, 0, 1, 1, 1.15);
  addMesh(root, new THREE.SphereGeometry(0.48, 8, 6), bellyMat, 0, 0.75, 0.28, 1.1, 0.9, 0.85);
  addMesh(root, new THREE.CapsuleGeometry(0.22, 0.55, 3, 6), bodyMat, 0, 1.55, 0.55, 1, 1, 1, -0.7, 0, 0);
  addMesh(root, new THREE.SphereGeometry(0.38, 8, 6), lightMat, 0, 1.95, 0.95);
  addMesh(root, new THREE.ConeGeometry(0.18, 0.45, 5), darkMat, 0, 1.95, 1.35, 1, 1, 1, Math.PI / 2, 0, 0);
  addMesh(root, new THREE.ConeGeometry(0.08, 0.35, 5), darkMat, -0.18, 2.28, 0.85, 1, 1, 1, 0.25, 0, -0.2);
  addMesh(root, new THREE.ConeGeometry(0.08, 0.35, 5), darkMat, 0.18, 2.28, 0.85, 1, 1, 1, 0.25, 0, 0.2);
  addMesh(root, new THREE.SphereGeometry(0.07, 6, 6), eyeMat, -0.16, 2.05, 1.2);
  addMesh(root, new THREE.SphereGeometry(0.07, 6, 6), eyeMat, 0.16, 2.05, 1.2);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(0.2, 0.9);
  wingShape.lineTo(1.4, 0.35);
  wingShape.lineTo(1.1, -0.15);
  wingShape.lineTo(0.35, -0.05);
  wingShape.lineTo(0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const wingL = new THREE.Mesh(wingGeo, lightMat);
  wingL.position.set(-0.35, 1.2, 0);
  wingL.rotation.set(0.2, -0.35, 0.55);
  root.add(wingL);
  const wingR = wingL.clone();
  wingR.position.set(0.35, 1.2, 0);
  wingR.rotation.set(0.2, 0.35, -0.55);
  root.add(wingR);

  addMesh(root, new THREE.CapsuleGeometry(0.16, 0.9, 3, 6), bodyMat, 0, 0.7, -0.95, 1, 1, 1, 0.9, 0, 0);
  addMesh(root, new THREE.ConeGeometry(0.22, 0.4, 5), darkMat, 0, 0.35, -1.55, 1, 1, 1, Math.PI, 0, 0);
  for (const [x, z] of [
    [-0.35, 0.35],
    [0.35, 0.35],
    [-0.32, -0.35],
    [0.32, -0.35],
  ]) {
    addMesh(root, new THREE.CapsuleGeometry(0.1, 0.35, 3, 5), darkMat, x, 0.35, z);
    addMesh(root, new THREE.BoxGeometry(0.18, 0.08, 0.28), darkMat, x, 0.08, z + 0.05);
  }
  for (let i = 0; i < 5; i++) {
    addMesh(root, new THREE.ConeGeometry(0.07, 0.22, 4), darkMat, 0, 1.35 - i * 0.05, 0.35 - i * 0.28, 1, 1, 1, 0.15, 0, 0);
  }
  root.updateMatrixWorld(true);
  return root;
}

const dragon = buildDragon();
await new Promise((resolve, reject) => {
  new GLTFExporter().parse(
    dragon,
    (result) => {
      const buf = Buffer.from(result);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf);
      console.log(`Wrote ${outPath} (${buf.length} bytes)`);
      resolve();
    },
    reject,
    { binary: true }
  );
});
