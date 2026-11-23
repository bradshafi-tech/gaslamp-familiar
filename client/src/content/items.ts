export type ItemDef = {
  id: string;
  name: string;
  stackable: boolean;
  category: "tool" | "weapon" | "food" | "material" | "misc" | "catch";
  heal?: number;
  desc: string;
};

export const ITEMS: Record<string, ItemDef> = {
  bronze_axe: { id: "bronze_axe", name: "Bronze Axe", stackable: false, category: "tool", desc: "Chops oak and willow." },
  bronze_pickaxe: { id: "bronze_pickaxe", name: "Bronze Pickaxe", stackable: false, category: "tool", desc: "Mines copper and tin." },
  fishing_rod: { id: "fishing_rod", name: "Fishing Rod", stackable: false, category: "tool", desc: "Catch river fish." },
  bronze_sword: { id: "bronze_sword", name: "Bronze Sword", stackable: false, category: "weapon", desc: "A sturdy starter blade." },
  oak_logs: { id: "oak_logs", name: "Oak Logs", stackable: true, category: "material", desc: "Fuel for a spark spell." },
  copper_ore: { id: "copper_ore", name: "Copper Ore", stackable: true, category: "material", desc: "Smelt with tin." },
  tin_ore: { id: "tin_ore", name: "Tin Ore", stackable: true, category: "material", desc: "Smelt with copper." },
  bronze_bar: { id: "bronze_bar", name: "Bronze Bar", stackable: true, category: "material", desc: "Used for crafting." },
  raw_fish: { id: "raw_fish", name: "Raw Minnow", stackable: true, category: "food", desc: "Needs cooking—or eat raw for a tiny heal." },
  bread: { id: "bread", name: "Bread", stackable: true, category: "food", heal: 4, desc: "Town bakery staple." },
  catch_net: { id: "catch_net", name: "Catch Net", stackable: true, category: "catch", desc: "Consumed on a catch attempt." },
  lamp_wick: { id: "lamp_wick", name: "Enchanted Wick", stackable: true, category: "misc", desc: "Quest item for the lampwright." },
  iron_scrap: { id: "iron_scrap", name: "Iron Scrap", stackable: true, category: "material", desc: "Outskirts salvage." },
  crafted_lure: { id: "crafted_lure", name: "Crafted Lure", stackable: true, category: "misc", desc: "Helps train a Catcher." },
};

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}
