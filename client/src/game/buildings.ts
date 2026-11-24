import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { stripRoofs } from "./town";

export type PlacedBuilding = {
  url: string;
  x: number;
  z: number;
  scale?: number;
  rotY?: number;
  /** If true, run roof strip heuristic after load. */
  stripRoof?: boolean;
};

/** Poly Pizza Quaternius buildings that downloaded cleanly (CC0 via KivLoft mirror). */
export const POLY_BUILDINGS: PlacedBuilding[] = [
  { url: "/models/buildings/hut.glb", x: 9, z: -6, scale: 1.1, rotY: 0.4, stripRoof: true },
  { url: "/models/buildings/small-farm.glb", x: -12, z: 2, scale: 0.9, rotY: -0.3, stripRoof: true },
  { url: "/models/buildings/farm-a.glb", x: -14, z: -5, scale: 0.75, rotY: 0.2, stripRoof: true },
  { url: "/models/buildings/farm-b.glb", x: 12, z: 6, scale: 0.7, rotY: -0.5, stripRoof: true },
  { url: "/models/buildings/house-a.glb", x: 4, z: -8, scale: 0.85, rotY: 0.1, stripRoof: true },
  { url: "/models/buildings/house-b.glb", x: -6, z: -9, scale: 0.8, rotY: 0.6, stripRoof: true },
  { url: "/models/buildings/houses.glb", x: 14, z: -2, scale: 0.55, rotY: -0.2, stripRoof: true },
  { url: "/models/buildings/fantasy-house.glb", x: -3, z: 8, scale: 0.65, rotY: 0.35, stripRoof: true },
  { url: "/models/buildings/watch-tower.glb", x: -16, z: 12, scale: 0.9, rotY: 0, stripRoof: true },
  { url: "/models/buildings/stone-wall-towers.glb", x: 2, z: 14, scale: 0.7, rotY: 0.15, stripRoof: true },
];

/** Kenney Graveyard Kit props (CC0) — no roof meshes. */
export const KENNEY_PROPS: PlacedBuilding[] = [
  { url: "/models/kenney/crypt.glb", x: -10, z: 16, scale: 1.2, rotY: 0.2 },
  { url: "/models/kenney/crypt-small.glb", x: -8, z: 18, scale: 1.1 },
  { url: "/models/kenney/brick-wall.glb", x: -12, z: 14, scale: 1.4, rotY: 0.1 },
  { url: "/models/kenney/brick-wall.glb", x: -7, z: 14, scale: 1.4, rotY: 0.1 },
  { url: "/models/kenney/iron-fence.glb", x: -14, z: 15, scale: 1.3, rotY: Math.PI / 2 },
  { url: "/models/kenney/iron-fence-border-gate.glb", x: -11, z: 13.5, scale: 1.2 },
  { url: "/models/kenney/grave.glb", x: -9, z: 17, scale: 1.1 },
  { url: "/models/kenney/gravestone-cross.glb", x: -8.2, z: 17.5, scale: 1.1 },
  { url: "/models/kenney/gravestone-bevel.glb", x: -9.6, z: 17.8, scale: 1.1 },
  { url: "/models/kenney/bench.glb", x: -10.5, z: 15.2, scale: 1.1, rotY: 0.4 },
  { url: "/models/kenney/lightpost-single.glb", x: -11.5, z: 14.2, scale: 1.15 },
  { url: "/models/kenney/pine.glb", x: -15, z: 17, scale: 1.3 },
  { url: "/models/kenney/pine.glb", x: -6, z: 19, scale: 1.1 },
  { url: "/models/kenney/column-large.glb", x: -13, z: 18, scale: 1.0 },
];

function placeLoaded(scene: THREE.Object3D, place: PlacedBuilding): THREE.Group {
  const root = new THREE.Group();
  root.name = place.url.split("/").pop() || "building";
  if (place.stripRoof) stripRoofs(scene);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const target = 4.5;
  const span = Math.max(size.x, size.z, 0.001);
  const s = (place.scale ?? 1) * (target / span);
  scene.scale.setScalar(s);
  scene.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(scene);
  scene.position.y -= box2.min.y;
  root.add(scene);
  root.position.set(place.x, 0, place.z);
  if (place.rotY) root.rotation.y = place.rotY;
  return root;
}

export function loadPlacedModels(places: PlacedBuilding[]): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.name = "PlacedBuildings";
  const loader = new GLTFLoader();
  return Promise.all(
    places.map(
      (place) =>
        new Promise<void>((resolve) => {
          loader.load(
            place.url,
            (gltf) => {
              try {
                group.add(placeLoaded(gltf.scene, place));
              } catch (e) {
                console.warn("place failed", place.url, e);
              }
              resolve();
            },
            undefined,
            () => {
              console.warn("building load failed", place.url);
              resolve();
            }
          );
        })
    )
  ).then(() => group);
}
