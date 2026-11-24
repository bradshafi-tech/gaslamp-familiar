import * as THREE from "three";

/** Simple block/capsule avatar (no external GLB). */
export function createPlayerModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = "Player";

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f5d8a, roughness: 0.75 })
  );
  body.position.y = 0.9;

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.45, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x3a6a94, roughness: 0.8 })
  );
  torso.position.y = 1.05;

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.38, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.85 })
  );
  head.position.y = 1.55;

  root.add(body, torso, head);
  root.userData.updatePlayer = (_dt: number) => {};
  return root;
}
