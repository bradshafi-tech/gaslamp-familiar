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
  magic: "Burn tree/oak logs to ashes (Spark). Improves magic hits.",
  archery: "Ranged combat accuracy and damage.",
  fishing: "Catch fish at ponds and rivers.",
  crafting: "Make tools, lures, and quest items.",
  mining: "Mine ore and smelt bars. Higher levels gather faster.",
  woodcutting: "Chop trees for logs. Oak unlocks at level 20. Higher levels chop faster.",
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

/** Combat spells selectable beside melee styles (staff + runes required in combat). */
export type CombatSpellId = "water";

export const COMBAT_SPELLS: {
  id: CombatSpellId;
  label: string;
  level: number;
  runeId: string;
  desc: string;
}[] = [
  {
    id: "water",
    label: "Water",
    level: 1,
    runeId: "water_essence",
    desc: "Lvl 1 Magic · staff + Water Essence · Magic XP.",
  },
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
  /** Light Orb (lamp_moth): ashes fed toward level 2 (need 1000). */
  ashesFed?: number;
  /** Light Orb: oak logs fed toward level 30 (need 250 after level 2). */
  oakFed?: number;
};

/** Light Orb evolution / training costs. */
export const LIGHT_ORB_ASHES_TO_L2 = 1000;
export const LIGHT_ORB_OAK_TO_L30 = 250;
export const LIGHT_ORB_SPECIES = "lamp_moth";
export const OAK_WOODCUTTING_LEVEL = 20;

/** Map oak-fed count (0–250) onto pet levels 2–30. */
export function lightOrbLevelFromOakFed(oakFed: number): number {
  const fed = Math.max(0, Math.min(LIGHT_ORB_OAK_TO_L30, oakFed));
  if (fed <= 0) return 2;
  return Math.min(30, 2 + Math.floor((fed * 28) / LIGHT_ORB_OAK_TO_L30));
}

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
  /** When set, combat uses this spell instead of melee styles (needs staff + runes). */
  selectedSpell: CombatSpellId | null;
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
    { itemId: "bread", qty: 5 },
    { itemId: "catch_net", qty: 3 },
  ];
  starter.forEach((s, i) => {
    inv[i] = { instanceId: makeInstanceId(), itemId: s.itemId, qty: s.qty };
  });
  const lightOrb: PetInstance = {
    id: `pet_${Math.random().toString(36).slice(2, 10)}`,
    speciesId: LIGHT_ORB_SPECIES,
    name: "Light Orb",
    level: 1,
    xp: 0,
    traits: ["companion", "light"],
    active: true,
    ashesFed: 0,
    oakFed: 0,
  };
  return {
    skills: defaultSkills(),
    inventory: inv,
    pets: [lightOrb],
    quests: [
      { questId: "q1_lamp_familiar", status: "available", step: 0, flags: {} },
      { questId: "q2_catcher_path", status: "available", step: 0, flags: {} },
      { questId: "q3_outskirts_delve", status: "available", step: 0, flags: {} },
      { questId: "q4_amethyst_drake", status: "available", step: 0, flags: {} },
    ],
    position: { x: 0, y: 0, z: 0 },
    // Unarmed fist by default — craft Bronze Sword from copper + tin.
    equipment: { tool: "bronze_axe" },
    attackStyle: "accurate",
    selectedSpell: null,
    research: [],
    hp: 10,
    maxHp: 10,
    gold: 25,
    unlockedZones: ["town", "outskirts"],
    version: 6,
  };
}

/** Migrate older saves (v1 sparse inventory, missing defence/research/style, oak→tree logs). */
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
    // Pre–Light Orb loop: starter "oak_logs" became tree_logs; real oak is WC 20+.
    const itemId = any.itemId === "oak_logs" && (raw.version ?? 1) < 3 ? "tree_logs" : any.itemId;
    inventory[slot] = {
      instanceId: any.instanceId || makeInstanceId(),
      itemId,
      qty: any.qty ?? 1,
    };
    slot++;
  }

  let pets = (raw.pets || []).map((p) => {
    if (p.speciesId !== LIGHT_ORB_SPECIES) return p;
    return {
      ...p,
      name: p.name?.includes("Lamp Moth") || p.name === "Lamp Moth" ? "Light Orb" : p.name || "Light Orb",
      ashesFed: p.ashesFed ?? 0,
      oakFed: p.oakFed ?? 0,
    };
  });
  // Everyone has a Light Orb follower
  if (!pets.some((p) => p.speciesId === LIGHT_ORB_SPECIES)) {
    pets = [
      {
        id: `pet_${Math.random().toString(36).slice(2, 10)}`,
        speciesId: LIGHT_ORB_SPECIES,
        name: "Light Orb",
        level: 1,
        xp: 0,
        traits: ["companion", "light"],
        active: pets.length === 0,
        ashesFed: 0,
        oakFed: 0,
      },
      ...pets,
    ];
    if (!pets.some((p) => p.active)) pets[0]!.active = true;
  }

  return {
    ...base,
    ...raw,
    skills,
    inventory,
    attackStyle: raw.attackStyle || "accurate",
    selectedSpell:
      raw.selectedSpell === "water" ? "water" : raw.selectedSpell === null ? null : null,
    research: Array.isArray(raw.research) ? raw.research : [],
    equipment: raw.equipment
      ? {
          ...raw.equipment,
          // Treat explicit fist / empty as unarmed
          weapon:
            raw.equipment.weapon && raw.equipment.weapon !== "fist"
              ? raw.equipment.weapon
              : undefined,
        }
      : base.equipment,
    pets,
    quests: raw.quests?.length ? raw.quests : base.quests,
    unlockedZones: raw.unlockedZones?.length ? raw.unlockedZones : base.unlockedZones,
    version: Math.max(6, raw.version ?? 1),
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
