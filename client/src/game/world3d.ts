import * as THREE from "three";
import { TOWN_BOUNDS, WORLD_NODES, type WorldNode } from "../content/world";
import { PET_SPECIES } from "../content/pets";
import { makeDragonInstance, makeEggInstance } from "./dragon";
import { loadStarterTown } from "./town";
import { loadPetModel } from "./pet-models";
import { KENNEY_PROPS, POLY_BUILDINGS, loadPlacedModels } from "./buildings";

export type InteractTarget = {
  node: WorldNode;
  distance: number;
};

const GROUND_Y = 0;

export class World3D {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  player: THREE.Group;
  petRoot: THREE.Group;
  petOrb: THREE.Mesh;
  petDragon: THREE.Object3D | null = null;
  activePetSpecies: string | null = null;
  targetMarker: THREE.Mesh;
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  ground: THREE.Mesh;
  nodeMeshes = new Map<string, THREE.Object3D>();
  enemyHp = new Map<string, number>();
  nodeCooldown = new Map<string, number>();
  dynamicNodes: WorldNode[] = [];

  moveTarget: THREE.Vector3 | null = null;
  speed = 6;
  pendingInteract?: string;
  onInteract: ((node: WorldNode) => void) | null = null;
  onHover: ((label: string | null) => void) | null = null;
  /** Right-click ground / node / active pet for context menu. */
  onContext: ((info: {
    clientX: number;
    clientY: number;
    ground: { x: number; z: number };
    node: WorldNode | null;
    hitPet: boolean;
  }) => void) | null = null;

  constructor(canvasParent: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2230);
    this.scene.fog = new THREE.Fog(0x1a2230, 28, 55);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
    this.camera.position.set(0, 18, 16);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    canvasParent.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffe6c8, 0x2a3344, 1.1);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffd9a0, 0.85);
    dir.position.set(8, 16, 6);
    this.scene.add(dir);

    // Cobble ground
    const groundGeo = new THREE.PlaneGeometry(60, 60, 40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5c5750,
      roughness: 0.95,
      metalness: 0.05,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Town plaza disk
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(7, 32),
      new THREE.MeshStandardMaterial({ color: 0x6e685e, roughness: 0.9 })
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.02;
    this.scene.add(plaza);

    // Road toward outskirts
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 28),
      new THREE.MeshStandardMaterial({ color: 0x4a463e })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(-8, 0.03, 10);
    road.rotation.z = Math.PI / 6;
    this.scene.add(road);

    this.buildBuildings(); // open-top / no roofs
    this.buildLamps();
    this.spawnNodes();
    void this.loadTownScene();
    void this.loadExtraBuildings();

    // Player
    this.player = new THREE.Group();
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
    this.player.add(body, hat);
    this.scene.add(this.player);

    this.petRoot = new THREE.Group();
    this.petRoot.visible = false;
    this.petOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf6e27a, emissive: 0x664400, emissiveIntensity: 0.35 })
    );
    this.petRoot.add(this.petOrb);
    this.scene.add(this.petRoot);

    this.targetMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.48, 24),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    this.targetMarker.rotation.x = -Math.PI / 2;
    this.targetMarker.position.y = 0.05;
    this.targetMarker.visible = false;
    this.scene.add(this.targetMarker);

    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", (e) => this.onPointer(e));
    this.renderer.domElement.addEventListener("pointermove", (e) => this.onPointerMove(e));
    this.renderer.domElement.addEventListener("contextmenu", (e) => this.onContextMenu(e));
  }

  setPlayerPosition(x: number, z: number) {
    this.player.position.set(x, GROUND_Y, z);
  }

  setActivePetColor(color: number | null) {
    if (color == null) {
      this.petRoot.visible = false;
      return;
    }
    this.petRoot.visible = true;
    if (this.activePetSpecies !== "dwarf_dragon") {
      this.petOrb.visible = true;
      if (this.petDragon) this.petDragon.visible = false;
      (this.petOrb.material as THREE.MeshStandardMaterial).color.setHex(color);
      (this.petOrb.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    }
  }

  setActivePetSpecies(speciesId: string | null, colorHex?: number) {
    this.activePetSpecies = speciesId;
    if (!speciesId) {
      this.petRoot.visible = false;
      return;
    }
    this.petRoot.visible = true;
    this.petOrb.visible = false;
    if (this.petDragon) {
      this.petRoot.remove(this.petDragon);
      this.petDragon = null;
    }
    // Prefer Poly Pizza GLB; dwarf_dragon still supports colour tint
    this.petDragon = loadPetModel(speciesId, colorHex);
    this.petRoot.add(this.petDragon);
    this.petDragon.visible = true;
  }

  spawnGroundEgg(x: number, z: number, itemId = "amethyst_egg") {
    // Only one world egg at a time
    for (const n of [...this.dynamicNodes]) {
      if (n.kind === "ground_egg") this.removeDynamicNode(n.id);
    }
    const id = `ground_egg_${Date.now().toString(36)}`;
    const node: WorldNode = {
      id,
      kind: "ground_egg",
      label: "Amethyst Dragon Egg",
      x,
      z,
      meta: { itemId, interactRadius: 2.2 },
    };
    this.dynamicNodes.push(node);
    const mesh = this.makeNodeMesh(node);
    mesh.position.set(x, 0, z);
    mesh.userData.nodeId = id;
    this.scene.add(mesh);
    this.nodeMeshes.set(id, mesh);
  }

  removeDynamicNode(id: string) {
    this.dynamicNodes = this.dynamicNodes.filter((n) => n.id !== id);
    const mesh = this.nodeMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      this.nodeMeshes.delete(id);
    }
  }

  allNodes(): WorldNode[] {
    return [...WORLD_NODES, ...this.dynamicNodes];
  }

  private async loadTownScene() {
    try {
      const town = await loadStarterTown();
      // Offset slightly so NPCs/nodes stay readable around the plaza
      town.position.set(0, 0, -1);
      this.scene.add(town);
    } catch (e) {
      console.warn("Starter town failed to load", e);
    }
  }

  /** Poly Pizza houses + Kenney graveyard props (roofs stripped where applicable). */
  private async loadExtraBuildings() {
    try {
      const poly = await loadPlacedModels(POLY_BUILDINGS);
      this.scene.add(poly);
    } catch (e) {
      console.warn("Poly buildings failed", e);
    }
    try {
      const kenney = await loadPlacedModels(KENNEY_PROPS);
      this.scene.add(kenney);
    } catch (e) {
      console.warn("Kenney props failed", e);
    }
  }

  /** Open-top buildings (no roofs) — see-inside RS rule. */
  private buildBuildings() {
    const brick = new THREE.MeshStandardMaterial({ color: 0x8b5a4a, roughness: 0.85 });
    const places = [
      { x: -5, z: -2, w: 4, d: 3, h: 2.6 },
      { x: 5, z: -1, w: 3.5, d: 3, h: 2.4 },
      { x: -1, z: 3.5, w: 5, d: 2.5, h: 2.2 },
      { x: 7, z: 4, w: 2.8, d: 2.8, h: 2.0 },
    ];
    for (const p of places) {
      // Four walls + floor, open top
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(p.w, 0.08, p.d),
        new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 })
      );
      floor.position.set(p.x, 0.04, p.z);
      this.scene.add(floor);
      const wallMat = brick;
      const t = 0.12;
      const walls: [number, number, number, number, number, number][] = [
        [p.x, p.h / 2, p.z - p.d / 2, p.w, p.h, t],
        [p.x, p.h / 2, p.z + p.d / 2, p.w, p.h, t],
        [p.x - p.w / 2, p.h / 2, p.z, t, p.h, p.d],
        [p.x + p.w / 2, p.h / 2, p.z, t, p.h, p.d],
      ];
      for (const [x, y, z, w, h, d] of walls) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        wall.position.set(x, y, z);
        this.scene.add(wall);
      }
    }
  }

  private buildLamps() {
    const posts = [
      [0, -6],
      [4, 1],
      [-4, 1],
      [-10, 12],
      [-15, 18],
    ];
    for (const [x, z] of posts) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.6, roughness: 0.4 })
      );
      pole.position.set(x, 1.2, z);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffaa33, emissiveIntensity: 0.9 })
      );
      lamp.position.set(x, 2.45, z);
      const light = new THREE.PointLight(0xffc978, 0.55, 10);
      light.position.set(x, 2.4, z);
      this.scene.add(pole, lamp, light);
    }
  }

  private spawnNodes() {
    for (const node of WORLD_NODES) {
      const mesh = this.makeNodeMesh(node);
      mesh.position.set(node.x, 0, node.z);
      mesh.userData.nodeId = node.id;
      this.scene.add(mesh);
      this.nodeMeshes.set(node.id, mesh);
      if (node.kind === "enemy") this.enemyHp.set(node.id, Number(node.meta?.hp ?? 5));
    }
  }

  private makeNodeMesh(node: WorldNode): THREE.Object3D {
    const g = new THREE.Group();
    if (node.kind === "tree") {
      const isOak = String(node.meta?.tree ?? "") === "oak";
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(isOak ? 0.28 : 0.2, isOak ? 0.36 : 0.28, isOak ? 1.8 : 1.4, 8),
        new THREE.MeshStandardMaterial({ color: isOak ? 0x4a3220 : 0x5a3a22 })
      );
      trunk.position.y = isOak ? 0.9 : 0.7;
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(isOak ? 1.15 : 0.9, 10, 10),
        new THREE.MeshStandardMaterial({ color: isOak ? 0x2f5a32 : 0x3f6b3a })
      );
      leaves.position.y = isOak ? 2.2 : 1.8;
      g.add(trunk, leaves);
    } else if (node.kind === "rock") {
      g.add(
        new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.7),
          new THREE.MeshStandardMaterial({ color: 0x7a756c, roughness: 0.9 })
        )
      );
      g.children[0].position.y = 0.4;
    } else if (node.kind === "fish") {
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(1.4, 20),
        new THREE.MeshStandardMaterial({ color: 0x3a6e7a, transparent: true, opacity: 0.85 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.04;
      g.add(water);
    } else if (node.kind === "forge") {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x44444c, emissive: 0x551100, emissiveIntensity: 0.35 })
      );
      block.position.y = 0.5;
      g.add(block);
    } else if (node.kind === "bench") {
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.2, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x6b4b2a })
      );
      top.position.y = 0.7;
      g.add(top);
    } else if (node.kind === "npc") {
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 0.55, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b4513 })
      );
      body.position.y = 0.8;
      g.add(body);
    } else if (node.kind === "enemy") {
      if (node.meta?.model === "purple-dragon") {
        const dragon = makeDragonInstance(1.85);
        dragon.rotation.y = Math.PI * 0.75;
        g.add(dragon);
        // Soft purple aura
        const aura = new THREE.PointLight(0x8a4dff, 0.7, 12);
        aura.position.set(0, 2.2, 0);
        g.add(aura);
      } else {
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.3, 0.4, 4, 8),
          new THREE.MeshStandardMaterial({ color: node.meta?.boss ? 0x6a4cff : 0x5a5a62 })
        );
        body.position.y = 0.7;
        g.add(body);
      }
    } else if (node.kind === "wild_pet") {
      const spId = String(node.meta?.species ?? "");
      g.add(loadPetModel(spId));
    } else if (node.kind === "zone") {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.12, 8, 24, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x8ec5ff, emissive: 0x224466, emissiveIntensity: 0.5 })
      );
      arch.position.y = 1.2;
      arch.rotation.y = Math.PI / 2;
      g.add(arch);
    } else if (node.kind === "ground_egg") {
      const egg = makeEggInstance(0.9);
      g.add(egg);
      const glow = new THREE.PointLight(0xb48cff, 0.85, 6);
      glow.position.set(0, 0.8, 0);
      g.add(glow);
    }
    return g;
  }

  resize() {
    const parent = this.renderer.domElement.parentElement!;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private pickGround(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.ground);
    if (!hits[0]) return null;
    const p = hits[0].point.clone();
    p.x = THREE.MathUtils.clamp(p.x, TOWN_BOUNDS.minX, TOWN_BOUNDS.maxX);
    p.z = THREE.MathUtils.clamp(p.z, TOWN_BOUNDS.minZ, TOWN_BOUNDS.maxZ);
    p.y = GROUND_Y;
    return p;
  }

  private nearestNode(point: THREE.Vector3, maxDist = 1.6): WorldNode | null {
    let best: WorldNode | null = null;
    let bestD = Infinity;
    for (const node of this.allNodes()) {
      const mesh = this.nodeMeshes.get(node.id);
      if (mesh && !mesh.visible) continue;
      // Prefer loot eggs over enemies when both are in range
      const radius = Number(node.meta?.interactRadius ?? maxDist);
      const d = Math.hypot(node.x - point.x, node.z - point.z);
      const limit = Math.max(maxDist, radius);
      if (d > limit) continue;
      const score = d - (node.kind === "ground_egg" ? 1.5 : 0);
      if (score < bestD) {
        bestD = score;
        best = node;
      }
    }
    return best;
  }

  private onPointer(event: PointerEvent) {
    if (event.button !== 0) return;
    const point = this.pickGround(event);
    if (!point) return;
    const node = this.nearestNode(point, 2.8);
    this.moveTarget = point;
    this.targetMarker.position.set(point.x, 0.05, point.z);
    this.targetMarker.visible = true;
    this.pendingInteract = node?.id;
  }

  private onContextMenu(event: MouseEvent) {
    event.preventDefault();
    const point = this.pickGround(event as unknown as PointerEvent);
    if (!point) return;
    const node = this.nearestNode(point, 2.8);
    const hitPet = this.petRoot.visible && Math.hypot(point.x - this.petRoot.position.x, point.z - this.petRoot.position.z) < 1.4;
    this.onContext?.({
      clientX: event.clientX,
      clientY: event.clientY,
      ground: { x: point.x, z: point.z },
      node,
      hitPet,
    });
  }

  private onPointerMove(event: PointerEvent) {
    const point = this.pickGround(event);
    if (!point) {
      this.onHover?.(null);
      return;
    }
    const node = this.nearestNode(point, 1.5);
    const hitPet = this.petRoot.visible && Math.hypot(point.x - this.petRoot.position.x, point.z - this.petRoot.position.z) < 1.2;
    if (hitPet && this.activePetSpecies) {
      this.onHover?.(PET_SPECIES[this.activePetSpecies]?.name ?? "Pet");
      return;
    }
    this.onHover?.(node ? node.label : null);
  }

  update(dt: number) {
    if (this.moveTarget) {
      const pos = this.player.position;
      const dx = this.moveTarget.x - pos.x;
      const dz = this.moveTarget.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.15) {
        this.moveTarget = null;
        this.targetMarker.visible = false;
        if (this.pendingInteract) {
          const node = this.allNodes().find((n) => n.id === this.pendingInteract);
          this.pendingInteract = undefined;
          if (node) this.onInteract?.(node);
        }
      } else {
        const step = Math.min(dist, this.speed * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        this.player.rotation.y = Math.atan2(dx, dz);
      }
    }

    // Camera follow (RS07-ish high oblique)
    const desired = new THREE.Vector3(
      this.player.position.x + 0,
      this.player.position.y + 16,
      this.player.position.z + 14
    );
    this.camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    this.camera.lookAt(this.player.position.x, 0.8, this.player.position.z);

    // Pet follows
    if (this.petRoot.visible) {
      const isDrake = this.activePetSpecies === "dwarf_dragon";
      const followDist = isDrake ? 1.25 : 0.9;
      const bob = isDrake ? 0.05 : 0.08;
      const target = new THREE.Vector3(
        this.player.position.x - Math.sin(this.player.rotation.y) * followDist,
        (isDrake ? 0 : 0.45) + Math.sin(performance.now() / 400) * bob,
        this.player.position.z - Math.cos(this.player.rotation.y) * followDist
      );
      this.petRoot.position.lerp(target, 1 - Math.pow(0.01, dt));
      this.petRoot.rotation.y = this.player.rotation.y;
    }

    // Soft pulse on marker
    if (this.targetMarker.visible) {
      const s = 1 + Math.sin(performance.now() / 200) * 0.08;
      this.targetMarker.scale.set(s, s, s);
    }

    this.updateProgressSprites(dt);
    this.renderer.render(this.scene, this.camera);
  }

  getPlayerPos() {
    return { x: this.player.position.x, y: 0, z: this.player.position.z };
  }

  hideEnemy(id: string) {
    const m = this.nodeMeshes.get(id);
    if (m) m.visible = false;
  }

  showEnemy(id: string, hp: number) {
    const m = this.nodeMeshes.get(id);
    if (m) m.visible = true;
    this.enemyHp.set(id, hp);
  }

  walkTo(x: number, z: number, interactId?: string) {
    this.moveTarget = new THREE.Vector3(x, 0, z);
    this.targetMarker.position.set(x, 0.05, z);
    this.targetMarker.visible = true;
    this.pendingInteract = interactId;
  }

  /** Tiny spinning light for skilling progress (1–5 ticks). */
  private progressOrbs = new Map<string, { mesh: THREE.Mesh; light: THREE.PointLight; angle: number }>();

  startProgressSprite(nodeId: string) {
    this.stopProgressSprite(nodeId);
    const node = this.allNodes().find((n) => n.id === nodeId);
    if (!node) return;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffcc44, emissiveIntensity: 1.2 })
    );
    const light = new THREE.PointLight(0xffe088, 0.8, 4);
    mesh.position.set(node.x + 0.6, 1.1, node.z);
    light.position.copy(mesh.position);
    this.scene.add(mesh, light);
    this.progressOrbs.set(nodeId, { mesh, light, angle: 0 });
  }

  stopProgressSprite(nodeId: string) {
    const o = this.progressOrbs.get(nodeId);
    if (!o) return;
    this.scene.remove(o.mesh, o.light);
    this.progressOrbs.delete(nodeId);
  }

  private updateProgressSprites(dt: number) {
    for (const [id, o] of this.progressOrbs) {
      const node = this.allNodes().find((n) => n.id === id);
      if (!node) continue;
      o.angle += dt * 6;
      o.mesh.position.set(node.x + Math.cos(o.angle) * 0.55, 1.0 + Math.sin(o.angle * 2) * 0.1, node.z + Math.sin(o.angle) * 0.55);
      o.light.position.copy(o.mesh.position);
    }
  }

  /** World position for HTML hit splats. */
  projectToScreen(x: number, y: number, z: number): { x: number; y: number } | null {
    const v = new THREE.Vector3(x, y, z);
    v.project(this.camera);
    const el = this.renderer.domElement;
    const rect = el.getBoundingClientRect();
    return {
      x: (v.x * 0.5 + 0.5) * rect.width + rect.left,
      y: (-v.y * 0.5 + 0.5) * rect.height + rect.top,
    };
  }

  nodeWorldPos(nodeId: string): { x: number; y: number; z: number } | null {
    const node = this.allNodes().find((n) => n.id === nodeId);
    if (!node) return null;
    return { x: node.x, y: 1.2, z: node.z };
  }
}
