import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const TOWN_URL = "/models/starter-town.glb";

const ROOF_NAME = /roof|rooftop|thatch|awning|ceiling|top_roof|roofing/i;

/** Hide roof-like meshes so interiors stay visible (RS-style see-inside). */
export function stripRoofs(root: THREE.Object3D) {
  root.traverse((obj) => {
    const name = obj.name || "";
    if (ROOF_NAME.test(name)) {
      obj.visible = false;
      return;
    }
    // Heuristic: thin horizontal boxes high above ground
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box) return;
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    mesh.updateWorldMatrix(true, false);
    const worldY = new THREE.Vector3();
    mesh.getWorldPosition(worldY);
    if (size.y < 0.35 && size.x > 1.2 && size.z > 1.2 && worldY.y + center.y > 2.2) {
      mesh.visible = false;
    }
  });
}

export function loadStarterTown(): Promise<THREE.Group> {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      TOWN_URL,
      (gltf) => {
        const root = new THREE.Group();
        root.name = "StarterTown";
        const scene = gltf.scene;
        stripRoofs(scene);

        // Fit / place as spawn plaza
        scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        // Scale so footprint ~18 units across
        const target = 18;
        const span = Math.max(size.x, size.z, 0.001);
        const s = target / span;
        scene.scale.setScalar(s);
        scene.position.set(-center.x * s, -box.min.y * s, -center.z * s);

        root.add(scene);
        resolve(root);
      },
      undefined,
      () => {
        // Fallback empty group — procedural town still renders
        resolve(new THREE.Group());
      }
    );
  });
}
