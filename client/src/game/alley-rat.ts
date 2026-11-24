import * as THREE from "three";

/**
 * Procedural Alley Rat — same mesh used in the open world and on the battle stage.
 * Compact scavenger silhouette (body, head, ears, tail, legs) so targeting and
 * battle both show the real model, not a capsule stand-in.
 */
export function createAlleyRatMesh(tint = 0x5a5a62): THREE.Group {
  const root = new THREE.Group();
  root.name = "AlleyRat";

  const fur = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.88, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tint).multiplyScalar(0.55),
    roughness: 0.9,
  });
  const pink = new THREE.MeshStandardMaterial({ color: 0xc48a8a, roughness: 0.75 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.35 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), fur);
  body.scale.set(1.35, 0.85, 0.95);
  body.position.set(0, 0.32, 0);

  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), fur);
  haunch.scale.set(0.9, 0.85, 1.1);
  haunch.position.set(-0.18, 0.3, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), fur);
  head.position.set(0.28, 0.4, 0);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 8), fur);
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.4, 0.36, 0);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), pink);
  nose.position.set(0.48, 0.36, 0);

  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), pink);
    ear.scale.set(0.7, 1.15, 0.35);
    ear.position.set(0.22, 0.54, side * 0.1);
    root.add(ear);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat);
    eye.position.set(0.36, 0.44, side * 0.08);
    root.add(eye);

    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 6), dark);
    fore.position.set(0.14, 0.1, side * 0.12);
    const hind = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.18, 6), dark);
    hind.position.set(-0.16, 0.1, side * 0.12);
    root.add(fore, hind);
  }

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.55, 6), dark);
  tail.rotation.z = Math.PI / 2.4;
  tail.position.set(-0.42, 0.28, 0);

  root.add(body, haunch, head, snout, nose, tail);
  return root;
}

/** Mist Shade boss — taller, violet-tinted rat silhouette. */
export function createMistShadeMesh(): THREE.Group {
  const root = createAlleyRatMesh(0x6a4cff);
  root.name = "MistShade";
  root.scale.setScalar(1.35);
  const aura = new THREE.PointLight(0x8a4dff, 0.55, 5);
  aura.position.set(0, 0.7, 0);
  root.add(aura);
  return root;
}
