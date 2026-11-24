import * as THREE from "three";
import type { EquipmentState } from "@shared/index";
import { ITEMS } from "../content/items";

/** Simple block/capsule avatar with a tan cube head and eyes. */
export function createPlayerModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = "Player";

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.75 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 8), bodyMat);
  body.position.y = 0.9;
  body.name = "body";

  const torsoMat = new THREE.MeshStandardMaterial({ color: 0x3a6a94, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.35), torsoMat);
  torso.position.y = 1.05;
  torso.name = "torso";

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.38, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.85 })
  );
  head.position.y = 1.55;
  head.name = "head";

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.4 });
  const eyeGeo = new THREE.BoxGeometry(0.07, 0.08, 0.04);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.09, 1.58, 0.2);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.09, 1.58, 0.2);

  const wearRoot = new THREE.Group();
  wearRoot.name = "wearRoot";

  root.add(body, torso, head, leftEye, rightEye, wearRoot);
  root.userData.bodyMat = bodyMat;
  root.userData.torsoMat = torsoMat;
  root.userData.wearRoot = wearRoot;
  root.userData.updatePlayer = (_dt: number) => {};
  return root;
}

/** Rebuild hat / top tint / bottoms tint / shield / held tool / amulet on the block man. */
export function applyPlayerEquipment(root: THREE.Group, equipment: EquipmentState) {
  const wearRoot = root.userData.wearRoot as THREE.Group | undefined;
  if (!wearRoot) return;

  while (wearRoot.children.length) {
    const child = wearRoot.children[0]!;
    wearRoot.remove(child);
    child.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) m?.dispose?.();
    });
  }

  const torsoMat = root.userData.torsoMat as THREE.MeshStandardMaterial | undefined;
  const bodyMat = root.userData.bodyMat as THREE.MeshStandardMaterial | undefined;
  const topDef = equipment.top ? ITEMS[equipment.top] : undefined;
  const bottomDef = equipment.bottoms ? ITEMS[equipment.bottoms] : undefined;
  if (torsoMat) torsoMat.color.setHex(topDef?.wearColor ?? 0x3a6a94);
  if (bodyMat) bodyMat.color.setHex(bottomDef?.wearColor ?? 0x2a3a4a);

  if (equipment.hat) {
    const hat = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.14, 0.42),
      new THREE.MeshStandardMaterial({
        color: ITEMS[equipment.hat]?.wearColor ?? 0xc4b49a,
        roughness: 0.85,
      })
    );
    hat.position.y = 1.78;
    const brim = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.04, 0.5),
      new THREE.MeshStandardMaterial({
        color: ITEMS[equipment.hat]?.wearColor ?? 0xc4b49a,
        roughness: 0.85,
      })
    );
    brim.position.y = 1.7;
    wearRoot.add(hat, brim);
  }

  if (equipment.amulet) {
    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({
        color: ITEMS[equipment.amulet]?.wearColor ?? 0xc9a227,
        metalness: 0.55,
        roughness: 0.35,
        emissive: ITEMS[equipment.amulet]?.wearColor ?? 0xc9a227,
        emissiveIntensity: 0.15,
      })
    );
    gem.position.set(0, 1.32, 0.2);
    wearRoot.add(gem);
  }

  if (equipment.shield) {
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12),
      new THREE.MeshStandardMaterial({
        color: ITEMS[equipment.shield]?.wearColor ?? 0x6b4b2a,
        roughness: 0.8,
      })
    );
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.42, 1.0, 0.05);
    wearRoot.add(shield);
  }

  if (equipment.weapon) {
    const held = makeHeldMesh(equipment.weapon);
    if (held) wearRoot.add(held);
  }
}

function makeHeldMesh(itemId: string): THREE.Object3D | null {
  const g = new THREE.Group();
  g.position.set(0.42, 0.95, 0.05);
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.45, roughness: 0.45 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.85 });

  if (itemId === "bronze_sword") {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.02), bronze);
    blade.position.y = 0.28;
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.04), wood);
    g.add(blade, hilt);
  } else if (itemId === "basic_staff") {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.85, 6), wood);
    shaft.position.y = 0.35;
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x6a9ec9, emissive: 0x224466, emissiveIntensity: 0.4 })
    );
    tip.position.y = 0.8;
    g.add(shaft, tip);
  } else if (itemId === "bronze_axe") {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 6), wood);
    shaft.position.y = 0.25;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), bronze);
    head.position.set(0.08, 0.48, 0);
    g.add(shaft, head);
  } else if (itemId === "bronze_pickaxe") {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 6), wood);
    shaft.position.y = 0.25;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), bronze);
    head.position.set(0, 0.5, 0);
    g.add(shaft, head);
  } else if (itemId === "fishing_rod") {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.9, 6), wood);
    shaft.position.y = 0.4;
    shaft.rotation.z = -0.25;
    g.add(shaft);
  } else {
    return null;
  }
  return g;
}
