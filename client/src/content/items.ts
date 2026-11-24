import type { WearSlot } from "@shared/index";

export type ItemDef = {
  id: string;
  name: string;
  stackable: boolean;
  category: "tool" | "weapon" | "food" | "material" | "misc" | "catch" | "egg" | "wearable";
  heal?: number;
  hatchPet?: string;
  /** Combat attack speed in ticks between hits. Lower = faster. Unarmed default 5. */
  attackTicks?: number;
  /** Bonus to accuracy / max hit when equipped. */
  attackBonus?: number;
  strengthBonus?: number;
  /** Enables level-1 Water (and later) combat spells when equipped. */
  allowsMagic?: boolean;
  /** Bonus to magic hit / accuracy when casting with this weapon. */
  magicBonus?: number;
  /** Worn slot — weapon also holds axe / pickaxe / staff. */
  wearSlot?: WearSlot;
  /** Mesh tint for block-man clothing overlays. */
  wearColor?: number;
  /** Short inventory glyph (emoji / symbol). */
  icon: string;
  /** CSS color for the icon chip. */
  iconColor: string;
  examine: string;
  desc: string;
};

const IC = {
  tool: "#8a9bb0",
  weapon: "#c9a227",
  food: "#7ecf8a",
  mat: "#b08a5a",
  misc: "#9aa3b2",
  catch: "#6a9ec9",
  egg: "#b48cff",
} as const;

export const ITEMS: Record<string, ItemDef> = {
  linen_cap: {
    id: "linen_cap",
    name: "Linen Cap",
    stackable: false,
    category: "wearable",
    wearSlot: "hat",
    wearColor: 0xc4b49a,
    icon: "🧢",
    iconColor: "#c4b49a",
    examine: "A soft workman's cap. Wear it from Inventory → Worn.",
    desc: "Starter hat for the block man.",
  },
  work_smock: {
    id: "work_smock",
    name: "Work Smock",
    stackable: false,
    category: "wearable",
    wearSlot: "top",
    wearColor: 0x3a6a94,
    icon: "👕",
    iconColor: "#3a6a94",
    examine: "Sturdy blue linen top. Shows on your block avatar when worn.",
    desc: "Starter top.",
  },
  cord_trousers: {
    id: "cord_trousers",
    name: "Cord Trousers",
    stackable: false,
    category: "wearable",
    wearSlot: "bottoms",
    wearColor: 0x2a3a4a,
    icon: "👖",
    iconColor: "#2a3a4a",
    examine: "Dark cord bottoms for cobble and mud.",
    desc: "Starter bottoms.",
  },
  oak_buckler: {
    id: "oak_buckler",
    name: "Oak Buckler",
    stackable: false,
    category: "wearable",
    wearSlot: "shield",
    wearColor: 0x6b4b2a,
    icon: "🛡",
    iconColor: "#6b4b2a",
    examine: "Small oak shield. Wear in the shield slot.",
    desc: "Off-hand shield.",
  },
  brass_amulet: {
    id: "brass_amulet",
    name: "Brass Amulet",
    stackable: false,
    category: "wearable",
    wearSlot: "amulet",
    wearColor: 0xc9a227,
    icon: "📿",
    iconColor: "#c9a227",
    examine: "A simple brass charm on a cord. Worn at the neck.",
    desc: "Starter amulet.",
  },
  bronze_axe: {
    id: "bronze_axe",
    name: "Bronze Axe",
    stackable: false,
    category: "tool",
    wearSlot: "weapon",
    attackTicks: 5,
    attackBonus: 1,
    strengthBonus: 1,
    icon: "🪓",
    iconColor: "#8a9bb0",
    examine: "Wear in the weapon/tool slot to chop trees. Oak at Woodcutting 20.",
    desc: "Chops trees — must be worn.",
  },
  bronze_pickaxe: {
    id: "bronze_pickaxe",
    name: "Bronze Pickaxe",
    stackable: false,
    category: "tool",
    wearSlot: "weapon",
    attackTicks: 5,
    attackBonus: 1,
    strengthBonus: 1,
    icon: "⛏",
    iconColor: "#8a9bb0",
    examine: "Wear in the weapon/tool slot to mine copper and tin.",
    desc: "Mines ore — must be worn.",
  },
  fishing_rod: {
    id: "fishing_rod",
    name: "Fishing Rod",
    stackable: false,
    category: "tool",
    wearSlot: "weapon",
    icon: "🎣",
    iconColor: "#6a9ec9",
    examine: "Wear in the weapon/tool slot to fish at the pond.",
    desc: "Catch river fish — must be worn.",
  },
  fist: {
    id: "fist",
    name: "Fist",
    stackable: false,
    category: "weapon",
    attackTicks: 5,
    attackBonus: 0,
    strengthBonus: 0,
    icon: "✊",
    iconColor: "#c9a227",
    examine: "Unarmed. 5 ticks between hits — mine copper & tin, smelt a bar, craft a Bronze Sword (4 ticks).",
    desc: "Default unarmed — 5-tick attack speed.",
  },
  bronze_sword: {
    id: "bronze_sword",
    name: "Bronze Sword",
    stackable: false,
    category: "weapon",
    wearSlot: "weapon",
    attackTicks: 4,
    attackBonus: 3,
    strengthBonus: 3,
    icon: "⚔",
    iconColor: "#c9a227",
    examine: "Wear to fight. Crafted from a bronze bar. 4-tick attacks.",
    desc: "Melee weapon — wear to use in combat.",
  },
  basic_staff: {
    id: "basic_staff",
    name: "Basic Staff",
    stackable: false,
    category: "weapon",
    wearSlot: "weapon",
    attackTicks: 5,
    attackBonus: 1,
    strengthBonus: 0,
    allowsMagic: true,
    magicBonus: 2,
    icon: "🪄",
    iconColor: "#6a9ec9",
    examine: "Wear to cast Water (needs Water Essence). Craft from 2 tree logs + iron scrap.",
    desc: "Magic weapon — wear to unlock Water.",
  },
  water_essence: {
    id: "water_essence",
    name: "Water Essence",
    stackable: true,
    category: "material",
    icon: "💧",
    iconColor: "#6a9ec9",
    examine: "Condensed drip from Alley Rats. Fuel for the Water spell (staff required).",
    desc: "Rune-like fuel for Water.",
  },
  tree_logs: {
    id: "tree_logs",
    name: "Tree Log",
    stackable: true,
    category: "material",
    icon: "🪵",
    iconColor: "#b08a5a",
    examine: "A common log. Burn with Spark for 1 ash. Feed ashes to your Light Orb.",
    desc: "Starter wood — burns to 1 ash.",
  },
  oak_logs: {
    id: "oak_logs",
    name: "Oak Log",
    stackable: true,
    category: "material",
    icon: "🪵",
    iconColor: "#6b4b2a",
    examine: "Hard oak (Woodcutting 20+). Burn for 2 ashes, or feed to a level 2+ Light Orb.",
    desc: "Burns to 2 ash; Light Orb training food after evolve.",
  },
  ashes: {
    id: "ashes",
    name: "Ashes",
    stackable: true,
    category: "misc",
    icon: "🌑",
    iconColor: "#9aa3b2",
    examine: "Magic-burned wood ash. Feed to a Light Orb — 1000 ashes evolve it to level 2.",
    desc: "Light Orb food (level 1 → 2).",
  },
  copper_ore: {
    id: "copper_ore",
    name: "Copper Ore",
    stackable: true,
    category: "material",
    icon: "🟠",
    iconColor: "#c07848",
    examine: "Reddish ore. Smelt with tin at the furnace.",
    desc: "Smelt with tin.",
  },
  tin_ore: {
    id: "tin_ore",
    name: "Tin Ore",
    stackable: true,
    category: "material",
    icon: "⚪",
    iconColor: "#a8aca4",
    examine: "Pale ore. Pair with copper for bronze at the furnace.",
    desc: "Smelt with copper.",
  },
  bronze_bar: {
    id: "bronze_bar",
    name: "Bronze Bar",
    stackable: true,
    category: "material",
    icon: "▬",
    iconColor: "#b87333",
    examine: "Smelted copper + tin. Craft a Bronze Sword (or lure) at the crafting station.",
    desc: "Craft into a sword or lure.",
  },
  raw_fish: {
    id: "raw_fish",
    name: "Raw Minnow",
    stackable: true,
    category: "food",
    heal: 2,
    icon: "🐟",
    iconColor: "#6a9ec9",
    examine: "A tiny fish. Edible raw in a pinch.",
    desc: "Needs cooking—or eat raw for a tiny heal.",
  },
  cooked_minnow: {
    id: "cooked_minnow",
    name: "Cooked Minnow",
    stackable: true,
    category: "food",
    heal: 5,
    icon: "🍳",
    iconColor: "#7ecf8a",
    examine: "Pan-fried at the cookstove. Restores more HP than raw minnow.",
    desc: "Cooked fish — solid travel food.",
  },
  bread: {
    id: "bread",
    name: "Bread",
    stackable: true,
    category: "food",
    heal: 4,
    icon: "🍞",
    iconColor: "#d4af37",
    examine: "Town bakery staple. Restores a few Hitpoints.",
    desc: "Town bakery staple.",
  },
  catch_net: {
    id: "catch_net",
    name: "Catch Net",
    stackable: true,
    category: "catch",
    icon: "🕸️",
    iconColor: "#6a9ec9",
    examine: "Consumed on a wild familiar catch attempt.",
    desc: "Consumed on a catch attempt.",
  },
  lamp_wick: {
    id: "lamp_wick",
    name: "Enchanted Wick",
    stackable: true,
    category: "misc",
    icon: "🕯",
    iconColor: "#f6e27a",
    examine: "Smoky and faintly glowing — Mabel wants this.",
    desc: "Quest item for the lampwright.",
  },
  iron_scrap: {
    id: "iron_scrap",
    name: "Iron Scrap",
    stackable: true,
    category: "material",
    icon: "⚙",
    iconColor: "#8a8e96",
    examine: "Twisted metal from fallen foes. Pair with 2 tree logs at the crafting station for a Basic Staff.",
    desc: "Outskirts salvage — staff craft ingredient.",
  },
  crafted_lure: {
    id: "crafted_lure",
    name: "Crafted Lure",
    stackable: true,
    category: "misc",
    icon: "🪝",
    iconColor: "#c9a227",
    examine: "A bronze lure for Holt's Catcher path.",
    desc: "Helps train a Catcher.",
  },
  amethyst_egg: {
    id: "amethyst_egg",
    name: "Amethyst Dragon Egg",
    stackable: true,
    category: "egg",
    hatchPet: "dwarf_dragon",
    icon: "🥚",
    iconColor: "#b48cff",
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

export function itemWearSlot(itemId: string): WearSlot | undefined {
  return ITEMS[itemId]?.wearSlot;
}

/** True when the held weapon/tool slot matches this item id. */
export function isWearing(equipment: { weapon?: string }, itemId: string): boolean {
  return equipment.weapon === itemId;
}
