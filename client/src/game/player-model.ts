import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

/** Poly Pizza Animated Character Base — https://poly.pizza/m/AZzoJo1FBm */
export const PLAYER_MODEL_URL = "/models/player/AZzoJo1FBm.glb";
/** Fit Mixamo-scale base to world units. */
export const PLAYER_MODEL_SCALE = 1.0;

type CachedGltf = { scene: THREE.Object3D; animations: THREE.AnimationClip[] };

let cached: CachedGltf | null = null;
let loading: Promise<CachedGltf | null> | null = null;

function loadSource(): Promise<CachedGltf | null> {
  if (cached) return Promise.resolve(cached);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      PLAYER_MODEL_URL,
      (gltf) => {
        cached = { scene: gltf.scene, animations: gltf.animations.slice() };
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

/** Player root with Poly Pizza Animated Character Base (capsule fallback until GLB loads). */
export function createPlayerModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = "Player";
  const fallback = makeCapsuleFallback();
  fallback.name = "PlayerFallback";
  root.add(fallback);
  root.userData.updatePlayer = (_dt: number) => {};

  void loadSource().then((pack) => {
    if (!pack) return;
    root.clear();
    // Skinned Mixamo mesh — clone skeleton correctly
    const model = SkeletonUtils.clone(pack.scene) as THREE.Object3D;
    model.scale.setScalar(PLAYER_MODEL_SCALE);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    model.position.y -= box.min.y;
    model.rotation.y = Math.PI;
    root.add(model);

    if (pack.animations.length) {
      const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(pack.animations[0]!);
      action.play();
      root.userData.updatePlayer = (dt: number) => mixer.update(dt);
    }
  });

  return root;
}
