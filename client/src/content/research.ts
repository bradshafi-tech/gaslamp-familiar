import type { WorldNode } from "./world";
import { PET_SPECIES } from "./pets";
import { ITEMS } from "./items";

export type ResearchDef = {
  id: string;
  name: string;
  category: "tree" | "fish" | "ore" | "lamp" | "animal" | "boss" | "ground" | "pet" | "npc" | "misc";
  note: string;
};

/** Static catalogue of examinable / researchable subjects. */
export const RESEARCH_DEFS: Record<string, ResearchDef> = {
  tree_oak: {
    id: "tree_oak",
    name: "Oak Tree",
    category: "tree",
    note: "Common Victorian oak. Yields logs; chop speed rises with Woodcutting.",
  },
  fish_pond: {
    id: "fish_pond",
    name: "Gaslamp Pond",
    category: "fish",
    note: "Still water under gaslight. Minnows dart beneath the surface.",
  },
  ore_copper: {
    id: "ore_copper",
    name: "Copper Vein",
    category: "ore",
    note: "Reddish rock. Mining level shortens the wait between ores.",
  },
  ore_tin: {
    id: "ore_tin",
    name: "Tin Vein",
    category: "ore",
    note: "Pale metal vein beside the outskirts road.",
  },
  lamp_gas: {
    id: "lamp_gas",
    name: "Gaslamp",
    category: "lamp",
    note: "Iron post and warm glass. Keeps the old gods drowsy, locals say.",
  },
  animal_rat: {
    id: "animal_rat",
    name: "Alley Rat",
    category: "animal",
    note: "Scruffy town vermin. Good for early combat practice.",
  },
  boss_mist_shade: {
    id: "boss_mist_shade",
    name: "Mist Shade",
    category: "boss",
    note: "A fog-bound spirit on the outskirts road. Required for the delve.",
  },
  boss_amethyst_drake: {
    id: "boss_amethyst_drake",
    name: "Amethyst Drake",
    category: "boss",
    note: "Purple low-poly dragon beyond Understreet. Drops a ground egg on death.",
  },
  ground_egg: {
    id: "ground_egg",
    name: "Amethyst Dragon Egg",
    category: "ground",
    note: "Click to complete the Amethyst Drake quest and receive a Dwarf Dragon.",
  },
  forge: {
    id: "forge",
    name: "Town Forge",
    category: "misc",
    note: "Smelts copper + tin into bronze bars.",
  },
  bench: {
    id: "bench",
    name: "Crafting Bench",
    category: "misc",
    note: "Turn a bronze bar into a crafted lure.",
  },
};

for (const sp of Object.values(PET_SPECIES)) {
  RESEARCH_DEFS[`pet_${sp.id}`] = {
    id: `pet_${sp.id}`,
    name: sp.name,
    category: "pet",
    note: sp.desc,
  };
}

export function researchIdForNode(node: WorldNode): string | null {
  if (node.kind === "tree") return "tree_oak";
  if (node.kind === "fish") return "fish_pond";
  if (node.kind === "rock") {
    const ore = String(node.meta?.ore ?? "");
    if (ore.includes("copper")) return "ore_copper";
    if (ore.includes("tin")) return "ore_tin";
    return "ore_copper";
  }
  if (node.kind === "forge") return "forge";
  if (node.kind === "bench") return "bench";
  if (node.kind === "ground_egg") return "ground_egg";
  if (node.kind === "enemy") {
    if (node.id.includes("rat")) return "animal_rat";
    if (node.id.includes("shade")) return "boss_mist_shade";
    if (node.id.includes("drake") || node.meta?.model === "purple-dragon") return "boss_amethyst_drake";
    return `enemy_${node.id}`;
  }
  if (node.kind === "wild_pet") {
    const sp = String(node.meta?.species ?? "");
    return sp ? `pet_${sp}` : null;
  }
  if (node.kind === "npc") return `npc_${node.meta?.npc ?? node.id}`;
  return null;
}

export function researchDefForNode(node: WorldNode): ResearchDef | null {
  const id = researchIdForNode(node);
  if (!id) return null;
  if (RESEARCH_DEFS[id]) return RESEARCH_DEFS[id];
  // Dynamic fallback
  return {
    id,
    name: node.label,
    category: node.kind === "enemy" ? "animal" : "misc",
    note: `Field notes on ${node.label}.`,
  };
}

export function researchIdForItem(itemId: string): string {
  return `item_${itemId}`;
}

export function researchDefForItem(itemId: string): ResearchDef {
  const it = ITEMS[itemId];
  return {
    id: researchIdForItem(itemId),
    name: it?.name ?? itemId,
    category: "ground",
    note: it?.examine ?? "An object of interest.",
  };
}

export function researchIdForPetSpecies(speciesId: string): string {
  return `pet_${speciesId}`;
}
