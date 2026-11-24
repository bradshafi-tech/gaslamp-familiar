export type SkillId =
  | "attack"
  | "strength"
  | "defence"
  | "hitpoints"
  | "magic"
  | "archery"
  | "fishing"
  | "crafting"
  | "mining"
  | "woodcutting";

export const SKILL_IDS: SkillId[] = [
  "attack",
  "strength",
  "defence",
  "hitpoints",
  "magic",
  "archery",
  "fishing",
  "crafting",
  "mining",
  "woodcutting",
];

export const SKILL_LABELS: Record<SkillId, string> = {
  attack: "Attack",
  strength: "Strength",
  defence: "Defence",
  hitpoints: "Hitpoints",
  magic: "Magic",
  archery: "Archery",
  fishing: "Fishing",
  crafting: "Crafting",
  mining: "Mining",
  woodcutting: "Woodcutting",
};

export const SKILL_DESCRIPTIONS: Record<SkillId, string> = {
  attack: "Improves melee accuracy and unlocks stronger weapons.",
  strength: "Increases melee damage.",
  defence: "Reduces damage taken and improves block chance.",
  hitpoints: "Your maximum health.",
  magic: "Casts spells (Spark burns logs). Improves magic hits.",
  archery: "Ranged combat accuracy and damage.",
  fishing: "Catch fish at ponds and rivers.",
  crafting: "Make tools, lures, and quest items.",
  mining: "Mine ore and smelt bars. Higher levels gather faster.",
  woodcutting: "Chop trees for logs. Higher levels chop faster.",
};

export type SkillsState = Record<SkillId, { level: number; xp: number }>;

/** One inventory cell. Null = empty. Max 22 slots. */
export type InventorySlot = {
  instanceId: string;
  itemId: string;
  qty: number;
} | null;

export const INV_SIZE = 22;

export type AttackStyle = "accurate" | "aggressive" | "defensive" | "controlled";

export const ATTACK_STYLES: { id: AttackStyle; label: string; desc: string }[] = [
  { id: "accurate", label: "Accurate", desc: "Attack XP — better accuracy." },
  { id: "aggressive", label: "Aggressive", desc: "Strength XP — harder hits." },
  { id: "defensive", label: "Defensive", desc: "Defence XP — safer stance." },
  { id: "controlled", label: "Controlled", desc: "Splits XP across Attack, Strength, Defence." },
];

export type PetInstance = {
  id: string;
  speciesId: string;
  name: string;
  level: number;
  xp: number;
  traits: string[];
  active: boolean;
  color?: number;
  colorName?: string;
};

export type QuestProgress = {
  questId: string;
  status: "available" | "active" | "completed";
  step: number;
  flags: Record<string, boolean | number | string>;
};

export type ResearchEntry = {
  id: string;
  name: string;
  category: string;
  researchedAt: number;
  note: string;
};

export type CharacterSave = {
  skills: SkillsState;
  /** Fixed length INV_SIZE; use null for empty. */
  inventory: InventorySlot[];
  pets: PetInstance[];
  quests: QuestProgress[];
  position: { x: number; y: number; z: number };
  equipment: {
    weapon?: string;
    tool?: string;
  };
  attackStyle: AttackStyle;
  research: ResearchEntry[];
  hp: number;
  maxHp: number;
  gold: number;
  unlockedZones: string[];
  version: number;
};

export function defaultSkills(): SkillsState {
  const skills = {} as SkillsState;
  for (const id of SKILL_IDS) {
    skills[id] = { level: 1, xp: 0 };
  }
  skills.hitpoints = { level: 10, xp: 1154 };
  return skills;
}

export function emptyInventory(): InventorySlot[] {
  return Array.from({ length: INV_SIZE }, () => null);
}

export function makeInstanceId(): string {
  return `it_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultSave(): CharacterSave {
  const inv = emptyInventory();
  const starter: { itemId: string; qty: number }[] = [
    { itemId: "bronze_axe", qty: 1 },
    { itemId: "bronze_pickaxe", qty: 1 },
    { itemId: "fishing_rod", qty: 1 },
    { itemId: "bronze_sword", qty: 1 },
    { itemId: "bread", qty: 5 },
    { itemId: "catch_net", qty: 3 },
  ];
  starter.forEach((s, i) => {
    inv[i] = { instanceId: makeInstanceId(), itemId: s.itemId, qty: s.qty };
  });
  return {
    skills: defaultSkills(),
    inventory: inv,
    pets: [],
    quests: [
      { questId: "q1_lamp_familiar", status: "available", step: 0, flags: {} },
      { questId: "q2_catcher_path", status: "available", step: 0, flags: {} },
      { questId: "q3_outskirts_delve", status: "available", step: 0, flags: {} },
      { questId: "q4_amethyst_drake", status: "available", step: 0, flags: {} },
    ],
    position: { x: 0, y: 0, z: 0 },
    equipment: { weapon: "bronze_sword", tool: "bronze_axe" },
    attackStyle: "accurate",
    research: [],
    hp: 10,
    maxHp: 10,
    gold: 25,
    unlockedZones: ["town", "outskirts"],
    version: 2,
  };
}

/** Migrate older saves (v1 sparse inventory, missing defence/research/style). */
export function normalizeSave(raw: CharacterSave): CharacterSave {
  const base = defaultSave();
  const skills = { ...base.skills, ...(raw.skills || {}) } as SkillsState;
  for (const id of SKILL_IDS) {
    if (!skills[id]) skills[id] = { level: 1, xp: 0 };
  }
  if (!skills.defence) skills.defence = { level: 1, xp: 0 };

  let inventory = emptyInventory();
  const src = raw.inventory || [];
  // Old format: dense list without nulls / without instanceId
  let slot = 0;
  for (const entry of src) {
    if (!entry || slot >= INV_SIZE) continue;
    const any = entry as { itemId?: string; qty?: number; instanceId?: string };
    if (!any.itemId) continue;
    inventory[slot] = {
      instanceId: any.instanceId || makeInstanceId(),
      itemId: any.itemId,
      qty: any.qty ?? 1,
    };
    slot++;
  }

  return {
    ...base,
    ...raw,
    skills,
    inventory,
    attackStyle: raw.attackStyle || "accurate",
    research: Array.isArray(raw.research) ? raw.research : [],
    equipment: raw.equipment || base.equipment,
    pets: raw.pets || [],
    quests: raw.quests?.length ? raw.quests : base.quests,
    unlockedZones: raw.unlockedZones?.length ? raw.unlockedZones : base.unlockedZones,
    version: 2,
  };
}

export function xpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(i + 300 * Math.pow(2, i / 7));
  }
  return Math.floor(total / 4);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < 99 && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function addSkillXp(
  skills: SkillsState,
  skill: SkillId,
  amount: number
): { skills: SkillsState; leveled: boolean; newLevel: number } {
  const next = { ...skills, [skill]: { ...skills[skill] } };
  next[skill].xp += amount;
  const newLevel = levelFromXp(next[skill].xp);
  const leveled = newLevel > next[skill].level;
  next[skill].level = newLevel;
  return { skills: next, leveled, newLevel };
}

/** Skilling ticks: lvl1 → 1–5 rng; lvl20+ → 1. Linear interpolate max. */
export function skillingTicksForLevel(level: number): number {
  const lvl = Math.max(1, Math.min(20, level));
  const maxTicks = Math.max(1, Math.round(5 - ((lvl - 1) * 4) / 19));
  return 1 + Math.floor(Math.random() * maxTicks);
}

export type AuthUser = {
  id: string;
  username: string;
  email: string;
};
