import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL_URL = "/models/purple-dragon.glb";

let cached: THREE.Object3D | null = null;
let loading: Promise<THREE.Object3D> | null = null;

/** Procedural fallback if GLB fails to load. */
export function buildProceduralPurpleDragon(): THREE.Group {
  const root = new THREE.Group();
  root.name = "PurpleDragonProcedural";
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6b3fa0, flatShading: true, roughness: 0.72 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a1f5c, flatShading: true, roughness: 0.72 });
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0x9b6fd4,
    flatShading: true,
    emissive: 0x2a1040,
    emissiveIntensity: 0.15,
  });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xc4a6e8, flatShading: true, roughness: 0.85 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xf0e6ff,
    emissive: 0xaa88ff,
    emissiveIntensity: 0.45,
    flatShading: true,
  });

  const add = (
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0
  ) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    root.add(m);
  };

  add(new THREE.CapsuleGeometry(0.55, 1.1, 4, 8), bodyMat, 0, 0.95, 0, 1, 1, 1.15);
  add(new THREE.SphereGeometry(0.48, 8, 6), bellyMat, 0, 0.75, 0.28, 1.1, 0.9, 0.85);
  add(new THREE.CapsuleGeometry(0.22, 0.55, 3, 6), bodyMat, 0, 1.55, 0.55, 1, 1, 1, -0.7, 0, 0);
  add(new THREE.SphereGeometry(0.38, 8, 6), lightMat, 0, 1.95, 0.95);
  add(new THREE.ConeGeometry(0.18, 0.45, 5), darkMat, 0, 1.95, 1.35, 1, 1, 1, Math.PI / 2, 0, 0);
  add(new THREE.ConeGeometry(0.08, 0.35, 5), darkMat, -0.18, 2.28, 0.85, 1, 1, 1, 0.25, 0, -0.2);
  add(new THREE.ConeGeometry(0.08, 0.35, 5), darkMat, 0.18, 2.28, 0.85, 1, 1, 1, 0.25, 0, 0.2);
  add(new THREE.SphereGeometry(0.07, 6, 6), eyeMat, -0.16, 2.05, 1.2);
  add(new THREE.SphereGeometry(0.07, 6, 6), eyeMat, 0.16, 2.05, 1.2);

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

  add(new THREE.CapsuleGeometry(0.16, 0.9, 3, 6), bodyMat, 0, 0.7, -0.95, 1, 1, 1, 0.9, 0, 0);
  add(new THREE.ConeGeometry(0.22, 0.4, 5), darkMat, 0, 0.35, -1.55, 1, 1, 1, Math.PI, 0, 0);
  for (const [x, z] of [
    [-0.35, 0.35],
    [0.35, 0.35],
    [-0.32, -0.35],
    [0.32, -0.35],
  ]) {
    add(new THREE.CapsuleGeometry(0.1, 0.35, 3, 5), darkMat, x, 0.35, z);
    add(new THREE.BoxGeometry(0.18, 0.08, 0.28), darkMat, x, 0.08, z + 0.05);
  }
  return root;
}

export function loadPurpleDragonModel(): Promise<THREE.Object3D> {
  if (cached) return Promise.resolve(cached.clone(true));
  if (!loading) {
    loading = new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load(
        MODEL_URL,
        (gltf) => {
          cached = gltf.scene;
          cached.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = true;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              for (const m of mats) {
                const std = m as THREE.MeshStandardMaterial;
                if (std.color) {
                  // Force purple tint in case exporter washed colors
                  const h = { h: 0, s: 0, l: 0 };
                  std.color.getHSL(h);
                  std.color.setHSL(0.75, Math.max(0.45, h.s), Math.min(0.55, Math.max(0.25, h.l)));
                }
              }
            }
          });
          resolve(cached.clone(true));
        },
        undefined,
        () => {
          cached = buildProceduralPurpleDragon();
          resolve(cached.clone(true));
        }
      );
    });
  }
  return loading.then((m) => m.clone(true));
}

/** Recolor all mesh materials toward a base hex (keeps relative lightness). */
export function tintDragon(root: THREE.Object3D, hex: number) {
  const base = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (!std?.color) continue;
      // Clone so shared materials across instances don't clash
      const cloned = std.clone();
      const cur = { h: 0, s: 0, l: 0 };
      cloned.color.getHSL(cur);
      const l = Math.min(0.72, Math.max(0.12, cur.l * 0.85 + hsl.l * 0.15));
      cloned.color.setHSL(hsl.h, Math.max(0.35, hsl.s * 0.9), l);
      if (cloned.emissive) {
        cloned.emissive.setHSL(hsl.h, 0.55, 0.12);
        cloned.emissiveIntensity = Math.max(cloned.emissiveIntensity, 0.12);
      }
      mesh.material = cloned;
    }
  });
}

export function makeDragonInstance(scale: number, colorHex = 0x6b3fa0): THREE.Group {
  const g = new THREE.Group();
  g.name = "DragonInstance";
  g.userData.colorHex = colorHex;
  const placeholder = buildProceduralPurpleDragon();
  placeholder.scale.setScalar(scale);
  tintDragon(placeholder, colorHex);
  g.add(placeholder);
  void loadPurpleDragonModel().then((model) => {
    // Skip if this instance was cleared
    if (!g.parent && g.children.length === 0) return;
    g.clear();
    model.scale.setScalar(scale);
    tintDragon(model, colorHex);
    g.add(model);
  });
  return g;
}

const EGG_URL = "/models/dragon-egg.glb";
let eggCached: THREE.Object3D | null = null;

function buildProceduralEgg(): THREE.Group {
  const root = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({
    color: 0x7a4fb8,
    flatShading: true,
    roughness: 0.55,
    emissive: 0x2a1048,
    emissiveIntensity: 0.2,
  });
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), shell);
  egg.scale.set(0.85, 1.15, 0.85);
  egg.position.y = 0.55;
  root.add(egg);
  const spot = new THREE.MeshStandardMaterial({ color: 0xd4b45a, flatShading: true });
  for (const [x, y, z, s] of [
    [0.35, 0.7, 0.25, 0.12],
    [-0.3, 0.9, 0.2, 0.1],
    [0.1, 0.4, 0.4, 0.08],
  ] as const) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 6, 6), spot);
    m.position.set(x, y, z);
    root.add(m);
  }
  return root;
}

export function makeEggInstance(scale = 0.85): THREE.Group {
  const g = new THREE.Group();
  g.name = "DragonEggInstance";
  const placeholder = buildProceduralEgg();
  placeholder.scale.setScalar(scale);
  g.add(placeholder);
  const loader = new GLTFLoader();
  loader.load(
    EGG_URL,
    (gltf) => {
      eggCached = gltf.scene;
      g.clear();
      const model = eggCached.clone(true);
      model.scale.setScalar(scale);
      g.add(model);
    },
    undefined,
    () => {
      /* keep procedural */
    }
  );
  return g;
}
