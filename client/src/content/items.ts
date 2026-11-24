export type ItemDef = {
  id: string;
  name: string;
  stackable: boolean;
  category: "tool" | "weapon" | "food" | "material" | "misc" | "catch" | "egg";
  heal?: number;
  hatchPet?: string;
  /** Combat attack speed in ticks between hits. Lower = faster. Unarmed default 5. */
  attackTicks?: number;
  /** Bonus to accuracy / max hit when equipped. */
  attackBonus?: number;
  strengthBonus?: number;
  examine: string;
  desc: string;
};

export const ITEMS: Record<string, ItemDef> = {
  bronze_axe: {
    id: "bronze_axe",
    name: "Bronze Axe",
    stackable: false,
    category: "tool",
    examine: "A hatchet for trees. Oak unlocks at Woodcutting 20. Chop speed rises with level.",
    desc: "Chops trees and oak.",
  },
  bronze_pickaxe: {
    id: "bronze_pickaxe",
    name: "Bronze Pickaxe",
    stackable: false,
    category: "tool",
    examine: "For copper and tin veins. Mining speed improves with level.",
    desc: "Mines copper and tin.",
  },
  fishing_rod: {
    id: "fishing_rod",
    name: "Fishing Rod",
    stackable: false,
    category: "tool",
    examine: "A simple rod. Higher Fishing shortens the wait between catches.",
    desc: "Catch river fish.",
  },
  fist: {
    id: "fist",
    name: "Fist",
    stackable: false,
    category: "weapon",
    attackTicks: 5,
    attackBonus: 0,
    strengthBonus: 0,
    examine: "Unarmed. 5 ticks between hits — mine copper & tin, smelt a bar, craft a Bronze Sword (4 ticks).",
    desc: "Default unarmed — 5-tick attack speed.",
  },
  bronze_sword: {
    id: "bronze_sword",
    name: "Bronze Sword",
    stackable: false,
    category: "weapon",
    attackTicks: 4,
    attackBonus: 3,
    strengthBonus: 3,
    examine: "Crafted from a bronze bar (copper + tin). 4-tick attacks, stronger than fists.",
    desc: "Melee weapon — 4-tick attack, +3 accuracy/strength.",
  },
  tree_logs: {
    id: "tree_logs",
    name: "Tree Log",
    stackable: true,
    category: "material",
    examine: "A common log. Burn with Spark for 1 ash. Feed ashes to your Light Orb.",
    desc: "Starter wood — burns to 1 ash.",
  },
  oak_logs: {
    id: "oak_logs",
    name: "Oak Log",
    stackable: true,
    category: "material",
    examine: "Hard oak (Woodcutting 20+). Burn for 2 ashes, or feed to a level 2+ Light Orb.",
    desc: "Burns to 2 ash; Light Orb training food after evolve.",
  },
  ashes: {
    id: "ashes",
    name: "Ashes",
    stackable: true,
    category: "misc",
    examine: "Magic-burned wood ash. Feed to a Light Orb — 1000 ashes evolve it to level 2.",
    desc: "Light Orb food (level 1 → 2).",
  },
  copper_ore: {
    id: "copper_ore",
    name: "Copper Ore",
    stackable: true,
    category: "material",
    examine: "Reddish ore. Smelt with tin at the furnace.",
    desc: "Smelt with tin.",
  },
  tin_ore: {
    id: "tin_ore",
    name: "Tin Ore",
    stackable: true,
    category: "material",
    examine: "Pale ore. Pair with copper for bronze at the furnace.",
    desc: "Smelt with copper.",
  },
  bronze_bar: {
    id: "bronze_bar",
    name: "Bronze Bar",
    stackable: true,
    category: "material",
    examine: "Smelted copper + tin. Craft a Bronze Sword (or lure) at the crafting station.",
    desc: "Craft into a sword or lure.",
  },
  raw_fish: {
    id: "raw_fish",
    name: "Raw Minnow",
    stackable: true,
    category: "food",
    heal: 2,
    examine: "A tiny fish. Edible raw in a pinch.",
    desc: "Needs cooking—or eat raw for a tiny heal.",
  },
  bread: {
    id: "bread",
    name: "Bread",
    stackable: true,
    category: "food",
    heal: 4,
    examine: "Town bakery staple. Restores a few Hitpoints.",
    desc: "Town bakery staple.",
  },
  catch_net: {
    id: "catch_net",
    name: "Catch Net",
    stackable: true,
    category: "catch",
    examine: "Consumed on a wild familiar catch attempt.",
    desc: "Consumed on a catch attempt.",
  },
  lamp_wick: {
    id: "lamp_wick",
    name: "Enchanted Wick",
    stackable: true,
    category: "misc",
    examine: "Smoky and faintly glowing — Mabel wants this.",
    desc: "Quest item for the lampwright.",
  },
  iron_scrap: {
    id: "iron_scrap",
    name: "Iron Scrap",
    stackable: true,
    category: "material",
    examine: "Twisted metal from fallen foes.",
    desc: "Outskirts salvage.",
  },
  crafted_lure: {
    id: "crafted_lure",
    name: "Crafted Lure",
    stackable: true,
    category: "misc",
    examine: "A bronze lure for Holt's Catcher path.",
    desc: "Helps train a Catcher.",
  },
  amethyst_egg: {
    id: "amethyst_egg",
    name: "Amethyst Dragon Egg",
    stackable: true,
    category: "egg",
    hatchPet: "dwarf_dragon",
    examine: "Warm purple shell. Dropped by the Amethyst Drake — click the ground egg to claim a Dwarf Dragon.",
    desc: "Boss drop. Click the ground egg to receive a Dwarf Dragon.",
  },
};

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}

export function itemExamine(id: string): string {
  return ITEMS[id]?.examine ?? "You see nothing special.";
}

/** Unarmed / fist attack interval in ticks. */
export const UNARMED_ATTACK_TICKS = 5;

/** Resolve equipped melee weapon def — bare hands if none / fist. */
export function equippedWeapon(weaponId: string | undefined) {
  if (!weaponId || weaponId === "fist") return ITEMS.fist;
  return ITEMS[weaponId] ?? ITEMS.fist;
}
