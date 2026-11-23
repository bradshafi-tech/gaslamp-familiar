export type WorldNode = {
  id: string;
  kind: "tree" | "rock" | "fish" | "forge" | "bench" | "npc" | "enemy" | "wild_pet" | "zone" | "ground_egg";
  label: string;
  x: number;
  z: number;
  meta?: Record<string, string | number | boolean>;
};

/** Victorian starter town + road into magical outskirts (local coords). */
export const WORLD_NODES: WorldNode[] = [
  // Town
  { id: "npc_mabel", kind: "npc", label: "Mabel the Lampwright", x: 2, z: -4, meta: { npc: "mabel" } },
  { id: "npc_forge", kind: "npc", label: "Forge Master Holt", x: -6, z: 3, meta: { npc: "holt" } },
  { id: "forge", kind: "forge", label: "Town Forge", x: -7.5, z: 4.5 },
  { id: "bench", kind: "bench", label: "Crafting Bench", x: 6, z: 2 },
  { id: "tree_oak_1", kind: "tree", label: "Oak Tree", x: 8, z: -8, meta: { tree: "oak", xp: 25 } },
  { id: "tree_oak_2", kind: "tree", label: "Oak Tree", x: 10, z: -6, meta: { tree: "oak", xp: 25 } },
  { id: "fish_pond", kind: "fish", label: "Gaslamp Pond", x: -3, z: -9, meta: { xp: 20 } },
  { id: "wild_crow", kind: "wild_pet", label: "Cobble Crow", x: 1, z: 6, meta: { species: "cobble_crow" } },
  { id: "rat_1", kind: "enemy", label: "Alley Rat", x: -2, z: 8, meta: { hp: 6, xpAttack: 12, xpStr: 8, xpHp: 10 } },
  { id: "rat_2", kind: "enemy", label: "Alley Rat", x: 4, z: 9, meta: { hp: 6, xpAttack: 12, xpStr: 8, xpHp: 10 } },

  // Road / outskirts
  { id: "rock_cu", kind: "rock", label: "Copper Vein", x: -14, z: 14, meta: { ore: "copper_ore", xp: 22 } },
  { id: "rock_sn", kind: "rock", label: "Tin Vein", x: -12, z: 16, meta: { ore: "tin_ore", xp: 22 } },
  { id: "tree_out", kind: "tree", label: "Oak Tree", x: -8, z: 18, meta: { tree: "oak", xp: 25 } },
  { id: "wild_hare", kind: "wild_pet", label: "Mist Hare", x: -16, z: 20, meta: { species: "mist_hare" } },
  { id: "shade", kind: "enemy", label: "Mist Shade", x: -18, z: 22, meta: { hp: 18, xpAttack: 30, xpStr: 20, xpHp: 24, xpMagic: 15, boss: true } },
  { id: "zone_under", kind: "zone", label: "Understreet Gate", x: -20, z: 24, meta: { zone: "understreet", requiredPetLevel: 3, requiredPetTrait: "catcher" } },

  // Beyond the gate — high-tier purple dragon boss (pet reward on defeat)
  {
    id: "boss_amethyst_drake",
    kind: "enemy",
    label: "Amethyst Drake",
    x: -24,
    z: 30,
    meta: {
      hp: 42,
      xpAttack: 48,
      xpStr: 32,
      xpHp: 36,
      xpMagic: 28,
      boss: true,
      bossId: "amethyst_drake",
      model: "purple-dragon",
      rewardEgg: "amethyst_egg",
      requireZone: "understreet",
      interactRadius: 2.6,
    },
  },
];

export const TOWN_BOUNDS = { minX: -28, maxX: 14, minZ: -12, maxZ: 34 };
