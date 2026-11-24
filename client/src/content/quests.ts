export type QuestDef = {
  id: string;
  name: string;
  summary: string;
  steps: string[];
  requiredPetLevel?: number;
  requiredPetTrait?: string;
  rewardPet?: string;
  rewardGold?: number;
  unlockZone?: string;
};

export const QUESTS: Record<string, QuestDef> = {
  q1_lamp_familiar: {
    id: "q1_lamp_familiar",
    name: "A Familiar Light",
    summary: "Help the lampwright and earn your first familiar.",
    steps: [
      "Speak to Mabel the Lampwright in the town square.",
      "Chop a tree for a tree log, then burn it with Magic (Spark) for ash.",
      "Return to Mabel — claim your Light Orb.",
    ],
    rewardPet: "lamp_moth",
    rewardGold: 15,
  },
  q2_catcher_path: {
    id: "q2_catcher_path",
    name: "Nets & Whiskers",
    summary: "Craft a lure and unlock a Catcher pet.",
    steps: [
      "Mine copper and tin near the outskirts road.",
      "Smelt a bronze bar at the town forge.",
      "Craft a lure at the workbench, then claim Street Ferret.",
    ],
    rewardPet: "street_ferret",
    rewardGold: 20,
  },
  q3_outskirts_delve: {
    id: "q3_outskirts_delve",
    name: "Beneath the Cobbles",
    summary: "A Catcher-trained delve into the magical outskirts.",
    steps: [
      "Train your Catcher pet to level 3 (assist in combat or catch tasks).",
      "Catch a Cobble Crow (wild pets return later — crow can also count if already owned).",
      "Defeat the Mist Shade on the outskirts road.",
    ],
    // Pet level gates the Understreet zone + wild catches, not accepting the quest.
    rewardGold: 50,
    unlockZone: "understreet",
  },
  q4_amethyst_drake: {
    id: "q4_amethyst_drake",
    name: "Amethyst Drake",
    summary: "Slay the purple Drake beyond Understreet and claim its egg.",
    steps: [
      "Unlock the Understreet Gate (Beneath the Cobbles).",
      "Defeat the Amethyst Drake.",
      "Click the egg on the ground at the kill spot to receive a Dwarf Dragon.",
    ],
    rewardPet: "dwarf_dragon",
    rewardGold: 75,
  },
};
