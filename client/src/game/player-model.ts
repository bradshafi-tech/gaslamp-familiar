import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** Poly Pizza Character Base — https://poly.pizza/m/qbDLeTtb8K */
export const PLAYER_MODEL_URL = "/models/player/qbDLeTtb8K.glb";
/** Fit low-poly base into ~1.7 unit tall capsule silhouette. */
export const PLAYER_MODEL_SCALE = 1.05;

let cached: THREE.Object3D | null = null;
let loading: Promise<THREE.Object3D | null> | null = null;

function loadSource(): Promise<THREE.Object3D | null> {
  if (cached) return Promise.resolve(cached);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      PLAYER_MODEL_URL,
      (gltf) => {
        cached = gltf.scene;
        resolve(cached);
      },
      undefined,
      () => resolve(null)
    );
  });
  return loading;
}

function makeCapsuleFallback(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f5d8a })
  );
  body.position.y = 0.9;
  const hat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.25, 10),
    new THREE.MeshStandardMaterial({ color: 0x1c1c22 })
  );
  hat.position.y = 1.55;
  g.add(body, hat);
  return g;
}

/** Player root with Poly Pizza Character Base (capsule fallback until GLB loads). */
export function createPlayerModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = "Player";
  const fallback = makeCapsuleFallback();
  fallback.name = "PlayerFallback";
  root.add(fallback);

  void loadSource().then((src) => {
    if (!src) return;
    root.clear();
    const model = src.clone(true);
    model.scale.setScalar(PLAYER_MODEL_SCALE);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    // Sit on ground plane
    model.position.y -= box.min.y;
    // Face camera-forward convention used by walk rotation
    model.rotation.y = Math.PI;
    root.add(model);
  });

  return root;
}
