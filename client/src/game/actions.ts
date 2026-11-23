import type { WorldNode } from "../content/world";
import { ITEMS } from "../content/items";
import { PET_SPECIES } from "../content/pets";
import { randomDwarfDragonColor } from "../content/dragon-colors";
import type { GameState } from "./state";
import type { World3D } from "./world3d";

export function interact(node: WorldNode, state: GameState, world: World3D) {
  const now = performance.now();
  const cd = world.nodeCooldown.get(node.id) ?? 0;
  if (cd > now) {
    state.log("Still busy…");
    return;
  }

  switch (node.kind) {
    case "npc":
      talkNpc(node, state);
      break;
    case "tree":
      chopTree(node, state, world);
      break;
    case "rock":
      mineRock(node, state, world);
      break;
    case "fish":
      fish(node, state, world);
      break;
    case "forge":
      smelt(state);
      break;
    case "bench":
      craft(state);
      break;
    case "enemy":
      fight(node, state, world);
      break;
    case "wild_pet":
      catchWild(node, state, world);
      break;
    case "zone":
      enterZone(node, state);
      break;
    case "ground_egg":
      clickGroundEgg(node, state, world);
      break;
  }
}

function talkNpc(node: WorldNode, state: GameState) {
  const npc = String(node.meta?.npc ?? "");
  if (npc === "mabel") {
    const q = state.quest("q1_lamp_familiar");
    if (q.status === "available") {
      state.startQuest("q1_lamp_familiar");
      state.log("Mabel: Fetch oak-smoke for an enchanted wick, dear.");
      return;
    }
    if (q.status === "active") {
      if (q.step >= 2 || q.flags.burned) {
        if (!state.invQty("lamp_wick")) state.addItem("lamp_wick", 1);
        state.completeQuest("q1_lamp_familiar");
        state.log("Mabel: A Lamp Moth for you — treat it kindly.");
      } else {
        state.log("Mabel: Chop oak, then cast Spark on a log.");
      }
      return;
    }
    state.log("Mabel: The gaslamps keep the old gods drowsy.");
    return;
  }
  if (npc === "holt") {
    const q = state.quest("q2_catcher_path");
    if (q.status === "available") {
      state.startQuest("q2_catcher_path");
      state.log("Holt: Mine copper & tin, smelt a bar, craft a lure.");
      return;
    }
    if (q.status === "active" && state.invQty("crafted_lure") > 0) {
      state.removeItem("crafted_lure", 1);
      state.completeQuest("q2_catcher_path");
      state.log("Holt: Take the Street Ferret — a proper Catcher.");
      return;
    }
    if (q.status === "active") {
      state.log("Holt: Smelt at the forge, craft at the bench, then return.");
      return;
    }
    // Quest 3 hook
    const q3 = state.quest("q3_outskirts_delve");
    if (q3.status === "available" && state.save.pets.some((p) => p.traits.includes("catcher"))) {
      state.startQuest("q3_outskirts_delve");
      state.log("Holt: Train your Catcher to 3, catch a crow, then face the Mist Shade.");
      return;
    }
    if (q3.status === "active") {
      state.log("Holt: Catcher training, Cobble Crow, then the Mist Shade on the road.");
      return;
    }
    state.log("Holt: The forge never sleeps.");
  }
}

function chopTree(node: WorldNode, state: GameState, world: World3D) {
  if (state.invQty("bronze_axe") < 1 && state.save.equipment.tool !== "bronze_axe") {
    state.log("You need an axe.");
    return;
  }
  world.nodeCooldown.set(node.id, performance.now() + 1800);
  state.addItem("oak_logs", 1);
  state.grantXp("woodcutting", Number(node.meta?.xp ?? 25));
  state.log("You chop oak logs.");
  const q = state.quest("q1_lamp_familiar");
  if (q.status === "active") state.advanceQuest("q1_lamp_familiar", 1, "chopped");
}

/** Level-1 Magic: burn logs — trains Magic, not a separate Firemaking skill. */
export function castSpark(state: GameState) {
  if (state.save.skills.magic.level < 1) {
    state.log("Magic level too low.");
    return;
  }
  if (!state.removeItem("oak_logs", 1)) {
    state.log("Need oak logs to burn.");
    return;
  }
  state.grantXp("magic", 30);
  state.log("You cast Spark and burn the logs. Magic XP gained.");
  const q = state.quest("q1_lamp_familiar");
  if (q.status === "active") {
    state.advanceQuest("q1_lamp_familiar", 2, "burned");
    if (!state.invQty("lamp_wick")) {
      state.addItem("lamp_wick", 1);
      state.log("The smoke leaves an Enchanted Wick.");
    }
  }
}

function mineRock(node: WorldNode, state: GameState, world: World3D) {
  if (state.invQty("bronze_pickaxe") < 1) {
    state.log("You need a pickaxe.");
    return;
  }
  const ore = String(node.meta?.ore ?? "copper_ore");
  world.nodeCooldown.set(node.id, performance.now() + 2000);
  state.addItem(ore, 1);
  state.grantXp("mining", Number(node.meta?.xp ?? 22));
  state.log(`You mine ${ITEMS[ore]?.name ?? ore}.`);
  const q = state.quest("q2_catcher_path");
  if (q.status === "active") {
    if (ore === "copper_ore") state.advanceQuest("q2_catcher_path", 1, "copper");
    if (ore === "tin_ore") state.advanceQuest("q2_catcher_path", 1, "tin");
  }
}

function fish(node: WorldNode, state: GameState, world: World3D) {
  if (state.invQty("fishing_rod") < 1) {
    state.log("You need a fishing rod.");
    return;
  }
  world.nodeCooldown.set(node.id, performance.now() + 2200);
  state.addItem("raw_fish", 1);
  state.grantXp("fishing", Number(node.meta?.xp ?? 20));
  state.log("You catch a raw minnow.");
}

function smelt(state: GameState) {
  if (state.invQty("copper_ore") < 1 || state.invQty("tin_ore") < 1) {
    state.log("Need 1 copper ore and 1 tin ore.");
    return;
  }
  state.removeItem("copper_ore", 1);
  state.removeItem("tin_ore", 1);
  state.addItem("bronze_bar", 1);
  state.grantXp("mining", 18);
  state.log("You smelt a bronze bar.");
  const q = state.quest("q2_catcher_path");
  if (q.status === "active") state.advanceQuest("q2_catcher_path", 2, "smelted");
}

function craft(state: GameState) {
  if (state.invQty("bronze_bar") < 1) {
    state.log("Need a bronze bar to craft a lure.");
    return;
  }
  state.removeItem("bronze_bar", 1);
  state.addItem("crafted_lure", 1);
  state.grantXp("crafting", 35);
  state.log("You craft a lure.");
  const q = state.quest("q2_catcher_path");
  if (q.status === "active") state.advanceQuest("q2_catcher_path", 3, "crafted");
}

function fight(node: WorldNode, state: GameState, world: World3D) {
  const needZone = String(node.meta?.requireZone ?? "");
  if (needZone && !state.save.unlockedZones.includes(needZone)) {
    state.log(`The ${node.label} stirs beyond a sealed threshold (${needZone}).`);
    return;
  }
  const mesh = world.nodeMeshes.get(node.id);
  if (mesh && !mesh.visible) {
    state.log(`${node.label} already defeated. It will return soon.`);
    return;
  }
  let hp = world.enemyHp.get(node.id) ?? Number(node.meta?.hp ?? 5);
  if (hp <= 0) {
    state.log(`${node.label} already defeated. It will return soon.`);
    return;
  }
  const atk = state.save.skills.attack.level;
  const str = state.save.skills.strength.level;
  const dmg = Math.max(1, Math.floor((atk + str) / 4 + Math.random() * 3));
  hp -= dmg;
  world.enemyHp.set(node.id, hp);
  state.grantXp("attack", Number(node.meta?.xpAttack ?? 10));
  state.grantXp("strength", Number(node.meta?.xpStr ?? 8));
  state.log(`You hit ${node.label} for ${dmg}. (${Math.max(0, hp)} hp left)`);

  // Enemy retaliates lightly
  const hurt = Math.max(1, Math.floor(Math.random() * 2) + (node.meta?.boss ? 2 : 0));
  const dead = state.takeDamage(hurt);
  if (hurt) state.log(`${node.label} hits you for ${hurt}.`);
  if (dead) {
    state.save.hp = state.save.maxHp;
    state.save.position = { x: 0, y: 0, z: 0 };
    world.setPlayerPosition(0, 0);
    // Reset the foe so the delve can be retried
    world.showEnemy(node.id, Number(node.meta?.hp ?? 5));
    state.log("You collapse and wake in the town square.");
    state.mark();
    return;
  }

  state.trainPet(12);
  if (hp <= 0) {
    state.grantXp("hitpoints", Number(node.meta?.xpHp ?? 10));
    if (node.meta?.xpMagic) state.grantXp("magic", Number(node.meta.xpMagic));
    state.addItem("iron_scrap", 1);
    state.log(`${node.label} defeated!`);
    world.hideEnemy(node.id);
    setTimeout(() => {
      world.showEnemy(node.id, Number(node.meta?.hp ?? 5));
    }, 20000);
    const q3 = state.quest("q3_outskirts_delve");
    if (node.id === "shade" && node.meta?.boss && q3.status === "active") {
      state.advanceQuest("q3_outskirts_delve", 3, "shade");
      const pet = state.activePet();
      const catcherReady = !!pet && pet.traits.includes("catcher") && pet.level >= 3;
      const hasCrow = !!q3.flags.crow || state.save.pets.some((p) => p.speciesId === "cobble_crow");
      if (catcherReady && hasCrow) {
        state.completeQuest("q3_outskirts_delve");
      } else {
        state.log("Shade down — finish Catcher lv3 + Cobble Crow if still missing.");
      }
    }
    // Amethyst Drake boss → egg appears on the ground at the kill spot
    if (node.meta?.rewardEgg) {
      const q4 = state.quest("q4_amethyst_drake");
      if (q4.status === "available") {
        q4.status = "active";
        q4.step = 1;
      }
      if (q4.status === "active") state.advanceQuest("q4_amethyst_drake", 2, "drake_slain");
      // Drop on the ground at the kill spot (slight offset so it isn't under the corpse hitbox)
      world.spawnGroundEgg(node.x + 1.1, node.z + 0.4, String(node.meta.rewardEgg));
      state.log("The Drake falls — an Amethyst Dragon Egg rests on the ground. Click it.");
    }
  }
  // Soft respawn after defeat already scheduled; keep combat snappy
  world.nodeCooldown.set(node.id, performance.now() + 600);
}

function catchWild(node: WorldNode, state: GameState, world: World3D) {
  const speciesId = String(node.meta?.species ?? "");
  const sp = PET_SPECIES[speciesId];
  if (!sp) return;
  const pet = state.activePet();
  if (!pet || !pet.traits.includes("catcher")) {
    state.log("Only a Catcher pet can attempt wild catches.");
    return;
  }
  if (pet.level < sp.catchTier) {
    state.log(`Catcher needs pet level ${sp.catchTier}+ for this familiar.`);
    return;
  }
  if (!state.removeItem("catch_net", 1)) {
    state.log("Need a Catch Net (consumed on attempt).");
    return;
  }
  const chance = Math.min(0.85, 0.35 + pet.level * 0.1 - sp.catchTier * 0.08);
  world.nodeCooldown.set(node.id, performance.now() + 2500);
  state.trainPet(12);
  if (Math.random() > chance) {
    state.log(`Catch failed — ${sp.name} slipped away. Net consumed.`);
    return;
  }
  state.unlockPet(speciesId);
  state.log(`Caught ${sp.name}!`);
  const q3 = state.quest("q3_outskirts_delve");
  if (speciesId === "cobble_crow" && q3.status === "active") {
    state.advanceQuest("q3_outskirts_delve", 2, "crow");
  }
}

function enterZone(node: WorldNode, state: GameState) {
  const zone = String(node.meta?.zone ?? "");
  const needLevel = Number(node.meta?.requiredPetLevel ?? 0);
  const needTrait = String(node.meta?.requiredPetTrait ?? "");
  const pet = state.activePet();
  if (!state.save.unlockedZones.includes(zone) && zone === "understreet") {
    const q3 = state.quest("q3_outskirts_delve");
    if (q3.status !== "completed") {
      state.log("The Understreet Gate is sealed until the delve quest is done.");
      return;
    }
  }
  if (needLevel && (!pet || pet.level < needLevel)) {
    state.log(`Requires pet level ${needLevel}.`);
    return;
  }
  if (needTrait && (!pet || !pet.traits.includes(needTrait))) {
    state.log(`Requires a ${needTrait} pet.`);
    return;
  }
  if (zone === "understreet") {
    const q4 = state.quest("q4_amethyst_drake");
    if (q4.status === "available") {
      q4.status = "active";
      q4.step = 1;
      state.mark();
      state.log("Quest started: Amethyst Drake.");
    }
    state.log("You pass the Understreet threshold. An Amethyst Drake waits deeper in the dark.");
    return;
  }
  state.log(`You pass the ${zone} threshold.`);
}

export function eatFood(state: GameState, itemId: string) {
  const def = ITEMS[itemId];
  if (!def?.heal) {
    state.log("That is not food.");
    return;
  }
  if (!state.removeItem(itemId, 1)) return;
  state.heal(def.heal);
  state.log(`You eat ${def.name} (+${def.heal} hp).`);
}

function clickGroundEgg(node: WorldNode, state: GameState, world: World3D) {
  if (state.save.pets.some((p) => p.speciesId === "dwarf_dragon")) {
    state.log("You already have a Dwarf Dragon. The egg fades.");
    world.removeDynamicNode(node.id);
    return;
  }
  const variant = randomDwarfDragonColor();
  const unlocked = state.unlockPet("dwarf_dragon", "Dwarf Dragon", {
    color: variant.hex,
    colorName: variant.name,
    silent: true,
  });
  if (!unlocked) return;
  state.setActivePet(unlocked.id);
  world.setActivePetSpecies("dwarf_dragon", variant.hex);
  world.removeDynamicNode(node.id);

  const q4 = state.quest("q4_amethyst_drake");
  q4.status = "completed";
  q4.step = 3;
  q4.flags.hatched = true;
  state.save.gold += 75;
  state.mark();

  // Exact on-screen quest complete message
  state.log("Quest complete — you receive Dwarf Dragon.");
  state.log(`Colour: ${variant.name} (cosmetic only).`);
}
