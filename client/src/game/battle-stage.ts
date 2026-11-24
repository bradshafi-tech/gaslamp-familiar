import * as THREE from "three";
import type { EquipmentState } from "@shared/index";
import type { WorldNode } from "../content/world";
import { PET_SPECIES } from "../content/pets";
import { applyPlayerEquipment, createPlayerModel } from "./player-model";
import { createLightOrbMesh } from "./light-orb";
import { createAlleyRatMesh, createMistShadeMesh } from "./alley-rat";
import { makeDragonInstance } from "./dragon";
import { loadPetModel } from "./pet-models";

/**
 * Pokémon-style battle view that renders the **same** player block model,
 * Light Orb / pet mesh, and enemy mesh used in the open world — no CSS sprites.
 */
export class BattleStage {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private root = new THREE.Group();
  private playerRoot = new THREE.Group();
  private petRoot = new THREE.Group();
  private enemyRoot = new THREE.Group();
  private petOrb: THREE.Mesh;
  private raf = 0;
  private running = false;
  private t0 = 0;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "battle-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    this.camera.position.set(0.4, 2.6, 6.2);
    this.camera.lookAt(0.2, 0.9, 0);

    this.scene.fog = new THREE.Fog(0x1a2838, 8, 18);
    this.scene.add(new THREE.HemisphereLight(0xffe6c8, 0x2a3344, 1.1));
    const key = new THREE.DirectionalLight(0xffd9a0, 0.85);
    key.position.set(3, 8, 4);
    this.scene.add(key);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 48),
      new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.95, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(4.15, 4.35, 48),
      new THREE.MeshStandardMaterial({ color: 0x2a3530, roughness: 0.9 })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.01;
    this.scene.add(rim);

    this.petOrb = createLightOrbMesh(0xf6e27a);
    this.petRoot.add(this.petOrb);

    this.playerRoot.position.set(-1.55, 0, 1.1);
    this.petRoot.position.set(-0.85, 0.35, 1.35);
    this.enemyRoot.position.set(1.75, 0, -0.85);

    this.root.add(this.playerRoot, this.petRoot, this.enemyRoot);
    this.scene.add(this.root);

    window.addEventListener("resize", () => this.resize());
  }

  show(opts: {
    enemy: WorldNode;
    petSpeciesId: string | null;
    petColor?: number;
    equipment?: EquipmentState;
  }) {
    this.clearGroup(this.playerRoot);
    this.clearGroup(this.enemyRoot);
    // Keep petRoot structure; rebuild contents below.

    const player = createPlayerModel();
    player.rotation.y = Math.PI * 0.15;
    if (opts.equipment) applyPlayerEquipment(player, opts.equipment);
    this.playerRoot.add(player);

    this.setupPet(opts.petSpeciesId, opts.petColor);
    this.setupEnemy(opts.enemy);

    this.resize();
    this.running = true;
    this.t0 = performance.now();
    cancelAnimationFrame(this.raf);
    const tick = (now: number) => {
      if (!this.running) return;
      const t = (now - this.t0) / 1000;
      this.playerRoot.position.y = Math.sin(t * 2.1) * 0.03;
      this.petRoot.position.y = 0.35 + Math.sin(t * 3.2 + 0.6) * 0.06;
      this.enemyRoot.position.y = Math.sin(t * 2.4 + 1.1) * 0.04;
      this.enemyRoot.rotation.y = Math.sin(t * 0.7) * 0.08 - 0.35;
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  hide() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.clearGroup(this.playerRoot);
    this.clearGroup(this.enemyRoot);
    this.clearGroup(this.petRoot);
    this.petOrb = createLightOrbMesh(0xf6e27a);
    this.petRoot.add(this.petOrb);
  }

  dispose() {
    this.hide();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private setupPet(speciesId: string | null, colorHex?: number) {
    this.clearGroup(this.petRoot);
    if (!speciesId) {
      this.petRoot.visible = false;
      return;
    }
    this.petRoot.visible = true;
    const color = colorHex ?? PET_SPECIES[speciesId]?.color ?? 0xf6e27a;

    // Light Orb (and world follower) is the glowing sphere — show that real mesh.
    if (speciesId === "lamp_moth" || speciesId === "light_orb") {
      this.petOrb = createLightOrbMesh(color);
      this.petRoot.add(this.petOrb);
      return;
    }

    if (speciesId === "dwarf_dragon") {
      const model = loadPetModel(speciesId, color);
      model.scale.setScalar(1.15);
      this.petRoot.add(model);
      return;
    }

    // Other familiars: real pet GLB on the battle stage.
    const model = loadPetModel(speciesId, color);
    model.scale.setScalar(1.2);
    this.petRoot.add(model);
  }

  private setupEnemy(node: WorldNode) {
    let mesh: THREE.Object3D;
    if (node.meta?.model === "purple-dragon") {
      mesh = makeDragonInstance(1.2);
      mesh.rotation.y = -Math.PI * 0.35;
    } else if (node.meta?.boss) {
      mesh = createMistShadeMesh();
      mesh.rotation.y = -Math.PI * 0.4;
    } else {
      mesh = createAlleyRatMesh(0x5a5a62);
      mesh.scale.setScalar(1.55);
      mesh.rotation.y = -Math.PI * 0.45;
    }
    this.enemyRoot.add(mesh);
  }

  private clearGroup(g: THREE.Group) {
    while (g.children.length) {
      const child = g.children[0]!;
      g.remove(child);
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) m?.dispose?.();
        }
      });
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w < 2 || h < 2) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
}
