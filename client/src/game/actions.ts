import { OAK_WOODCUTTING_LEVEL } from "@shared/index";
import type { WorldNode } from "../content/world";
import { ITEMS } from "../content/items";
import { PET_SPECIES } from "../content/pets";
import { randomDwarfDragonColor } from "../content/dragon-colors";
import type { GameState } from "./state";
import type { World3D } from "./world3d";
import type { GameSession } from "./session";

export function interact(node: WorldNode, state: GameState, world: World3D, session?: GameSession) {
  switch (node.kind) {
    case "npc":
      talkNpc(node, state);
      break;
    case "tree":
      chopTree(node, state, world, session);
      break;
    case "rock":
      mineRock(node, state, world, session);
      break;
    case "fish":
      fish(node, state, world, session);
      break;
    case "forge":
      smelt(state);
      break;
    case "bench":
      craft(state);
      break;
    case "enemy":
      if (session) session.startCombat(node);
      else fightLegacy(node, state, world);
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
      state.log("Mabel: Fetch tree-smoke for an enchanted wick, dear.");
      return;
    }
    if (q.status === "active") {
      if (q.step >= 2 || q.flags.burned) {
        if (!state.invQty("lamp_wick")) state.addItem("lamp_wick", 1);
        state.completeQuest("q1_lamp_familiar");
        state.log("Mabel: Take these ashes — feed your Light Orb to grow it.");
      } else {
        state.log("Mabel: Chop a tree, then cast Spark to burn a log into ash.");
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

function chopTree(node: WorldNode, state: GameState, world: World3D, session?: GameSession) {
  if (state.invQty("bronze_axe") < 1 && state.save.equipment.tool !== "bronze_axe") {
    state.log("You need an axe.");
    return;
  }
  const treeKind = String(node.meta?.tree ?? "tree");
  const logId = String(node.meta?.log ?? (treeKind === "oak" ? "oak_logs" : "tree_logs"));
  const needWc = Number(node.meta?.requiredWoodcutting ?? (treeKind === "oak" ? OAK_WOODCUTTING_LEVEL : 0));
  if (needWc > 0 && state.save.skills.woodcutting.level < needWc) {
    state.log(`You need Woodcutting ${needWc} to chop ${node.label}.`);
    return;
  }
  const finish = () => {
    if (!state.addItem(logId, 1)) return;
    state.grantXp("woodcutting", Number(node.meta?.xp ?? 25));
    const label = ITEMS[logId]?.name ?? logId;
    state.log(`You chop a ${label}.`);
    const q = state.quest("q1_lamp_familiar");
    if (q.status === "active" && logId === "tree_logs") state.advanceQuest("q1_lamp_familiar", 1, "chopped");
  };
  if (session) session.startGather(node, "woodcutting", finish);
  else finish();
  void world;
}

/** Magic burn: tree log → 1 ash, oak log → 2 ash. Prefers tree logs, then oak. */
export function castSpark(state: GameState) {
  let ashYield = 0;
  let burned: string | null = null;
  if (state.invQty("tree_logs") > 0 && state.removeItem("tree_logs", 1)) {
    ashYield = 1;
    burned = "tree_logs";
  } else if (state.invQty("oak_logs") > 0 && state.removeItem("oak_logs", 1)) {
    ashYield = 2;
    burned = "oak_logs";
  } else {
    state.log("Need a tree log or oak log to burn.");
    return;
  }
  if (!state.addItem("ashes", ashYield)) {
    // Refund if inventory full
    state.addItem(burned, 1);
    return;
  }
  state.grantXp("magic", burned === "oak_logs" ? 45 : 30);
  state.log(`You cast Spark — ${ITEMS[burned]?.name} becomes ${ashYield} ash.`);
  const q = state.quest("q1_lamp_familiar");
  if (q.status === "active") {
    state.advanceQuest("q1_lamp_familiar", 2, "burned");
    if (!state.invQty("lamp_wick")) {
      state.addItem("lamp_wick", 1);
      state.log("The smoke leaves an Enchanted Wick.");
    }
  }
}

function mineRock(node: WorldNode, state: GameState, _world: World3D, session?: GameSession) {
  if (state.invQty("bronze_pickaxe") < 1) {
    state.log("You need a pickaxe.");
    return;
  }
  const ore = String(node.meta?.ore ?? "copper_ore");
  const finish = () => {
    if (!state.addItem(ore, 1)) return;
    state.grantXp("mining", Number(node.meta?.xp ?? 22));
    state.log(`You mine ${ITEMS[ore]?.name ?? ore}.`);
    const q = state.quest("q2_catcher_path");
    if (q.status === "active") {
      if (ore === "copper_ore") state.advanceQuest("q2_catcher_path", 1, "copper");
      if (ore === "tin_ore") state.advanceQuest("q2_catcher_path", 1, "tin");
    }
  };
  if (session) session.startGather(node, "mining", finish);
  else finish();
}

function fish(node: WorldNode, state: GameState, _world: World3D, session?: GameSession) {
  if (state.invQty("fishing_rod") < 1) {
    state.log("You need a fishing rod.");
    return;
  }
  const finish = () => {
    if (!state.addItem("raw_fish", 1)) return;
    state.grantXp("fishing", Number(node.meta?.xp ?? 20));
    state.log("You catch a raw minnow.");
  };
  if (session) session.startGather(node, "fishing", finish);
  else finish();
}

function smelt(state: GameState) {
  if (state.invQty("copper_ore") < 1 || state.invQty("tin_ore") < 1) {
    state.log("Need 1 copper ore and 1 tin ore to smelt a bronze bar.");
    return;
  }
  state.removeItem("copper_ore", 1);
  state.removeItem("tin_ore", 1);
  state.addItem("bronze_bar", 1);
  state.grantXp("mining", 18);
  state.log("You smelt a bronze bar at the furnace.");
  const q = state.quest("q2_catcher_path");
  if (q.status === "active") state.advanceQuest("q2_catcher_path", 2, "smelted");
}

function hasBronzeSword(state: GameState): boolean {
  return state.invQty("bronze_sword") > 0 || state.save.equipment.weapon === "bronze_sword";
}

function hasBasicStaff(state: GameState): boolean {
  return state.invQty("basic_staff") > 0 || state.save.equipment.weapon === "basic_staff";
}

function craft(state: GameState) {
  // Bronze bar → sword (first) or lure (quest)
  if (state.invQty("bronze_bar") >= 1) {
    if (!hasBronzeSword(state)) {
      state.removeItem("bronze_bar", 1);
      if (!state.addItem("bronze_sword", 1)) {
        state.addItem("bronze_bar", 1);
        return;
      }
      state.grantXp("crafting", 40);
      state.log("You craft a Bronze Sword. Use it in Inventory to equip.");
      return;
    }
    state.removeItem("bronze_bar", 1);
    state.addItem("crafted_lure", 1);
    state.grantXp("crafting", 35);
    state.log("You craft a lure.");
    const q = state.quest("q2_catcher_path");
    if (q.status === "active") state.advanceQuest("q2_catcher_path", 3, "crafted");
    return;
  }

  // 2 tree logs + iron scrap → Basic Staff
  if (state.invQty("tree_logs") >= 2 && state.invQty("iron_scrap") >= 1) {
    if (hasBasicStaff(state)) {
      state.log("You already have a Basic Staff.");
      return;
    }
    state.removeItem("tree_logs", 2);
    state.removeItem("iron_scrap", 1);
    if (!state.addItem("basic_staff", 1)) {
      state.addItem("tree_logs", 2);
      state.addItem("iron_scrap", 1);
      return;
    }
    state.grantXp("crafting", 45);
    state.log("You craft a Basic Staff (5-tick). Equip it to cast Water.");
    return;
  }

  state.log(
    "Craft: bronze bar → sword/lure · 2 tree logs + iron scrap → Basic Staff."
  );
}

/** Fallback if session missing */
function fightLegacy(node: WorldNode, state: GameState, world: World3D) {
  state.log("Combat requires the tick session.");
  void node;
  void world;
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
  state.log("Quest complete — you receive Dwarf Dragon.");
  state.log(`Colour: ${variant.name} (cosmetic only).`);
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

/** Wire boss death rewards when using tick combat. */
export function handleEnemyDefeated(node: WorldNode, state: GameState, world: World3D) {
  const q3 = state.quest("q3_outskirts_delve");
  if (node.id === "shade" && q3.status === "active") {
    state.advanceQuest("q3_outskirts_delve", 3, "shade");
    const pet = state.activePet();
    const catcherReady = !!pet && pet.traits.includes("catcher") && pet.level >= 3;
    const hasCrow = !!q3.flags.crow || state.save.pets.some((p) => p.speciesId === "cobble_crow");
    if (catcherReady && hasCrow) state.completeQuest("q3_outskirts_delve");
    else state.log("Shade down — finish Catcher lv3 + Cobble Crow if still missing.");
  }
  if (node.meta?.rewardEgg) {
    const q4 = state.quest("q4_amethyst_drake");
    if (q4.status === "available") {
      q4.status = "active";
      q4.step = 1;
    }
    if (q4.status === "active") state.advanceQuest("q4_amethyst_drake", 2, "drake_slain");
    world.spawnGroundEgg(node.x + 1.1, node.z + 0.4, String(node.meta.rewardEgg));
    state.log("The Drake falls — an Amethyst Dragon Egg rests on the ground. Click it.");
  }
}
