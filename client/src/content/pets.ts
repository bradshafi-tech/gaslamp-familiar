export type PetSpecies = {
  id: string;
  name: string;
  rarity: "common" | "uncommon" | "rare";
  traits: string[];
  unlock: "quest" | "skill" | "wild";
  skill?: string;
  skillLevel?: number;
  catchTier: number;
  color: number;
  desc: string;
  /** Poly Pizza GLB filename under /models/pets/ */
  modelFile?: string;
};

export const PET_SPECIES: Record<string, PetSpecies> = {
  lamp_moth: {
    id: "lamp_moth",
    name: "Lamp Moth",
    rarity: "common",
    traits: ["companion"],
    unlock: "quest",
    catchTier: 1,
    color: 0xf6e27a,
    desc: "A warm familiar from the first town quest.",
    modelFile: "TX8r9WBXpe.glb",
  },
  street_ferret: {
    id: "street_ferret",
    name: "Street Ferret",
    rarity: "common",
    traits: ["catcher"],
    unlock: "quest",
    catchTier: 1,
    color: 0xb08d57,
    desc: "A nimble Catcher unlocked on the Catcher path.",
    modelFile: "4LjT020LQh.glb",
  },
  sparring_imp: {
    id: "sparring_imp",
    name: "Sparring Imp",
    rarity: "uncommon",
    traits: ["combat"],
    unlock: "skill",
    skill: "attack",
    skillLevel: 5,
    catchTier: 2,
    color: 0xc45c4a,
    desc: "Appears when Attack reaches level 5.",
    modelFile: "Mo2ky6vkf8.glb",
  },
  ember_sprite: {
    id: "ember_sprite",
    name: "Ember Sprite",
    rarity: "uncommon",
    traits: ["magic"],
    unlock: "skill",
    skill: "magic",
    skillLevel: 5,
    catchTier: 2,
    color: 0xff7a3d,
    desc: "Unlocked at Magic 5 — loves burned oak.",
    modelFile: "UgBmRVnQ9h.glb",
  },
  river_newt: {
    id: "river_newt",
    name: "River Newt",
    rarity: "common",
    traits: ["aquatic"],
    unlock: "skill",
    skill: "fishing",
    skillLevel: 5,
    catchTier: 1,
    color: 0x4f9e8a,
    desc: "Milestone pet for Fishing 5.",
    modelFile: "37wofOCOzG.glb",
  },
  cobble_crow: {
    id: "cobble_crow",
    name: "Cobble Crow",
    rarity: "common",
    traits: ["scout"],
    unlock: "wild",
    catchTier: 1,
    color: 0x3a3a42,
    desc: "Wild familiar near the town square lamps.",
    modelFile: "kzpT6fNmM5.glb",
  },
  mist_hare: {
    id: "mist_hare",
    name: "Mist Hare",
    rarity: "uncommon",
    traits: ["fleet"],
    unlock: "wild",
    catchTier: 2,
    color: 0xc9d2e0,
    desc: "Skittish outskirts catch — needs Catcher 3+.",
    modelFile: "1YE8U35HXsI.glb",
  },
  understreet_wisp: {
    id: "understreet_wisp",
    name: "Understreet Wisp",
    rarity: "rare",
    traits: ["mythic", "catcher"],
    unlock: "wild",
    catchTier: 3,
    color: 0x8ec5ff,
    desc: "Pet-gated delve reward / hard catch.",
    modelFile: "ypEYhCImAB.glb",
  },
  dwarf_dragon: {
    id: "dwarf_dragon",
    name: "Dwarf Dragon",
    rarity: "rare",
    traits: ["mythic", "combat", "dragon"],
    unlock: "quest",
    catchTier: 3,
    color: 0x6b3fa0,
    desc: "Shrunk dragon familiar from the Amethyst Drake egg. Eight cosmetic colour variants (random on hatch).",
    modelFile: "LlwD0QNUPj.glb",
  },
};

export function randomPetInstanceId(): string {
  return `pet_${Math.random().toString(36).slice(2, 10)}`;
}
