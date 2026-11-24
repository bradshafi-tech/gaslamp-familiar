import * as THREE from "three";

/** Shared Light Orb familiar mesh (world follower + battle stage). */
export function createLightOrbMesh(colorHex = 0xf6e27a): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.4,
    roughness: 0.35,
    metalness: 0.1,
  });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat);
  orb.name = "LightOrb";
  return orb;
}

export function tintLightOrb(orb: THREE.Mesh, colorHex: number) {
  const mat = orb.material as THREE.MeshStandardMaterial;
  mat.color.setHex(colorHex);
  mat.emissive.setHex(colorHex);
  mat.emissiveIntensity = 0.4;
}
