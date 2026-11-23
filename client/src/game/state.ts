import {
  addSkillXp,
  defaultSave,
  type CharacterSave,
  type InventorySlot,
  type PetInstance,
  type QuestProgress,
  type SkillId,
} from "@shared/index";
import { ITEMS } from "../content/items";
import { PET_SPECIES, randomPetInstanceId } from "../content/pets";
import { QUESTS } from "../content/quests";

export type LogFn = (msg: string) => void;

export class GameState {
  save: CharacterSave;
  log: LogFn;
  dirty = false;

  constructor(save: CharacterSave | null, log: LogFn) {
    this.save = save ?? defaultSave();
    this.log = log;
  }

  mark() {
    this.dirty = true;
  }

  invQty(itemId: string): number {
    return this.save.inventory.find((s) => s.itemId === itemId)?.qty ?? 0;
  }

  addItem(itemId: string, qty = 1) {
    const stackable = ITEMS[itemId]?.stackable ?? true;
    const slot = this.save.inventory.find((s) => s.itemId === itemId);
    if (slot && stackable) slot.qty += qty;
    else this.save.inventory.push({ itemId, qty });
    this.mark();
  }

  removeItem(itemId: string, qty = 1): boolean {
    const slot = this.save.inventory.find((s) => s.itemId === itemId);
    if (!slot || slot.qty < qty) return false;
    slot.qty -= qty;
    if (slot.qty <= 0) this.save.inventory = this.save.inventory.filter((s) => s !== slot);
    this.mark();
    return true;
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
      this.checkSkillPets(skill, newLevel);
    }
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
      this.log(`You already have ${sp.name}.`);
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
    pet.xp += amount;
    const need = pet.level * 40;
    if (pet.xp >= need) {
      pet.xp -= need;
      pet.level += 1;
      this.log(`${pet.name} reached pet level ${pet.level}!`);
    }
    this.mark();
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
    if (def.rewardPet) this.unlockPet(def.rewardPet);
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
    return this.save.inventory;
  }
}
