import {
  skillingTicksForLevel,
  WEAR_SLOT_LABELS,
  type AttackStyle,
  type SkillId,
  type WearSlot,
} from "@shared/index";
import { ITEMS, UNARMED_ATTACK_TICKS, equippedWeapon, itemExamine, itemWearSlot } from "../content/items";
import type { WorldNode } from "../content/world";
import { researchDefForItem, researchDefForNode, researchIdForPetSpecies, RESEARCH_DEFS } from "../content/research";
import { PET_SPECIES } from "../content/pets";
import { ActionScheduler, TickClock } from "./tick";
import type { GameState } from "./state";
import type { World3D } from "./world3d";

export type SplatFn = (
  worldPos: { x: number; y: number; z: number },
  text: string,
  kind: "hit" | "miss" | "heal" | "hurt"
) => void;

export class GameSession {
  clock = new TickClock();
  scheduler: ActionScheduler;
  combatTarget: string | null = null;
  onSplat: SplatFn | null = null;
  onUi: (() => void) | null = null;
  onBattleOpen: ((node: WorldNode) => void) | null = null;
  onBattleClose: (() => void) | null = null;

  constructor(
    public state: GameState,
    public world: World3D
  ) {
    this.scheduler = new ActionScheduler(this.clock);
    this.clock.start();
  }

  update(dt: number) {
    this.clock.update(dt);
  }

  private refresh() {
    this.world.setPlayerEquipment(this.state.save.equipment);
    this.onUi?.();
  }

  /** Start a one-shot skilling action (no auto-chain). */
  startGather(node: WorldNode, skill: SkillId, onComplete: () => void) {
    if (this.scheduler.hasKind("gather")) {
      this.state.log("You're already gathering.");
      return;
    }
    const level = this.state.save.skills[skill].level;
    const ticks = skillingTicksForLevel(level);
    this.world.startProgressSprite(node.id);
    this.state.log(`Gathering… (${ticks} tick${ticks > 1 ? "s" : ""})`);
    this.scheduler.after(ticks, "gather", () => {
      this.world.stopProgressSprite(node.id);
      onComplete();
      this.refresh();
    });
  }

  /** Player melee delay from equipped weapon (fist = 5, bronze sword = 4). */
  weaponTicks(): number {
    const wpn = equippedWeapon(this.state.save.equipment.weapon);
    return wpn.attackTicks ?? UNARMED_ATTACK_TICKS;
  }

  private enemyAttackTicks(node: WorldNode): number {
    return Math.max(1, Number(node.meta?.attackTicks ?? 5));
  }

  startCombat(node: WorldNode) {
    const needZone = String(node.meta?.requireZone ?? "");
    if (needZone && !this.state.save.unlockedZones.includes(needZone)) {
      this.state.log(`The ${node.label} stirs beyond a sealed threshold (${needZone}).`);
      return;
    }
    const mesh = this.world.nodeMeshes.get(node.id);
    if (mesh && !mesh.visible) {
      this.state.log(`${node.label} already defeated. It will return soon.`);
      return;
    }
    if (this.combatTarget === node.id) {
      this.world.setCombatTarget(node.id);
      this.refresh();
      return;
    }
    const switching = !!this.combatTarget;
    this.combatTarget = node.id;
    this.world.setCombatTarget(node.id);
    this.clearCombatSchedules();
    const hp = this.world.enemyHp.get(node.id) ?? Number(node.meta?.hp ?? 5);
    const wpn = equippedWeapon(this.state.save.equipment.weapon);
    const eTicks = this.enemyAttackTicks(node);
    if (switching) {
      this.state.log(`[Combat] Switching target → ${node.label} (${hp} hp).`);
    } else {
      this.state.log(
        `[Combat] Fighting ${node.label}! (${hp} hp) · you ${wpn.name} ${this.weaponTicks()}t · foe ${eTicks}t`
      );
    }
    this.onBattleOpen?.(node);
    this.queuePlayerHit();
    this.queueEnemyHit();
    this.refresh();
  }

  private clearCombatSchedules() {
    this.scheduler.cancelKind("combat_player");
    this.scheduler.cancelKind("combat_enemy");
    this.scheduler.cancelKind("combat"); // legacy
  }

  private queuePlayerHit() {
    if (!this.combatTarget) return;
    this.scheduler.after(this.weaponTicks(), "combat_player", () => this.resolvePlayerHit());
  }

  private queueEnemyHit() {
    if (!this.combatTarget) return;
    const node = this.world.allNodes().find((n) => n.id === this.combatTarget);
    if (!node) return;
    this.scheduler.after(this.enemyAttackTicks(node), "combat_enemy", () => this.resolveEnemyHit());
  }

  private clearCombat(reason?: string) {
    if (this.combatTarget && reason) this.state.log(`[Combat] ${reason}`);
    const wasFighting = !!this.combatTarget;
    this.combatTarget = null;
    this.world.setCombatTarget(null);
    this.clearCombatSchedules();
    if (wasFighting) this.onBattleClose?.();
  }

  private livingCombatTarget(): WorldNode | null {
    const id = this.combatTarget;
    if (!id) return null;
    const node = this.world.allNodes().find((n) => n.id === id);
    if (!node || node.kind !== "enemy") {
      this.clearCombat("Combat ended.");
      this.refresh();
      return null;
    }
    const mesh = this.world.nodeMeshes.get(id);
    if (mesh && !mesh.visible) {
      this.clearCombat(`${node.label} is gone — combat ended.`);
      this.refresh();
      return null;
    }
    return node;
  }

  private resolvePlayerHit() {
    const node = this.livingCombatTarget();
    if (!node) return;

    if (this.state.save.selectedSpell === "water") {
      this.resolveWaterHit(node);
      return;
    }

    const id = node.id;
    let hp = this.world.enemyHp.get(id) ?? Number(node.meta?.hp ?? 5);
    const style = this.state.save.attackStyle;
    const atk = this.state.save.skills.attack.level;
    const str = this.state.save.skills.strength.level;
    const wpn = equippedWeapon(this.state.save.equipment.weapon);
    const accBonus = (wpn.attackBonus ?? 0) + (style === "accurate" ? 2 : 0);
    const strBonus = (wpn.strengthBonus ?? 0) + (style === "aggressive" ? 2 : 0);
    const accuracy = atk + accBonus + Math.random() * 8;
    const evade = Number(node.meta?.boss ? 8 : 4) + Math.random() * 6;
    const pos = this.world.nodeWorldPos(id) || { x: node.x, y: 1.2, z: node.z };

    if (accuracy < evade) {
      this.state.log(`[Combat] Miss → ${node.label}.`);
      this.onSplat?.(pos, "MISS", "miss");
    } else {
      const maxHit = Math.max(1, Math.floor((str + strBonus) / 3) + (style === "aggressive" ? 1 : 0));
      const dmg = 1 + Math.floor(Math.random() * maxHit);
      hp -= dmg;
      this.world.enemyHp.set(id, hp);
      this.state.log(`[Combat] You hit ${node.label} for ${dmg} — ${Math.max(0, hp)} hp left.`);
      this.onSplat?.(pos, `−${dmg}`, "hit");
      this.grantCombatXp(style, node);
      this.state.trainPet(10);
    }

    if (hp <= 0) {
      this.onEnemyKilled(node);
      return;
    }

    this.queuePlayerHit();
    this.refresh();
  }

  /** Level-1 Water — staff + Water Essence; Magic XP. */
  private resolveWaterHit(node: WorldNode) {
    const id = node.id;
    const wpn = equippedWeapon(this.state.save.equipment.weapon);
    const magicLvl = this.state.save.skills.magic.level;
    const pos = this.world.nodeWorldPos(id) || { x: node.x, y: 1.2, z: node.z };

    if (!wpn.allowsMagic) {
      this.state.log("[Combat] Water needs a staff equipped — falling back to melee.");
      this.state.setSelectedSpell(null);
      this.resolvePlayerHit();
      return;
    }
    if (magicLvl < 1) {
      this.state.log("[Combat] Need Magic level 1 for Water.");
      this.queuePlayerHit();
      this.refresh();
      return;
    }
    if (this.state.invQty("water_essence") < 1) {
      this.state.log("[Combat] Out of Water Essence — switching to melee style.");
      this.state.setSelectedSpell(null);
      this.resolvePlayerHit();
      return;
    }
    this.state.removeItem("water_essence", 1);

    const magBonus = wpn.magicBonus ?? 0;
    const accuracy = magicLvl + magBonus + Math.random() * 8;
    const evade = Number(node.meta?.boss ? 9 : 5) + Math.random() * 5;
    let hp = this.world.enemyHp.get(id) ?? Number(node.meta?.hp ?? 5);

    if (accuracy < evade) {
      this.state.log(`[Combat] Water misses ${node.label}.`);
      this.onSplat?.(pos, "MISS", "miss");
    } else {
      const maxHit = Math.max(1, Math.floor(magicLvl / 2) + magBonus);
      const dmg = 1 + Math.floor(Math.random() * maxHit);
      hp -= dmg;
      this.world.enemyHp.set(id, hp);
      this.state.grantXp("magic", 12 + dmg * 2);
      this.state.log(`[Combat] Water hits ${node.label} for ${dmg} — ${Math.max(0, hp)} hp left.`);
      this.onSplat?.(pos, `−${dmg}`, "hit");
      this.state.trainPet(8);
    }

    if (hp <= 0) {
      this.onEnemyKilled(node);
      return;
    }
    this.queuePlayerHit();
    this.refresh();
  }

  private onEnemyKilled(node: WorldNode) {
    const id = node.id;
    this.state.grantXp("hitpoints", Number(node.meta?.xpHp ?? 10));
    if (node.meta?.xpMagic) this.state.grantXp("magic", Number(node.meta.xpMagic));
    this.state.addItem("iron_scrap", 1);
    // Alley Rats drip Water Essence + 1–5 coins
    if (node.id.includes("rat") || node.label.toLowerCase().includes("rat")) {
      this.state.addItem("water_essence", 1);
      const coins = 1 + Math.floor(Math.random() * 5);
      this.state.save.gold += coins;
      this.state.mark();
      this.state.log(`The rat leaves Water Essence and ${coins} coin${coins === 1 ? "" : "s"}.`);
    }
    this.world.hideEnemy(id);
    setTimeout(() => this.world.showEnemy(id, Number(node.meta?.hp ?? 5)), 20000);
    this.clearCombat(`${node.label} defeated! Combat ended.`);
    this.onEnemyDefeated?.(node);
    this.refresh();
  }

  private resolveEnemyHit() {
    const node = this.livingCombatTarget();
    if (!node) return;
    const id = node.id;
    const style = this.state.save.attackStyle;
    const def = this.state.save.skills.defence.level;
    const maxHit = Math.max(1, Number(node.meta?.maxHit ?? (node.meta?.boss ? 3 : 1)));
    const rawHurt = 1 + Math.floor(Math.random() * maxHit);
    const mitigated = Math.max(0, rawHurt - Math.floor(def / 8) - (style === "defensive" ? 1 : 0));
    if (mitigated > 0) {
      const dead = this.state.takeDamage(mitigated);
      this.state.log(`[Combat] ${node.label} hits you for ${mitigated}.`);
      const ppos = { x: this.world.player.position.x, y: 1.4, z: this.world.player.position.z };
      this.onSplat?.(ppos, `−${mitigated}`, "hurt");
      if (dead) {
        this.state.save.hp = this.state.save.maxHp;
        this.state.save.position = { x: 0, y: 0, z: 0 };
        this.world.setPlayerPosition(0, 0);
        this.world.showEnemy(id, Number(node.meta?.hp ?? 5));
        this.clearCombat("You were defeated — waking at spawn.");
        this.refresh();
        return;
      }
    } else {
      this.state.log(`[Combat] ${node.label} glances off you.`);
      const ppos = { x: this.world.player.position.x, y: 1.4, z: this.world.player.position.z };
      this.onSplat?.(ppos, "0", "miss");
    }
    this.queueEnemyHit();
    this.refresh();
  }

  onEnemyDefeated: ((node: WorldNode) => void) | null = null;

  private grantCombatXp(style: AttackStyle, node: WorldNode) {
    const baseAtk = Number(node.meta?.xpAttack ?? 10);
    const baseStr = Number(node.meta?.xpStr ?? 8);
    if (style === "accurate") this.state.grantXp("attack", baseAtk);
    else if (style === "aggressive") this.state.grantXp("strength", baseStr + 4);
    else if (style === "defensive") this.state.grantXp("defence", Math.floor((baseAtk + baseStr) / 2));
    else {
      this.state.grantXp("attack", Math.floor(baseAtk / 3));
      this.state.grantXp("strength", Math.floor(baseStr / 3));
      this.state.grantXp("defence", Math.floor(baseAtk / 3));
    }
  }

  stopCombat() {
    if (this.combatTarget) {
      const node = this.world.allNodes().find((n) => n.id === this.combatTarget);
      this.clearCombat(node ? `Stopped fighting ${node.label}.` : "Combat ended.");
    } else {
      this.clearCombat();
    }
    this.refresh();
  }

  combatStatus(): string | null {
    if (!this.combatTarget) return null;
    const node = this.world.allNodes().find((n) => n.id === this.combatTarget);
    if (!node) return null;
    const hp = this.world.enemyHp.get(node.id) ?? Number(node.meta?.hp ?? 5);
    const wpn = equippedWeapon(this.state.save.equipment.weapon);
    const spell = this.state.save.selectedSpell;
    const mode = spell === "water" ? "Water" : wpn.name;
    return `Fighting ${node.label} · ${Math.max(0, hp)} hp · ${mode} ${this.weaponTicks()}t`;
  }

  unequipWeapon() {
    this.unequipSlot("weapon");
  }

  unequipSlot(slot: WearSlot) {
    const id = this.state.save.equipment[slot];
    if (!id) {
      this.state.log(`${WEAR_SLOT_LABELS[slot]} is empty.`);
      return;
    }
    const name = ITEMS[id]?.name ?? id;
    delete this.state.save.equipment[slot];
    if (slot === "weapon") {
      this.state.log(`Unequipped ${name}. Fighting with Fist (5 ticks).`);
    } else {
      this.state.log(`Removed ${name} from ${WEAR_SLOT_LABELS[slot]}.`);
    }
    this.state.mark();
    this.refresh();
  }

  /** Wear an item into its slot (must still be in inventory). */
  wearItem(itemId: string) {
    const def = ITEMS[itemId];
    const slot = def?.wearSlot ?? itemWearSlot(itemId);
    if (!def || !slot) {
      this.state.log("That can't be worn.");
      return;
    }
    if (this.state.invQty(itemId) < 1) {
      this.state.log(`You don't have ${def.name}.`);
      return;
    }
    const prev = this.state.save.equipment[slot];
    this.state.save.equipment[slot] = itemId;
    if (prev && prev !== itemId) {
      this.state.log(`Swapped ${ITEMS[prev]?.name ?? prev} → ${def.name} (${WEAR_SLOT_LABELS[slot]}).`);
    } else if (slot === "weapon") {
      const ticks = def.attackTicks ?? UNARMED_ATTACK_TICKS;
      this.state.log(`Worn ${def.name} (${WEAR_SLOT_LABELS[slot]}${def.category === "weapon" || def.attackTicks ? `, ${ticks}-tick` : ""}).`);
    } else {
      this.state.log(`Worn ${def.name} (${WEAR_SLOT_LABELS[slot]}).`);
    }
    this.state.mark();
    this.refresh();
  }

  researchNode(node: WorldNode) {
    const def = researchDefForNode(node);
    if (!def) {
      this.state.log("Nothing to research.");
      return;
    }
    this.state.addResearch(def);
    this.refresh();
  }

  researchPetSpecies(speciesId: string) {
    const id = researchIdForPetSpecies(speciesId);
    const def = RESEARCH_DEFS[id] || {
      id,
      name: PET_SPECIES[speciesId]?.name ?? speciesId,
      category: "pet" as const,
      note: PET_SPECIES[speciesId]?.desc ?? "A familiar.",
    };
    this.state.addResearch(def);
    this.refresh();
  }

  researchItem(itemId: string) {
    this.state.addResearch(researchDefForItem(itemId));
    this.refresh();
  }

  examineItem(itemId: string) {
    this.state.log(itemExamine(itemId));
  }

  useItem(itemId: string) {
    const def = ITEMS[itemId];
    if (!def) return;
    if (itemId === "ashes") {
      const qty = this.state.invQty("ashes");
      const fed = this.state.feedLightOrbAshes(qty);
      if (fed > 0) this.state.removeItem("ashes", fed);
      this.refresh();
      return;
    }
    if (itemId === "oak_logs") {
      const orb = this.state.lightOrb();
      if (orb && orb.level >= 2 && orb.level < 30) {
        const qty = this.state.invQty("oak_logs");
        const fed = this.state.feedLightOrbOak(qty);
        if (fed > 0) this.state.removeItem("oak_logs", fed);
        this.refresh();
        return;
      }
      // Otherwise burn one oak → 2 ash
      if (!this.state.removeItem("oak_logs", 1)) return;
      if (!this.state.addItem("ashes", 2)) {
        this.state.addItem("oak_logs", 1);
        return;
      }
      this.state.grantXp("magic", 45);
      this.state.log("You burn an Oak Log into 2 ashes.");
      this.refresh();
      return;
    }
    if (itemId === "tree_logs") {
      if (!this.state.removeItem("tree_logs", 1)) return;
      if (!this.state.addItem("ashes", 1)) {
        this.state.addItem("tree_logs", 1);
        return;
      }
      this.state.grantXp("magic", 30);
      this.state.log("You burn a Tree Log into 1 ash.");
      const q = this.state.quest("q1_lamp_familiar");
      if (q.status === "active") {
        this.state.advanceQuest("q1_lamp_familiar", 2, "burned");
        if (!this.state.invQty("lamp_wick")) {
          this.state.addItem("lamp_wick", 1);
          this.state.log("The smoke leaves an Enchanted Wick.");
        }
      }
      this.refresh();
      return;
    }
    if (def.category === "food" && def.heal) {
      if (!this.state.removeItem(itemId, 1)) return;
      this.state.heal(def.heal);
      this.state.log(`You eat ${def.name} (+${def.heal} hp).`);
      this.refresh();
      return;
    }
    if (def.wearSlot) {
      if (this.state.save.equipment[def.wearSlot] === itemId) {
        this.unequipSlot(def.wearSlot);
      } else {
        this.wearItem(itemId);
      }
      return;
    }
    this.state.log(`You can't use ${def.name} that way.`);
  }

  dropItemSlot(index: number) {
    const dropped = this.state.dropSlot(index);
    if (!dropped) return;
    // Clear worn slots that referenced the dropped item if none remain.
    for (const slot of Object.keys(this.state.save.equipment) as WearSlot[]) {
      if (this.state.save.equipment[slot] === dropped.itemId && this.state.invQty(dropped.itemId) < 1) {
        delete this.state.save.equipment[slot];
      }
    }
    this.state.log(`You drop ${dropped.qty}× ${ITEMS[dropped.itemId]?.name ?? dropped.itemId}.`);
    this.refresh();
  }
}
