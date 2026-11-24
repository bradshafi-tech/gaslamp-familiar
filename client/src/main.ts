import "./styles.css";
import {
  ATTACK_STYLES,
  COMBAT_SPELLS,
  INV_SIZE,
  LIGHT_ORB_ASHES_TO_L2,
  LIGHT_ORB_OAK_TO_L30,
  LIGHT_ORB_SPECIES,
  MAGIC_SPELLS,
  SKILL_DESCRIPTIONS,
  SKILL_IDS,
  SKILL_LABELS,
  WEAR_SLOTS,
  WEAR_SLOT_LABELS,
  type AttackStyle,
  type CombatSpellId,
  type AuthUser,
  type CharacterSave,
  type SkillId,
  type WearSlot,
} from "@shared/index";
import { PET_SPECIES } from "./content/pets";
import { QUESTS } from "./content/quests";
import { ITEMS, equippedWeapon, itemName, itemWearSlot } from "./content/items";
import { GENERAL_SHOP, SHOP_NAME } from "./content/shop";
import { GameState } from "./game/state";
import { World3D } from "./game/world3d";
import { buyFromShop, castSpark, eatFood, handleEnemyDefeated, interact, setOpenShopHandler } from "./game/actions";
import { GameSession } from "./game/session";
import { BattleStage } from "./game/battle-stage";
import { Minimap } from "./game/minimap";
import type { WorldNode } from "./content/world";
import * as api from "./net/api";

const app = document.getElementById("app")!;

app.innerHTML = `
  <div id="auth">
    <form class="auth-card" id="auth-form">
      <h1>Gaslamp &amp; Familiar</h1>
      <p class="tag">Victorian-fantasy adventure — click to walk, train pets, keep your save in the cloud.</p>
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" required />
      <label for="email">Email <span class="muted">(sign-up only)</span></label>
      <input id="email" name="email" type="email" autocomplete="email" />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <div class="auth-actions">
        <button type="submit" class="primary" id="btn-login">Log in</button>
        <button type="button" id="btn-signup">Sign up</button>
      </div>
      <div class="auth-error" id="auth-error"></div>
      <p class="auth-hint">Test account: <strong>russell</strong> / <strong>test1234</strong></p>
    </form>
  </div>
  <div id="game">
    <div id="viewport"></div>
    <div id="battle-screen" class="battle-screen" hidden>
      <div class="battle-backdrop"></div>
      <div class="battle-stage" id="battle-stage-host">
        <div class="battle-hud-overlay">
          <div class="battle-hud-card ally-card">
            <div class="battle-name" id="battle-player-name">You</div>
            <div class="hp-track"><div class="hp-fill ally" id="battle-player-hp"></div></div>
            <div class="hp-text" id="battle-player-hp-text">10/10</div>
            <div class="battle-pet-label" id="battle-pet-name">Light Orb</div>
          </div>
          <div class="battle-hud-card foe-card">
            <div class="battle-name" id="battle-enemy-name">Enemy</div>
            <div class="hp-track"><div class="hp-fill foe" id="battle-enemy-hp"></div></div>
            <div class="hp-text" id="battle-enemy-hp-text">—</div>
          </div>
        </div>
      </div>
      <div class="battle-footer">
        <div class="battle-feed" id="battle-feed" aria-live="polite"></div>
        <div class="battle-actions">
          <button type="button" id="battle-flee">Flee</button>
        </div>
      </div>
      <div id="battle-splat-layer" class="battle-splat-layer"></div>
    </div>
    <div class="hover-label" id="hover-label"></div>
    <div id="splat-layer"></div>
    <div id="ctx-menu" class="ctx-menu" hidden></div>
    <div id="skill-flash" class="skill-flash" hidden>▲</div>
    <div id="modal-root"></div>
    <div class="hud">
      <div class="topbar">
        <div class="brand">Gaslamp &amp; Familiar</div>
        <div class="statline">
          <span>HP <strong id="hp">10/10</strong></span>
          <span>Gold <strong id="gold">0</strong></span>
          <span id="style-label"></span>
          <span id="combat-status" class="combat-status" hidden></span>
          <span id="user-label"></span>
        </div>
        <div class="topbar-actions">
          <button type="button" id="btn-save">Save</button>
          <button type="button" id="btn-logout">Log out</button>
        </div>
      </div>
      <div class="skills-rail" id="skills-panel"></div>
      <div class="right-dock">
        <div class="tab-bar" id="tab-bar" role="tablist">
          <button type="button" class="tab-btn active" data-tab="inv" role="tab" title="Inventory">🎒</button>
          <button type="button" class="tab-btn" data-tab="worn" role="tab" title="Worn">👕</button>
          <button type="button" class="tab-btn" data-tab="quests" role="tab">Quests</button>
          <button type="button" class="tab-btn" data-tab="pets" role="tab">Pets</button>
          <button type="button" class="tab-btn" data-tab="magic" role="tab">Magic</button>
          <button type="button" class="tab-btn" data-tab="research" role="tab">Research</button>
          <button type="button" class="tab-btn" data-tab="styles" role="tab">Combat</button>
          <button type="button" class="tab-btn" data-tab="settings" role="tab">Settings</button>
        </div>
        <div class="tab-panel" id="tab-panel" role="tabpanel"></div>
      </div>
      <div id="minimap-host" class="minimap-host"></div>
      <div class="bottom-strip">
        <div class="info-feed" id="info-feed" aria-live="polite"></div>
        <form class="chat-form" id="chat-form">
          <input id="chat-input" maxlength="240" placeholder="Chat or read game messages below…" autocomplete="off" />
          <button type="submit" class="primary">Send</button>
        </form>
      </div>
    </div>
  </div>
`;

type SideTab = "inv" | "worn" | "quests" | "pets" | "magic" | "research" | "styles" | "settings";

const authEl = document.getElementById("auth")!;
const gameEl = document.getElementById("game")!;
const authError = document.getElementById("auth-error")!;
const infoFeed = document.getElementById("info-feed")!;
const ctxMenu = document.getElementById("ctx-menu")!;
const splatLayer = document.getElementById("splat-layer")!;
const modalRoot = document.getElementById("modal-root")!;
const skillFlash = document.getElementById("skill-flash")!;
const tabPanel = document.getElementById("tab-panel")!;

let state: GameState | null = null;
let world: World3D | null = null;
let session: GameSession | null = null;
let user: AuthUser | null = null;
let battleStage: BattleStage | null = null;
let minimap: Minimap | null = null;
let saveTimer = 0;
let lastUi = 0;
let chatAfter = 0;
let chatTimer = 0;
const seenChat = new Set<string>();
let skillInfoOpen: SkillId | null = null;
let flashSkill: SkillId | null = null;
let flashUntil = 0;
let activeTab: SideTab = "inv";
let battleOpen = false;
let battleEnemyMaxHp = 1;

function pushLog(msg: string) {
  const line = document.createElement("div");
  line.className = msg.startsWith("[Combat]") ? "info-line system combat" : "info-line system";
  line.textContent = msg;
  infoFeed.appendChild(line);
  while (infoFeed.childElementCount > 80) infoFeed.firstChild?.remove();
  infoFeed.scrollTop = infoFeed.scrollHeight;
  if (battleOpen && msg.startsWith("[Combat]")) pushBattleFeed(msg);
}

function appendChat(msg: api.ChatMessage) {
  if (seenChat.has(msg.id)) return;
  seenChat.add(msg.id);
  const row = document.createElement("div");
  row.className = "info-line chat";
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  row.innerHTML = `<span class="chat-meta">${time} <strong>${escapeHtml(msg.username)}</strong></span> ${escapeHtml(msg.body)}`;
  infoFeed.appendChild(row);
  while (infoFeed.childElementCount > 80) infoFeed.firstChild?.remove();
  infoFeed.scrollTop = infoFeed.scrollHeight;
  chatAfter = Math.max(chatAfter, msg.created_at);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function pollChat() {
  if (!user) return;
  try {
    const { messages } = await api.fetchChat(chatAfter);
    for (const m of messages) appendChat(m);
  } catch {
    /* ignore */
  }
}

function hideCtx() {
  ctxMenu.hidden = true;
  ctxMenu.innerHTML = "";
}

function showCtx(x: number, y: number, items: { label: string; action: () => void; disabled?: boolean }[]) {
  ctxMenu.innerHTML = "";
  for (const it of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = it.label;
    btn.disabled = !!it.disabled;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      hideCtx();
      it.action();
      renderHud();
    });
    ctxMenu.appendChild(btn);
  }
  ctxMenu.hidden = false;
  const pad = 8;
  const w = 180;
  const h = items.length * 32 + 8;
  ctxMenu.style.left = `${Math.min(x, window.innerWidth - w - pad)}px`;
  ctxMenu.style.top = `${Math.min(y, window.innerHeight - h - pad)}px`;
}

document.addEventListener("pointerdown", (e) => {
  if (!ctxMenu.hidden && !ctxMenu.contains(e.target as Node)) hideCtx();
});

function spawnSplat(
  worldPos: { x: number; y: number; z: number },
  text: string,
  kind: "hit" | "miss" | "heal" | "hurt"
) {
  if (battleOpen) {
    spawnBattleSplat(text, kind);
    return;
  }
  if (!world) return;
  const scr = world.projectToScreen(worldPos.x, worldPos.y, worldPos.z);
  if (!scr) return;
  const el = document.createElement("div");
  el.className = `splat splat-${kind}`;
  el.textContent = text;
  el.style.left = `${scr.x + (Math.random() * 16 - 8)}px`;
  el.style.top = `${scr.y + (Math.random() * 10 - 5)}px`;
  splatLayer.appendChild(el);
  requestAnimationFrame(() => el.classList.add("go"));
  setTimeout(() => el.remove(), 1100);
}

function spawnBattleSplat(text: string, kind: "hit" | "miss" | "heal" | "hurt") {
  const layer = document.getElementById("battle-splat-layer");
  if (!layer) return;
  const el = document.createElement("div");
  el.className = `splat splat-${kind} battle-splat`;
  el.textContent = text;
  const foeSide = kind === "hurt" || kind === "heal";
  el.style.left = foeSide ? `${18 + Math.random() * 12}%` : `${62 + Math.random() * 14}%`;
  el.style.top = `${28 + Math.random() * 18}%`;
  layer.appendChild(el);
  requestAnimationFrame(() => el.classList.add("go"));
  setTimeout(() => el.remove(), 1100);
}

function pushBattleFeed(msg: string) {
  const feed = document.getElementById("battle-feed");
  if (!feed) return;
  const line = document.createElement("div");
  line.textContent = msg.replace(/^\[Combat\]\s*/, "");
  feed.appendChild(line);
  while (feed.childElementCount > 6) feed.firstChild?.remove();
  feed.scrollTop = feed.scrollHeight;
}

function openBattle(node: WorldNode) {
  const screen = document.getElementById("battle-screen");
  if (!screen || !state || !world) return;
  battleOpen = true;
  battleEnemyMaxHp = Math.max(1, world.enemyHp.get(node.id) ?? Number(node.meta?.hp ?? 5));
  screen.hidden = false;
  document.getElementById("battle-enemy-name")!.textContent = node.label;
  const pet = state.followingPet() ?? state.activePet();
  document.getElementById("battle-pet-name")!.textContent = pet?.name ?? "No pet";
  document.getElementById("battle-feed")!.innerHTML = "";
  if (!battleStage) {
    const host = document.getElementById("battle-stage-host");
    if (host) battleStage = new BattleStage(host);
  }
  battleStage?.show({
    enemy: node,
    petSpeciesId: pet?.speciesId ?? null,
    petColor: pet?.color,
    equipment: state.save.equipment,
  });
  world.setPlayerEquipment(state.save.equipment);
  refreshBattleHud();
  pushBattleFeed(`A wild ${node.label} appears!`);
}

function closeBattle() {
  const screen = document.getElementById("battle-screen");
  if (screen) screen.hidden = true;
  battleOpen = false;
  battleStage?.hide();
  document.getElementById("battle-splat-layer")!.innerHTML = "";
}

function openShopUi() {
  if (!state) return;
  const gold = state.save.gold;
  const rows = GENERAL_SHOP.map((offer) => {
    const def = ITEMS[offer.itemId];
    const can = gold >= offer.price;
    return `<button type="button" class="shop-row ${can ? "" : "disabled"}" data-buy="${offer.itemId}" ${can ? "" : "disabled"}>
      <span class="shop-icon" style="background:${def?.iconColor ?? "#666"}">${def?.icon ?? "·"}</span>
      <span class="shop-info">
        <strong>${escapeHtml(def?.name ?? offer.itemId)}</strong>
        <span class="muted">${escapeHtml(offer.blurb ?? "")}</span>
      </span>
      <span class="shop-price">${offer.price}c</span>
    </button>`;
  }).join("");
  openModal(
    SHOP_NAME,
    `<p class="muted" style="margin:0 0 10px">Your coins: <strong id="shop-gold">${gold}</strong></p>
     <div class="shop-list">${rows}</div>`
  );
  modalRoot.querySelectorAll("[data-buy]").forEach((el) => {
    el.addEventListener("click", () => {
      if (!state) return;
      const id = (el as HTMLElement).dataset.buy!;
      if (buyFromShop(state, id)) {
        openShopUi();
        renderHud();
      }
    });
  });
}

function refreshBattleHud() {
  if (!battleOpen || !state || !session || !world) return;
  const id = session.combatTarget;
  const node = id ? world.allNodes().find((n) => n.id === id) : null;
  const playerHp = state.save.hp;
  const playerMax = state.save.maxHp;
  const pFill = document.getElementById("battle-player-hp") as HTMLElement;
  const pText = document.getElementById("battle-player-hp-text")!;
  pFill.style.width = `${Math.max(0, (100 * playerHp) / playerMax)}%`;
  pText.textContent = `${playerHp}/${playerMax}`;

  if (node) {
    const eHp = world.enemyHp.get(node.id) ?? Number(node.meta?.hp ?? 5);
    const eMax = Math.max(battleEnemyMaxHp, eHp, Number(node.meta?.hp ?? 5));
    battleEnemyMaxHp = eMax;
    const eFill = document.getElementById("battle-enemy-hp") as HTMLElement;
    const eText = document.getElementById("battle-enemy-hp-text")!;
    eFill.style.width = `${Math.max(0, (100 * Math.max(0, eHp)) / eMax)}%`;
    eText.textContent = `${Math.max(0, eHp)}/${eMax}`;
    document.getElementById("battle-enemy-name")!.textContent = node.label;
  }
}

function openModal(title: string, bodyHtml: string) {
  modalRoot.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><div class="modal-card"><div class="modal-head"><h2>${title}</h2><button type="button" id="modal-close">✕</button></div><div class="modal-body">${bodyHtml}</div></div></div>`;
  document.getElementById("modal-close")!.addEventListener("click", closeModal);
  document.getElementById("modal-backdrop")!.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

function closeModal() {
  modalRoot.innerHTML = "";
  skillInfoOpen = null;
}

function openSkillInfo(id: SkillId) {
  if (!state) return;
  skillInfoOpen = id;
  const sk = state.save.skills[id];
  const body = `<p>${SKILL_DESCRIPTIONS[id]}</p>
    <p><strong>Level ${sk.level}</strong> · ${sk.xp} xp</p>
    <p class="muted">Click a flashing skill after a level-up for details.</p>`;
  openModal(SKILL_LABELS[id], body);
}

function setActiveTab(tab: SideTab) {
  activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach((el) => {
    el.classList.toggle("active", (el as HTMLElement).dataset.tab === tab);
  });
  renderHud();
}

function researchHtml(): string {
  if (!state) return "";
  const entries = [...state.save.research].sort((a, b) => a.name.localeCompare(b.name));
  if (!entries.length) {
    return `<h2>Research</h2><p class="muted">Empty — right-click world objects, pets, or items and choose Research.</p>`;
  }
  const cats = Array.from(new Set(entries.map((e) => e.category)));
  const body = cats
    .map((cat) => {
      const rows = entries
        .filter((e) => e.category === cat)
        .map(
          (e) =>
            `<div class="research-row"><strong>${escapeHtml(e.name)}</strong><div class="muted">${escapeHtml(e.note)}</div></div>`
        )
        .join("");
      return `<h3 class="research-cat">${escapeHtml(cat)}</h3>${rows}`;
    })
    .join("");
  return `<h2>Research (${entries.length})</h2>${body}`;
}

function renderInvSlotMenu(index: number, clientX: number, clientY: number) {
  if (!state || !session) return;
  const slot = state.inventoryList()[index];
  if (!slot) return;
  const def = ITEMS[slot.itemId];
  const wear = def?.wearSlot ?? itemWearSlot(slot.itemId);
  let useLabel = `Use ${itemName(slot.itemId)}`;
  if (slot.itemId === "ashes") useLabel = "Feed Light Orb (ashes)";
  else if (slot.itemId === "oak_logs") useLabel = "Feed / burn Oak Log";
  else if (slot.itemId === "tree_logs") useLabel = "Burn Tree Log → ash";
  else if (wear) {
    useLabel =
      state.save.equipment[wear] === slot.itemId
        ? `Remove ${itemName(slot.itemId)}`
        : `Wear ${itemName(slot.itemId)}`;
  }
  const items: { label: string; action: () => void }[] = [
    {
      label: useLabel,
      action: () => {
        session!.useItem(slot.itemId);
        renderHud();
      },
    },
    { label: "Examine", action: () => session!.examineItem(slot.itemId) },
    { label: "Research", action: () => session!.researchItem(slot.itemId) },
    { label: "Drop", action: () => session!.dropItemSlot(index) },
  ];
  showCtx(clientX, clientY, items);
}

function renderSkills() {
  if (!state) return;
  const s = state.save;
  const skills = document.getElementById("skills-panel")!;
  skills.innerHTML =
    `<div class="skills-rail-label">Skills</div>` +
    SKILL_IDS.map((id) => {
      const sk = s.skills[id];
      const flash = flashSkill === id && performance.now() < flashUntil ? " flash" : "";
      return `<button type="button" class="skill-btn${flash}${skillInfoOpen === id ? " selected" : ""}" data-skill="${id}">
        <span>${SKILL_LABELS[id]}</span>
        <strong>${sk.level}${flash ? " ▲" : ""}</strong>
      </button>`;
    }).join("");
  skills.querySelectorAll("[data-skill]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = (el as HTMLElement).dataset.skill as SkillId;
      if (flashSkill === id) {
        flashSkill = null;
        skillFlash.hidden = true;
      }
      openSkillInfo(id);
      renderHud();
    });
  });
}

function renderTabContent() {
  if (!state) return;
  const s = state.save;

  if (activeTab === "inv") {
    const slots = state.inventoryList();
    const cells = Array.from({ length: INV_SIZE }, (_, i) => {
      const slot = slots[i];
      if (!slot) return `<button type="button" class="inv-slot empty" data-slot="${i}"></button>`;
      const def = ITEMS[slot.itemId];
      const short = itemName(slot.itemId);
      const worn =
        def?.wearSlot && s.equipment[def.wearSlot] === slot.itemId ? " worn" : "";
      return `<button type="button" class="inv-slot${worn}" data-slot="${i}" title="${escapeHtml(short)}">
        <span class="inv-icon" style="background:${def?.iconColor ?? "#555"}">${def?.icon ?? "·"}</span>
        <span class="inv-name">${escapeHtml(short)}</span>
        <span class="inv-qty">${slot.qty > 1 ? slot.qty : ""}</span>
      </button>`;
    }).join("");
    tabPanel.innerHTML = `<h2>Inventory <span class="muted" style="font-weight:400">${slots.filter(Boolean).length}/${INV_SIZE}</span></h2>
      <div class="inv-grid">${cells}</div>
      <nav class="inv-subtabs" aria-label="Bag panels">
        <button type="button" class="inv-subtab active" data-goto="inv" title="Inventory">🎒</button>
        <button type="button" class="inv-subtab" data-goto="worn" title="Worn">👕</button>
      </nav>`;
    tabPanel.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", () => setActiveTab((el as HTMLElement).dataset.goto as SideTab));
    });
    tabPanel.querySelectorAll("[data-slot]").forEach((el) => {
      const index = Number((el as HTMLElement).dataset.slot);
      el.addEventListener("click", () => {
        const slot = state!.inventoryList()[index];
        if (!slot || !session) return;
        session.useItem(slot.itemId);
        renderHud();
      });
      el.addEventListener("contextmenu", (ev) => {
        const e = ev as MouseEvent;
        e.preventDefault();
        renderInvSlotMenu(index, e.clientX, e.clientY);
      });
    });
    return;
  }

  if (activeTab === "worn") {
    const eq = s.equipment;
    const slots = WEAR_SLOTS.map((slot) => {
      const id = eq[slot];
      const def = id ? ITEMS[id] : null;
      return `<button type="button" class="worn-slot ${id ? "" : "empty"}" data-wear="${slot}">
        <span class="worn-label">${WEAR_SLOT_LABELS[slot]}</span>
        ${
          def
            ? `<span class="inv-icon" style="background:${def.iconColor}">${def.icon}</span><span class="inv-name">${escapeHtml(def.name)}</span>`
            : `<span class="muted">Empty</span>`
        }
      </button>`;
    }).join("");
    tabPanel.innerHTML = `<h2>Worn</h2>
      <p class="muted" style="margin:0 0 8px;font-size:0.78rem">Weapon slot holds sword, staff, axe, or pickaxe.</p>
      <div class="worn-grid">${slots}</div>
      <nav class="inv-subtabs" aria-label="Bag panels">
        <button type="button" class="inv-subtab" data-goto="inv" title="Inventory">🎒</button>
        <button type="button" class="inv-subtab active" data-goto="worn" title="Worn">👕</button>
      </nav>`;
    tabPanel.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", () => setActiveTab((el as HTMLElement).dataset.goto as SideTab));
    });
    tabPanel.querySelectorAll("[data-wear]").forEach((el) => {
      el.addEventListener("click", () => {
        const slot = (el as HTMLElement).dataset.wear as WearSlot;
        if (state!.save.equipment[slot]) {
          session?.unequipSlot(slot);
          renderHud();
        }
      });
    });
    return;
  }

  if (activeTab === "quests") {
    tabPanel.innerHTML =
      `<h2>Quests</h2>` +
      s.quests
        .map((q) => {
          const def = QUESTS[q.questId];
          if (!def) return "";
          const step =
            q.status === "completed"
              ? "Completed"
              : q.status === "active"
                ? def.steps[Math.min(q.step, def.steps.length - 1)]
                : "Speak to a townsfolk to start";
          return `<div class="quest-item"><strong>${def.name}</strong><div class="status">${q.status} — ${step}</div></div>`;
        })
        .join("");
    return;
  }

  if (activeTab === "pets") {
    if (!s.pets.length) {
      tabPanel.innerHTML = `<h2>Pets</h2><p class="muted">None yet — finish the lampwright quest for a Light Orb.</p>`;
      return;
    }
    tabPanel.innerHTML =
      `<h2>Pets</h2>` +
      s.pets
        .map((p) => {
          const sp = PET_SPECIES[p.speciesId];
          const colorNote = p.colorName ? ` · ${p.colorName}` : "";
          let progress = "";
          if (p.speciesId === LIGHT_ORB_SPECIES) {
            if (p.level < 2) {
              const ash = p.ashesFed ?? 0;
              progress = `<div class="muted">Ashes ${ash}/${LIGHT_ORB_ASHES_TO_L2} → evolve lv2</div>`;
            } else if (p.level < 30) {
              const oak = p.oakFed ?? 0;
              progress = `<div class="muted">Oak ${oak}/${LIGHT_ORB_OAK_TO_L30} → lv ${p.level}/30</div>`;
            } else {
              progress = `<div class="muted">Fully grown (ash → oak loop)</div>`;
            }
          }
          const out = p.following ? " · following" : " · in bag";
          return `<div class="pet-item ${p.following ? "active" : ""}" data-pet="${p.id}" data-species="${p.speciesId}">
            <strong>${p.name}</strong> · lv ${p.level}${colorNote}${out}
            <div class="muted">${(sp?.traits ?? p.traits).join(", ")}</div>
            ${progress}
            <div class="pet-actions">
              <button type="button" class="linkish" data-follow="${p.id}">Follow</button>
              <button type="button" class="linkish" data-bag="${p.id}">Put in bag</button>
            </div>
          </div>`;
        })
        .join("") +
      `<p class="muted" style="margin-top:6px;font-size:0.75rem">Follow puts the pet out · Put in bag recalls it</p>`;
    tabPanel.querySelectorAll("[data-follow]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        state!.setPetFollowing((el as HTMLElement).dataset.follow!);
        syncPetVisual();
        renderHud();
      });
    });
    tabPanel.querySelectorAll("[data-bag]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        state!.putPetInBag((el as HTMLElement).dataset.bag!);
        syncPetVisual();
        renderHud();
      });
    });
    tabPanel.querySelectorAll("[data-pet]").forEach((el) => {
      el.addEventListener("contextmenu", (ev) => {
        const e = ev as MouseEvent;
        e.preventDefault();
        const species = (el as HTMLElement).dataset.species!;
        const petId = (el as HTMLElement).dataset.pet!;
        showCtx(e.clientX, e.clientY, [
          {
            label: "Follow",
            action: () => {
              state!.setPetFollowing(petId);
              syncPetVisual();
              renderHud();
            },
          },
          {
            label: "Put in bag",
            action: () => {
              state!.putPetInBag(petId);
              syncPetVisual();
              renderHud();
            },
          },
          { label: "Research", action: () => session?.researchPetSpecies(species) },
        ]);
      });
    });
    return;
  }

  if (activeTab === "magic") {
    const magicLvl = s.skills.magic.level;
    const essence = state.invQty("water_essence");
    const staffOn = !!equippedWeapon(s.equipment.weapon).allowsMagic;
    tabPanel.innerHTML =
      `<h2>Magic</h2>
      <p class="muted" style="margin:0 0 10px;font-size:0.82rem">Level ${magicLvl} · essence ${essence}${staffOn ? " · staff worn" : ""}</p>
      <div class="style-list">` +
      MAGIC_SPELLS.map((sp) => {
        const locked = magicLvl < sp.level;
        const active = sp.id === "water" && s.selectedSpell === "water";
        return `<button type="button" class="style-pick spell-pick ${active ? "active" : ""}" data-magic="${sp.id}" ${locked ? "disabled" : ""}>
          <strong>${sp.label}</strong> <span class="muted">Lv ${sp.level} · ${sp.kind}</span>
          <span class="muted">${sp.desc}</span>
        </button>`;
      }).join("") +
      `</div>`;
    tabPanel.querySelectorAll("[data-magic]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.magic;
        if (id === "spark") {
          castSpark(state!);
          renderHud();
          return;
        }
        if (id === "water") {
          const w = equippedWeapon(state!.save.equipment.weapon);
          if (!w.allowsMagic) {
            pushLog("Wear a Basic Staff before selecting Water.");
            return;
          }
          if (state!.save.selectedSpell === "water") {
            state!.setSelectedSpell(null);
            pushLog("Water deselected — back to melee styles.");
          } else {
            state!.setSelectedSpell("water");
            pushLog("Combat spell: Water");
          }
          renderHud();
        }
      });
    });
    return;
  }

  if (activeTab === "research") {
    tabPanel.innerHTML = researchHtml();
    return;
  }

  if (activeTab === "styles") {
    const wpnId = s.equipment.weapon;
    const wpn = wpnId && ITEMS[wpnId] ? ITEMS[wpnId] : ITEMS.fist;
    const ticks = wpn.attackTicks ?? 5;
    const spellActive = s.selectedSpell;
    const essence = state.invQty("water_essence");
    const canStaff = !!wpn.allowsMagic;
    tabPanel.innerHTML =
      `<h2>Combat</h2>
      <p class="muted" style="margin:0 0 10px;font-size:0.82rem">Weapon: <strong>${escapeHtml(wpn.name)}</strong> · ${ticks} ticks${
        wpnId ? ` · <button type="button" class="linkish" id="btn-unequip">Unequip</button>` : " (unarmed)"
      }</p>
      <h3 class="combat-subhead">Melee styles</h3>
      <div class="style-list">` +
      ATTACK_STYLES.map(
        (st) =>
          `<button type="button" class="style-pick ${!spellActive && s.attackStyle === st.id ? "active" : ""}" data-style="${st.id}">
            <strong>${st.label}</strong>
            <span class="muted">${st.desc}</span>
          </button>`
      ).join("") +
      `</div>
      <h3 class="combat-subhead">Magic spells</h3>
      <div class="style-list">` +
      COMBAT_SPELLS.map((sp) => {
        const locked = s.skills.magic.level < sp.level;
        const active = spellActive === sp.id;
        return `<button type="button" class="style-pick spell-pick ${active ? "active" : ""}" data-spell="${sp.id}" ${locked ? "disabled" : ""}>
            <strong>${sp.label}</strong>
            <span class="muted">${sp.desc}${canStaff ? "" : " · equip staff"}${essence ? ` · ${essence} essence` : " · no essence"}</span>
          </button>`;
      }).join("") +
      `</div>
      <p class="muted" style="margin-top:12px;font-size:0.78rem">Fist 5t · Sword 4t · Staff 5t + Water · Alley Rat 7t (weak, drop essence). Attack opens a battle screen.</p>`;
    tabPanel.querySelector("#btn-unequip")?.addEventListener("click", () => {
      session?.unequipWeapon();
      renderHud();
    });
    tabPanel.querySelectorAll("[data-style]").forEach((el) => {
      el.addEventListener("click", () => {
        state!.setAttackStyle((el as HTMLElement).dataset.style as AttackStyle);
        pushLog(`Combat: melee · ${ATTACK_STYLES.find((x) => x.id === (el as HTMLElement).dataset.style)?.label}`);
        renderHud();
      });
    });
    tabPanel.querySelectorAll("[data-spell]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.spell as CombatSpellId;
        const w = equippedWeapon(state!.save.equipment.weapon);
        if (!w.allowsMagic) {
          pushLog("Equip a Basic Staff before selecting Water.");
          return;
        }
        state!.setSelectedSpell(id);
        pushLog(`Combat: spell · ${COMBAT_SPELLS.find((x) => x.id === id)?.label}`);
        renderHud();
      });
    });
    return;
  }

  // settings
  tabPanel.innerHTML = `
    <h2>Settings</h2>
    <div class="toolbar">
      <button type="button" id="btn-eat">Eat Bread</button>
      <button type="button" id="btn-nearest">Interact nearest</button>
    </div>
    <p class="muted" style="margin-top:10px;font-size:0.8rem">Spark is on the Magic tab. Wear tools in Worn. Shop is south of spawn (Pip).</p>
    <div class="toolbar" style="margin-top:12px">
      <button type="button" id="btn-save-panel">Save now</button>
      <button type="button" id="btn-logout-panel">Log out</button>
    </div>`;
  tabPanel.querySelector("#btn-eat")?.addEventListener("click", () => {
    if (!state) return;
    eatFood(state, "bread");
    renderHud();
  });
  tabPanel.querySelector("#btn-nearest")?.addEventListener("click", () => interactNearest());
  tabPanel.querySelector("#btn-save-panel")?.addEventListener("click", () => void persist(true));
  tabPanel.querySelector("#btn-logout-panel")?.addEventListener("click", async () => {
    await persist(true);
    await api.logout();
    location.reload();
  });
}

function renderHud() {
  if (!state) return;
  const s = state.save;
  document.getElementById("hp")!.textContent = `${s.hp}/${s.maxHp}`;
  document.getElementById("gold")!.textContent = String(s.gold);
  if (s.selectedSpell === "water") {
    document.getElementById("style-label")!.textContent = "Spell Water";
  } else {
    const style = ATTACK_STYLES.find((x) => x.id === s.attackStyle);
    document.getElementById("style-label")!.textContent = style ? `Style ${style.label}` : "";
  }
  const combatEl = document.getElementById("combat-status")!;
  const combat = session?.combatStatus() ?? null;
  if (combat) {
    combatEl.hidden = false;
    combatEl.textContent = combat;
  } else {
    combatEl.hidden = true;
    combatEl.textContent = "";
  }
  refreshBattleHud();
  renderSkills();
  renderTabContent();
}

function syncPetVisual() {
  if (!state || !world) return;
  const pet = state.followingPet();
  if (!pet) {
    world.setActivePetSpecies(null);
    return;
  }
  if (pet.speciesId === "dwarf_dragon") {
    world.setActivePetSpecies("dwarf_dragon", pet.color);
    return;
  }
  world.setActivePetSpecies(pet.speciesId, pet.color ?? PET_SPECIES[pet.speciesId]?.color);
  world.setPlayerEquipment(state.save.equipment);
}

async function persist(force = false) {
  if (!state) return;
  if (!force && !state.dirty) return;
  state.save.position = world?.getPlayerPos() ?? state.save.position;
  try {
    await api.saveCharacter(state.save);
    state.dirty = false;
    if (force) pushLog("Progress saved.");
  } catch (e) {
    pushLog(`Save failed: ${(e as Error).message}`);
  }
}

function doInteract(node: WorldNode) {
  if (!state || !world || !session) return;
  interact(node, state, world, session);
  syncPetVisual();
  renderHud();
}

async function enterWorld(u: AuthUser, save: CharacterSave) {
  user = u;
  authEl.style.display = "none";
  gameEl.classList.add("active");
  document.getElementById("user-label")!.textContent = u.username;

  state = new GameState(save, pushLog);
  state.onLevelUp = (skill, level) => {
    flashSkill = skill;
    flashUntil = performance.now() + 8000;
    skillFlash.hidden = false;
    skillFlash.textContent = `▲ ${SKILL_LABELS[skill]} ${level}`;
    const panel = document.getElementById("skills-panel");
    const row = panel?.querySelector(`[data-skill="${skill}"]`) as HTMLElement | null;
    if (row) {
      const r = row.getBoundingClientRect();
      skillFlash.style.left = `${r.right + 6}px`;
      skillFlash.style.top = `${r.top}px`;
    }
    skillFlash.onclick = () => {
      openSkillInfo(skill);
      flashSkill = null;
      skillFlash.hidden = true;
    };
    renderHud();
  };

  const viewport = document.getElementById("viewport")!;
  viewport.innerHTML = "";
  world = new World3D(viewport);
  world.setPlayerPosition(save.position.x, save.position.z);
  world.setPlayerEquipment(save.equipment);
  syncPetVisual();

  const mapHost = document.getElementById("minimap-host");
  if (mapHost) {
    mapHost.innerHTML = "";
    minimap = new Minimap(mapHost);
    const pos = world.getPlayerPos();
    minimap.draw({ x: pos.x, z: pos.z, rotY: world.getPlayerFacing() }, world.allNodes());
  }

  setOpenShopHandler(() => openShopUi());

  session = new GameSession(state, world);
  session.onSplat = spawnSplat;
  session.onUi = () => renderHud();
  session.onBattleOpen = (node) => openBattle(node);
  session.onBattleClose = () => closeBattle();
  document.getElementById("battle-flee")?.addEventListener("click", () => {
    session?.stopCombat();
    renderHud();
  });
  session.onEnemyDefeated = (node) => {
    if (!state || !world) return;
    handleEnemyDefeated(node, state, world);
    syncPetVisual();
    renderHud();
  };

  world.onInteract = (node) => doInteract(node);
  world.onHover = (label) => {
    const el = document.getElementById("hover-label")!;
    if (!label) {
      el.classList.remove("show");
      return;
    }
    el.textContent = label;
    el.classList.add("show");
  };
  world.onContext = ({ clientX, clientY, ground, node, hitPet }) => {
    if (!state || !world || !session) return;
    const items: { label: string; action: () => void }[] = [];
    if (node?.kind === "enemy") {
      items.push({
        label: `Attack ${node.label}`,
        action: () => {
          world!.walkTo(node.x, node.z, node.id);
        },
      });
      if (session.combatTarget === node.id) {
        items.push({
          label: "Stop combat",
          action: () => session!.stopCombat(),
        });
      }
    }
    items.push({
      label: "Walk here",
      action: () => {
        if (session!.combatTarget) session!.stopCombat();
        world!.walkTo(ground.x, ground.z);
      },
    });
    if (hitPet) {
      const pet = state.activePet();
      if (pet) {
        items.push({
          label: `Research ${pet.name}`,
          action: () => session!.researchPetSpecies(pet.speciesId),
        });
      }
    }
    if (node) {
      if (node.kind !== "enemy") {
        items.push({
          label: `Use ${node.label}`,
          action: () => {
            world!.walkTo(node.x, node.z, node.id);
          },
        });
      }
      items.push({
        label: `Research ${node.label}`,
        action: () => session!.researchNode(node),
      });
    }
    showCtx(clientX, clientY, items);
  };

  pushLog(
    "Start map ready — trees, ores, fish, furnace, crafting, foes. Right-click enemies for Attack."
  );
  renderHud();
  void pollChat();
  if (chatTimer) window.clearInterval(chatTimer);
  chatTimer = window.setInterval(() => void pollChat(), 2500);

  (window as unknown as { __va?: unknown }).__va = {
    state: () => state,
    world: () => world,
    session: () => session,
    interactNearest: () => interactNearest(),
    interactNode: (id: string) => {
      const node = world?.allNodes().find((n) => n.id === id);
      if (node) doInteract(node);
    },
    setPos: (x: number, z: number) => {
      world?.setPlayerPosition(x, z);
      if (state) {
        state.save.position = { x, y: 0, z };
        state.mark();
      }
    },
  };

  let prev = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    session?.update(dt);
    world?.update(dt);
    if (minimap && world) {
      const pos = world.getPlayerPos();
      minimap.draw({ x: pos.x, z: pos.z, rotY: world.getPlayerFacing() }, world.allNodes());
    }
    if (flashSkill && now > flashUntil) {
      flashSkill = null;
      skillFlash.hidden = true;
    }
    if (now - lastUi > 400) {
      lastUi = now;
      renderHud();
    }
    if (now - saveTimer > 20000) {
      saveTimer = now;
      void persist(false);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  window.addEventListener("beforeunload", () => {
    void persist(true);
  });
}

document.getElementById("auth-form")!.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  const username = (document.getElementById("username") as HTMLInputElement).value.trim();
  const password = (document.getElementById("password") as HTMLInputElement).value;
  try {
    const u = await api.login(username, password);
    const { save } = await api.loadCharacter();
    await enterWorld(u, save);
  } catch (err) {
    authError.textContent = (err as Error).message;
  }
});

document.getElementById("btn-signup")!.addEventListener("click", async () => {
  authError.textContent = "";
  const username = (document.getElementById("username") as HTMLInputElement).value.trim();
  const email = (document.getElementById("email") as HTMLInputElement).value.trim();
  const password = (document.getElementById("password") as HTMLInputElement).value;
  try {
    const u = await api.signup(username, email, password);
    const { save } = await api.loadCharacter();
    await enterWorld(u, save);
  } catch (err) {
    authError.textContent = (err as Error).message;
  }
});

document.getElementById("btn-logout")!.addEventListener("click", async () => {
  await persist(true);
  await api.logout();
  location.reload();
});

document.getElementById("btn-save")!.addEventListener("click", () => void persist(true));

document.getElementById("tab-bar")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-tab]") as HTMLElement | null;
  if (!btn?.dataset.tab) return;
  setActiveTab(btn.dataset.tab as SideTab);
});

document.getElementById("chat-form")!.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  try {
    const { message } = await api.sendChat(text);
    appendChat(message);
  } catch (err) {
    pushLog(`Chat failed: ${(err as Error).message}`);
  }
});

function interactNearest() {
  if (!state || !world) return;
  const pos = world.getPlayerPos();
  let best = null as ReturnType<World3D["allNodes"]>[number] | null;
  let bestD = 2.8;
  for (const node of world.allNodes()) {
    if (node.kind === "wild_pet") continue;
    const mesh = world.nodeMeshes.get(node.id);
    if (mesh && !mesh.visible) continue;
    const d = Math.hypot(node.x - pos.x, node.z - pos.z);
    const score = d - (node.kind === "ground_egg" ? 1.5 : 0);
    if (score < bestD) {
      bestD = score;
      best = node;
    }
  }
  if (!best) {
    pushLog("Nothing nearby to interact with.");
    return;
  }
  doInteract(best);
}

(async () => {
  if (!api.getToken()) return;
  try {
    const { user: u } = await api.me();
    const { save } = await api.loadCharacter();
    await enterWorld(u, save);
  } catch {
    api.setToken(null);
  }
})();
