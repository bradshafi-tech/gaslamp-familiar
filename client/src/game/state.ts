import {
  INV_SIZE,
  LIGHT_ORB_ASHES_TO_L2,
  LIGHT_ORB_OAK_TO_L30,
  LIGHT_ORB_SPECIES,
  addSkillXp,
  defaultSave,
  lightOrbLevelFromOakFed,
  makeInstanceId,
  normalizeSave,
  type AttackStyle,
  type CombatSpellId,
  type CharacterSave,
  type InventorySlot,
  type PetInstance,
  type QuestProgress,
  type ResearchEntry,
  type SkillId,
} from "@shared/index";
import { ITEMS } from "../content/items";
import { PET_SPECIES, randomPetInstanceId } from "../content/pets";
import { QUESTS } from "../content/quests";
import type { ResearchDef } from "../content/research";

export type LogFn = (msg: string) => void;
export type LevelUpFn = (skill: SkillId, level: number) => void;

export class GameState {
  save: CharacterSave;
  log: LogFn;
  onLevelUp: LevelUpFn | null = null;
  dirty = false;

  constructor(save: CharacterSave | null, log: LogFn) {
    this.save = normalizeSave(save ?? defaultSave());
    this.log = log;
  }

  mark() {
    this.dirty = true;
  }

  ensureInv(): InventorySlot[] {
    if (!this.save.inventory || this.save.inventory.length !== INV_SIZE) {
      this.save = normalizeSave(this.save);
    }
    return this.save.inventory;
  }

  invQty(itemId: string): number {
    return this.ensureInv().reduce((n, s) => (s && s.itemId === itemId ? n + s.qty : n), 0);
  }

  firstSlotOf(itemId: string): number {
    return this.ensureInv().findIndex((s) => s && s.itemId === itemId);
  }

  addItem(itemId: string, qty = 1): boolean {
    const inv = this.ensureInv();
    const stackable = ITEMS[itemId]?.stackable ?? true;
    if (stackable) {
      const existing = inv.find((s) => s && s.itemId === itemId);
      if (existing) {
        existing.qty += qty;
        this.mark();
        return true;
      }
    }
    const empty = inv.findIndex((s) => s === null);
    if (empty < 0) {
      this.log("Inventory full (22 slots).");
      return false;
    }
    inv[empty] = { instanceId: makeInstanceId(), itemId, qty };
    this.mark();
    return true;
  }

  removeItem(itemId: string, qty = 1): boolean {
    const inv = this.ensureInv();
    let left = qty;
    for (let i = 0; i < inv.length && left > 0; i++) {
      const s = inv[i];
      if (!s || s.itemId !== itemId) continue;
      const take = Math.min(s.qty, left);
      s.qty -= take;
      left -= take;
      if (s.qty <= 0) inv[i] = null;
    }
    if (left > 0) return false;
    this.mark();
    return true;
  }

  dropSlot(index: number): { itemId: string; qty: number } | null {
    const inv = this.ensureInv();
    const s = inv[index];
    if (!s) return null;
    inv[index] = null;
    this.mark();
    return { itemId: s.itemId, qty: s.qty };
  }

  grantXp(skill: SkillId, amount: number) {
    const { skills, leveled, newLevel } = addSkillXp(this.save.skills, skill, amount);
    this.save.skills = skills;
    if (skill === "hitpoints") {
      this.save.maxHp = skills.hitpoints.level;
      this.save.hp = Math.min(this.save.hp, this.save.maxHp);
    }
    if (leveled) {
      this.log(`${skill} level up! Now level ${newLevel}.`);
      this.onLevelUp?.(skill, newLevel);
      this.checkSkillPets(skill, newLevel);
    }
    this.mark();
  }

  setAttackStyle(style: AttackStyle) {
    this.save.attackStyle = style;
    this.save.selectedSpell = null;
    this.mark();
  }

  setSelectedSpell(spell: CombatSpellId | null) {
    this.save.selectedSpell = spell;
    this.mark();
  }

  checkSkillPets(skill: SkillId, level: number) {
    for (const sp of Object.values(PET_SPECIES)) {
      if (sp.unlock !== "skill" || sp.skill !== skill || (sp.skillLevel ?? 99) > level) continue;
      if (this.save.pets.some((p) => p.speciesId === sp.id)) continue;
      this.unlockPet(sp.id, `${sp.name} (milestone)`);
    }
  }

  unlockPet(
    speciesId: string,
    label?: string,
    opts?: { color?: number; colorName?: string; silent?: boolean }
  ): PetInstance | null {
    const sp = PET_SPECIES[speciesId];
    if (!sp) return null;
    if (this.save.pets.some((p) => p.speciesId === speciesId)) {
      if (!opts?.silent) this.log(`You already have ${sp.name}.`);
      return null;
    }
    const pet: PetInstance = {
      id: randomPetInstanceId(),
      speciesId,
      name: label ?? sp.name,
      level: 1,
      xp: 0,
      traits: [...sp.traits],
      active: this.save.pets.length === 0,
      color: opts?.color,
      colorName: opts?.colorName,
    };
    if (pet.active) this.save.pets.forEach((p) => (p.active = false));
    this.save.pets.push(pet);
    if (!opts?.silent) this.log(`Pet unlocked: ${pet.name}!`);
    this.mark();
    return pet;
  }

  activePet(): PetInstance | undefined {
    return this.save.pets.find((p) => p.active) ?? this.save.pets[0];
  }

  setActivePet(petId: string) {
    for (const p of this.save.pets) p.active = p.id === petId;
    this.mark();
  }

  trainPet(amount: number) {
    const pet = this.activePet();
    if (!pet) return;
    // Light Orb advances only via ashes / oak logs.
    if (pet.speciesId === LIGHT_ORB_SPECIES) return;
    pet.xp += amount;
    const need = pet.level * 40;
    if (pet.xp >= need) {
      pet.xp -= need;
      pet.level += 1;
      this.log(`${pet.name} reached pet level ${pet.level}!`);
    }
    this.mark();
  }

  lightOrb(): PetInstance | undefined {
    return this.save.pets.find((p) => p.speciesId === LIGHT_ORB_SPECIES);
  }

  /** Feed ashes to Light Orb (level 1 → 2 needs 1000). Returns ashes consumed. */
  feedLightOrbAshes(qty: number): number {
    const pet = this.lightOrb();
    if (!pet) {
      this.log("You need a Light Orb to feed ashes.");
      return 0;
    }
    if (pet.level >= 2) {
      this.log("Light Orb no longer eats ashes — feed oak logs instead.");
      return 0;
    }
    pet.ashesFed = pet.ashesFed ?? 0;
    const need = LIGHT_ORB_ASHES_TO_L2 - pet.ashesFed;
    if (need <= 0) {
      pet.level = Math.max(pet.level, 2);
      this.mark();
      return 0;
    }
    const take = Math.min(qty, need);
    if (take <= 0) return 0;
    pet.ashesFed += take;
    this.log(`Light Orb absorbs ${take} ash (${pet.ashesFed}/${LIGHT_ORB_ASHES_TO_L2}).`);
    if (pet.ashesFed >= LIGHT_ORB_ASHES_TO_L2) {
      pet.level = 2;
      pet.oakFed = pet.oakFed ?? 0;
      this.log("Light Orb evolves to level 2! Feed oak logs to train further (250 to level 30).");
    }
    this.mark();
    return take;
  }

  /** Feed oak logs to Light Orb (level 2 → 30 needs 250 oak). Returns logs consumed. */
  feedLightOrbOak(qty: number): number {
    const pet = this.lightOrb();
    if (!pet) {
      this.log("You need a Light Orb to feed oak logs.");
      return 0;
    }
    if (pet.level < 2) {
      const fed = pet.ashesFed ?? 0;
      this.log(`Light Orb must evolve first — feed ashes (${fed}/${LIGHT_ORB_ASHES_TO_L2}).`);
      return 0;
    }
    if (pet.level >= 30) {
      this.log("Light Orb is fully grown (level 30).");
      return 0;
    }
    pet.oakFed = pet.oakFed ?? 0;
    const need = LIGHT_ORB_OAK_TO_L30 - pet.oakFed;
    const take = Math.min(qty, need);
    if (take <= 0) return 0;
    pet.oakFed += take;
    pet.level = lightOrbLevelFromOakFed(pet.oakFed);
    this.log(`Light Orb eats ${take} oak log${take > 1 ? "s" : ""} (${pet.oakFed}/${LIGHT_ORB_OAK_TO_L30}) → level ${pet.level}.`);
    if (pet.level >= 30) {
      this.log("Light Orb reaches level 30 — the ash-and-oak loop is complete.");
    }
    this.mark();
    return take;
  }

  hasResearch(id: string): boolean {
    return this.save.research.some((r) => r.id === id);
  }

  addResearch(def: ResearchDef): boolean {
    if (this.hasResearch(def.id)) {
      this.log(`Already in Research Book: ${def.name}.`);
      return false;
    }
    const entry: ResearchEntry = {
      id: def.id,
      name: def.name,
      category: def.category,
      researchedAt: Date.now(),
      note: def.note,
    };
    this.save.research.push(entry);
    this.log(`Researched: ${def.name}.`);
    this.mark();
    return true;
  }

  quest(id: string): QuestProgress {
    let q = this.save.quests.find((x) => x.questId === id);
    if (!q) {
      q = { questId: id, status: "available", step: 0, flags: {} };
      this.save.quests.push(q);
    }
    return q;
  }

  startQuest(id: string) {
    const q = this.quest(id);
    const def = QUESTS[id];
    if (!def) return;
    if (def.requiredPetLevel || def.requiredPetTrait) {
      const pet = this.activePet();
      if (!pet || (def.requiredPetLevel && pet.level < def.requiredPetLevel)) {
        this.log(`Need a pet of level ${def.requiredPetLevel ?? 1}+.`);
        return;
      }
      if (def.requiredPetTrait && !pet.traits.includes(def.requiredPetTrait)) {
        this.log(`Need a pet with the ${def.requiredPetTrait} trait.`);
        return;
      }
    }
    if (q.status === "completed") {
      this.log("Quest already completed.");
      return;
    }
    q.status = "active";
    this.log(`Quest started: ${def.name}`);
    this.mark();
  }

  advanceQuest(id: string, step: number, flag?: string) {
    const q = this.quest(id);
    if (q.status !== "active") return;
    if (flag) q.flags[flag] = true;
    if (step > q.step) q.step = step;
    this.mark();
  }

  completeQuest(id: string) {
    const q = this.quest(id);
    const def = QUESTS[id];
    if (!def || q.status === "completed") return;
    q.status = "completed";
    q.step = def.steps.length;
    if (def.rewardPet) this.unlockPet(def.rewardPet, undefined, { silent: true });
    if (def.rewardAshes && def.rewardAshes > 0) {
      this.addItem("ashes", def.rewardAshes);
      this.log(`+${def.rewardAshes} ashes`);
    }
    if (def.rewardGold) {
      this.save.gold += def.rewardGold;
      this.log(`+${def.rewardGold} gold`);
    }
    if (def.unlockZone && !this.save.unlockedZones.includes(def.unlockZone)) {
      this.save.unlockedZones.push(def.unlockZone);
      this.log(`Zone unlocked: ${def.unlockZone}`);
    }
    this.log(`Quest complete: ${def.name}`);
    this.mark();
  }

  heal(amount: number) {
    this.save.hp = Math.min(this.save.maxHp, this.save.hp + amount);
    this.mark();
  }

  takeDamage(amount: number): boolean {
    this.save.hp = Math.max(0, this.save.hp - amount);
    this.mark();
    return this.save.hp <= 0;
  }

  inventoryList(): InventorySlot[] {
    return this.ensureInv();
  }
}
