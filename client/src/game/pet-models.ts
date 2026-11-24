import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PET_SPECIES } from "../content/pets";

/** Poly Pizza CC0 models mapped onto the existing pet ladder. */
export const PET_MODEL_FILES: Record<string, { file: string; scale: number }> = {
  lamp_moth: { file: "TX8r9WBXpe.glb", scale: 0.22 }, // Ghost Skull
  street_ferret: { file: "4LjT020LQh.glb", scale: 0.28 }, // Enemy Small
  sparring_imp: { file: "Mo2ky6vkf8.glb", scale: 0.26 }, // Demon
  ember_sprite: { file: "UgBmRVnQ9h.glb", scale: 0.2 }, // Enemy Large (shrunk)
  river_newt: { file: "37wofOCOzG.glb", scale: 0.28 }, // Frog
  cobble_crow: { file: "kzpT6fNmM5.glb", scale: 0.24 }, // Enemy Flying
  mist_hare: { file: "1YE8U35HXsI.glb", scale: 0.3 }, // Chicken (ground critter stand-in)
  understreet_wisp: { file: "ypEYhCImAB.glb", scale: 0.22 }, // Fish
  dwarf_dragon: { file: "LlwD0QNUPj.glb", scale: 0.18 }, // Dragon Evolved
};

const cache = new Map<string, THREE.Object3D>();

export function loadPetModel(speciesId: string, colorHex?: number): THREE.Group {
  const g = new THREE.Group();
  g.name = `Pet_${speciesId}`;
  const conf = PET_MODEL_FILES[speciesId];
  const fallback = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
    new THREE.MeshStandardMaterial({
      color: colorHex ?? PET_SPECIES[speciesId]?.color ?? 0xaaaaaa,
      emissive: colorHex ?? PET_SPECIES[speciesId]?.color ?? 0x333333,
      emissiveIntensity: 0.25,
    })
  );
  fallback.position.y = 0.2;
  g.add(fallback);

  if (!conf) return g;

  const apply = (src: THREE.Object3D) => {
    g.clear();
    const model = src.clone(true);
    model.scale.setScalar(conf.scale);
    // Ground the model
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    model.position.y -= box.min.y;
    if (colorHex != null && speciesId === "dwarf_dragon") {
      tint(model, colorHex);
    }
    g.add(model);
  };

  const cached = cache.get(conf.file);
  if (cached) {
    apply(cached);
    return g;
  }

  const loader = new GLTFLoader();
  loader.load(
    `/models/pets/${conf.file}`,
    (gltf) => {
      cache.set(conf.file, gltf.scene);
      apply(gltf.scene);
    },
    undefined,
    () => {
      /* keep orb fallback */
    }
  );
  return g;
}

function tint(root: THREE.Object3D, hex: number) {
  const base = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = mats.map((m) => {
      const std = (m as THREE.MeshStandardMaterial).clone();
      if (std.color) {
        const cur = { h: 0, s: 0, l: 0 };
        std.color.getHSL(cur);
        std.color.setHSL(hsl.h, Math.max(0.35, hsl.s * 0.85), Math.min(0.7, Math.max(0.15, cur.l)));
      }
      return std;
    });
  });
}
