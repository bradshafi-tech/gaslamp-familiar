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
    examine: "A hatchet for chopping oak. Woodcutting feels quicker as you train.",
    desc: "Chops oak and willow.",
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
  bronze_sword: {
    id: "bronze_sword",
    name: "Bronze Sword",
    stackable: false,
    category: "weapon",
    attackTicks: 4,
    attackBonus: 2,
    strengthBonus: 2,
    examine: "A sturdy starter blade. Attack rate is fixed by the weapon, not your levels.",
    desc: "Melee weapon — 4-tick attack speed.",
  },
  oak_logs: {
    id: "oak_logs",
    name: "Oak Logs",
    stackable: true,
    category: "material",
    examine: "Fresh oak. Burn with Spark to train Magic.",
    desc: "Fuel for a spark spell.",
  },
  copper_ore: {
    id: "copper_ore",
    name: "Copper Ore",
    stackable: true,
    category: "material",
    examine: "Reddish ore. Smelt with tin at the forge.",
    desc: "Smelt with tin.",
  },
  tin_ore: {
    id: "tin_ore",
    name: "Tin Ore",
    stackable: true,
    category: "material",
    examine: "Pale ore. Pair with copper for bronze.",
    desc: "Smelt with copper.",
  },
  bronze_bar: {
    id: "bronze_bar",
    name: "Bronze Bar",
    stackable: true,
    category: "material",
    examine: "A warm bronze ingot for crafting.",
    desc: "Used for crafting.",
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

/** Unarmed / default attack interval in ticks. */
export const UNARMED_ATTACK_TICKS = 5;
