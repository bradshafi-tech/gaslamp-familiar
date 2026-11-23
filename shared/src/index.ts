export type SkillId =
  | "attack"
  | "strength"
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
  hitpoints: "Hitpoints",
  magic: "Magic",
  archery: "Archery",
  fishing: "Fishing",
  crafting: "Crafting",
  mining: "Mining",
  woodcutting: "Woodcutting",
};

export type SkillsState = Record<SkillId, { level: number; xp: number }>;

export type InventorySlot = { itemId: string; qty: number };

export type PetInstance = {
  id: string;
  speciesId: string;
  name: string;
  level: number;
  xp: number;
  traits: string[];
  active: boolean;
};

export type QuestProgress = {
  questId: string;
  status: "available" | "active" | "completed";
  step: number;
  flags: Record<string, boolean | number | string>;
};

export type CharacterSave = {
  skills: SkillsState;
  inventory: InventorySlot[];
  pets: PetInstance[];
  quests: QuestProgress[];
  position: { x: number; y: number; z: number };
  equipment: {
    weapon?: string;
    tool?: string;
  };
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

export function defaultSave(): CharacterSave {
  return {
    skills: defaultSkills(),
    inventory: [
      { itemId: "bronze_axe", qty: 1 },
      { itemId: "bronze_pickaxe", qty: 1 },
      { itemId: "fishing_rod", qty: 1 },
      { itemId: "bread", qty: 5 },
      { itemId: "catch_net", qty: 3 },
    ],
    pets: [],
    quests: [
      { questId: "q1_lamp_familiar", status: "available", step: 0, flags: {} },
      { questId: "q2_catcher_path", status: "available", step: 0, flags: {} },
      { questId: "q3_outskirts_delve", status: "available", step: 0, flags: {} },
    ],
    position: { x: 0, y: 0, z: 0 },
    equipment: { weapon: "bronze_sword", tool: "bronze_axe" },
    hp: 10,
    maxHp: 10,
    gold: 25,
    unlockedZones: ["town", "outskirts"],
    version: 1,
  };
}

/** RS-style XP table approximation (level 1..99). */
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

export type AuthUser = {
  id: string;
  username: string;
  email: string;
};
