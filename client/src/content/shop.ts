/** General store stock — common goods priced ~1–20 coins. */
export type ShopOffer = {
  itemId: string;
  price: number;
  /** Optional flavour under the buy button. */
  blurb?: string;
};

export const GENERAL_SHOP: ShopOffer[] = [
  { itemId: "bread", price: 3, blurb: "Travel food" },
  { itemId: "raw_fish", price: 4, blurb: "Cook at the stove" },
  { itemId: "cooked_minnow", price: 6, blurb: "Ready to eat" },
  { itemId: "tree_logs", price: 2, blurb: "Spark fuel" },
  { itemId: "water_essence", price: 8, blurb: "Water spell fuel" },
  { itemId: "lamp_wick", price: 12, blurb: "Lampwright spare" },
  { itemId: "iron_scrap", price: 10, blurb: "Crafting scrap" },
  { itemId: "catch_net", price: 5, blurb: "Pet catching" },
  { itemId: "bronze_axe", price: 15, blurb: "Wear to chop" },
  { itemId: "bronze_pickaxe", price: 15, blurb: "Wear to mine" },
  { itemId: "fishing_rod", price: 12, blurb: "Wear to fish" },
  { itemId: "oak_buckler", price: 18, blurb: "Shield slot" },
  { itemId: "linen_cap", price: 7, blurb: "Hat slot" },
  { itemId: "work_smock", price: 9, blurb: "Top slot" },
  { itemId: "cord_trousers", price: 9, blurb: "Bottoms slot" },
  { itemId: "brass_amulet", price: 14, blurb: "Amulet slot" },
];

export const SHOP_NAME = "Pip's General Store";
