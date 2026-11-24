export type WorldNode = {
  id: string;
  kind: "tree" | "rock" | "fish" | "forge" | "bench" | "npc" | "enemy" | "wild_pet" | "zone" | "ground_egg";
  label: string;
  x: number;
  z: number;
  meta?: Record<string, string | number | boolean>;
};

/**
 * Basic start map — functional skilling + combat only.
 * No decorative town/building packs. Follower pet is spawned separately.
 *
 * Layout (top = +Z):
 *   Combat (rats / shade)
 *   Fishing
 *   Trees (W) · spawn · Ores (E)
 *   NPCs · Furnace · Crafting bench (S)
 */
export const WORLD_NODES: WorldNode[] = [
  // Stations + quest NPCs (south)
  { id: "npc_mabel", kind: "npc", label: "Mabel the Lampwright", x: -3, z: -4, meta: { npc: "mabel" } },
  { id: "npc_forge", kind: "npc", label: "Forge Master Holt", x: 1, z: -4, meta: { npc: "holt" } },
  { id: "forge", kind: "forge", label: "Furnace", x: 4, z: -4 },
  { id: "bench", kind: "bench", label: "Crafting Station", x: 6.5, z: -3.5 },

  // Woodcutting (west)
  { id: "tree_1", kind: "tree", label: "Tree", x: -7, z: 1, meta: { tree: "tree", log: "tree_logs", xp: 25 } },
  { id: "tree_2", kind: "tree", label: "Tree", x: -9, z: 2.5, meta: { tree: "tree", log: "tree_logs", xp: 25 } },
  { id: "tree_3", kind: "tree", label: "Tree", x: -6.5, z: 3.5, meta: { tree: "tree", log: "tree_logs", xp: 25 } },
  { id: "tree_4", kind: "tree", label: "Tree", x: -8.5, z: 5, meta: { tree: "tree", log: "tree_logs", xp: 25 } },
  {
    id: "oak_1",
    kind: "tree",
    label: "Oak Tree",
    x: -10,
    z: 6.5,
    meta: { tree: "oak", log: "oak_logs", xp: 55, requiredWoodcutting: 20 },
  },
  {
    id: "oak_2",
    kind: "tree",
    label: "Oak Tree",
    x: -7.5,
    z: 7.5,
    meta: { tree: "oak", log: "oak_logs", xp: 55, requiredWoodcutting: 20 },
  },

  // Fishing (north of spawn)
  { id: "fish_pond", kind: "fish", label: "Fishing Spot", x: -1, z: 6.5, meta: { xp: 20 } },

  // Mining (east)
  { id: "rock_cu", kind: "rock", label: "Copper Vein", x: 7, z: 2, meta: { ore: "copper_ore", xp: 22 } },
  { id: "rock_sn", kind: "rock", label: "Tin Vein", x: 9, z: 3, meta: { ore: "tin_ore", xp: 22 } },
  { id: "rock_cu2", kind: "rock", label: "Copper Vein", x: 8, z: 5, meta: { ore: "copper_ore", xp: 22 } },
  { id: "rock_sn2", kind: "rock", label: "Tin Vein", x: 6.5, z: 4.5, meta: { ore: "tin_ore", xp: 22 } },

  // Combat (far north) — attackTicks = delay between enemy hits
  {
    id: "rat_1",
    kind: "enemy",
    label: "Alley Rat",
    x: 2.5,
    z: 9,
    meta: { hp: 6, xpAttack: 12, xpStr: 8, xpHp: 10, attackTicks: 4, maxHit: 1 },
  },
  {
    id: "rat_2",
    kind: "enemy",
    label: "Alley Rat",
    x: 4.5,
    z: 10,
    meta: { hp: 6, xpAttack: 12, xpStr: 8, xpHp: 10, attackTicks: 4, maxHit: 1 },
  },
  {
    id: "rat_3",
    kind: "enemy",
    label: "Alley Rat",
    x: 1,
    z: 10.5,
    meta: { hp: 6, xpAttack: 12, xpStr: 8, xpHp: 10, attackTicks: 4, maxHit: 1 },
  },
  {
    id: "shade",
    kind: "enemy",
    label: "Mist Shade",
    x: 3,
    z: 13,
    meta: { hp: 18, xpAttack: 30, xpStr: 20, xpHp: 24, xpMagic: 15, boss: true, attackTicks: 5, maxHit: 3 },
  },
];

/** Start-map walk bounds. */
export const TOWN_BOUNDS = { minX: -12, maxX: 12, minZ: -8, maxZ: 16 };
