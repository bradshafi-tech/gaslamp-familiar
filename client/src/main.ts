import "./styles.css";
import {
  ATTACK_STYLES,
  INV_SIZE,
  LIGHT_ORB_ASHES_TO_L2,
  LIGHT_ORB_OAK_TO_L30,
  LIGHT_ORB_SPECIES,
  SKILL_DESCRIPTIONS,
  SKILL_IDS,
  SKILL_LABELS,
  type AttackStyle,
  type AuthUser,
  type CharacterSave,
  type SkillId,
} from "@shared/index";
import { PET_SPECIES } from "./content/pets";
import { QUESTS } from "./content/quests";
import { ITEMS, itemName } from "./content/items";
import { GameState } from "./game/state";
import { World3D } from "./game/world3d";
import { castSpark, eatFood, handleEnemyDefeated, interact } from "./game/actions";
import { GameSession } from "./game/session";
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
    <div class="hover-label" id="hover-label"></div>
    <div id="splat-layer"></div>
    <div id="ctx-menu" class="ctx-menu" hidden></div>
    <div id="skill-flash" class="skill-flash" hidden>▲</div>
    <div id="modal-root"></div>
    <div class="hud">
      <div class="panel topbar">
        <div class="brand">Gaslamp &amp; Familiar</div>
        <div class="statline">
          <span>HP <strong id="hp">10/10</strong></span>
          <span>Gold <strong id="gold">0</strong></span>
          <span id="style-label"></span>
          <span id="user-label"></span>
        </div>
        <div class="auth-actions" style="margin:0">
          <button type="button" id="btn-research">Research Book</button>
          <button type="button" id="btn-styles">Attack Style</button>
          <button type="button" id="btn-save">Save</button>
          <button type="button" id="btn-logout">Log out</button>
        </div>
      </div>
      <div class="panel skills" id="skills-panel"></div>
      <div class="side">
        <div class="panel" id="quest-panel"></div>
        <div class="panel" id="pet-panel"></div>
        <div class="panel" id="inv-panel"></div>
        <div class="panel" id="style-panel"></div>
        <div class="panel">
          <h2>Actions</h2>
          <div class="toolbar">
            <button type="button" class="primary" id="btn-spark">Cast Spark (burn logs)</button>
            <button type="button" id="btn-eat">Eat Bread</button>
            <button type="button" id="btn-nearest">Interact nearest</button>
          </div>
          <p class="muted" style="margin:8px 0 0;font-size:0.8rem">Left-click walk/use · Right-click Walk here / Use / Research · 22-slot inventory</p>
        </div>
        <div class="panel chat-panel">
          <h2>Chat <span class="muted" style="font-weight:400;font-size:0.75rem">(global)</span></h2>
          <div class="chat-log" id="chat-log"></div>
          <form class="chat-form" id="chat-form">
            <input id="chat-input" maxlength="240" placeholder="Say something…" autocomplete="off" />
            <button type="submit" class="primary">Send</button>
          </form>
        </div>
      </div>
      <div class="panel log" id="log"></div>
    </div>
  </div>
`;

const authEl = document.getElementById("auth")!;
const gameEl = document.getElementById("game")!;
const authError = document.getElementById("auth-error")!;
const logEl = document.getElementById("log")!;
const ctxMenu = document.getElementById("ctx-menu")!;
const splatLayer = document.getElementById("splat-layer")!;
const modalRoot = document.getElementById("modal-root")!;
const skillFlash = document.getElementById("skill-flash")!;

let state: GameState | null = null;
let world: World3D | null = null;
let session: GameSession | null = null;
let user: AuthUser | null = null;
let saveTimer = 0;
let lastUi = 0;
let chatAfter = 0;
let chatTimer = 0;
const seenChat = new Set<string>();
let skillInfoOpen: SkillId | null = null;
let flashSkill: SkillId | null = null;
let flashUntil = 0;

function pushLog(msg: string) {
  const line = document.createElement("div");
  line.textContent = msg;
  logEl.prepend(line);
  while (logEl.childElementCount > 40) logEl.lastChild?.remove();
}

function appendChat(msg: api.ChatMessage) {
  if (seenChat.has(msg.id)) return;
  seenChat.add(msg.id);
  const el = document.getElementById("chat-log")!;
  const row = document.createElement("div");
  row.className = "chat-line";
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  row.innerHTML = `<span class="chat-meta">${time} <strong>${escapeHtml(msg.username)}</strong></span> ${escapeHtml(msg.body)}`;
  el.appendChild(row);
  el.scrollTop = el.scrollHeight;
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

function spawnSplat(worldPos: { x: number; y: number; z: number }, text: string, kind: "hit" | "miss" | "heal") {
  if (!world) return;
  const scr = world.projectToScreen(worldPos.x, worldPos.y, worldPos.z);
  if (!scr) return;
  const el = document.createElement("div");
  el.className = `splat splat-${kind}`;
  el.textContent = text;
  el.style.left = `${scr.x}px`;
  el.style.top = `${scr.y}px`;
  splatLayer.appendChild(el);
  requestAnimationFrame(() => el.classList.add("go"));
  setTimeout(() => el.remove(), 900);
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

function openResearchBook() {
  if (!state) return;
  const entries = [...state.save.research].sort((a, b) => a.name.localeCompare(b.name));
  const cats = Array.from(new Set(entries.map((e) => e.category)));
  const body =
    entries.length === 0
      ? `<p class="muted">Empty — right-click world objects, pets, or inventory items and choose Research.</p>`
      : cats
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
  openModal(`Research Book (${entries.length})`, body);
}

function openStylePicker() {
  if (!state) return;
  const cur = state.save.attackStyle;
  const body = ATTACK_STYLES.map(
    (s) =>
      `<button type="button" class="style-pick ${s.id === cur ? "active" : ""}" data-style="${s.id}">
        <strong>${s.label}</strong>
        <span class="muted">${s.desc}</span>
      </button>`
  ).join("");
  openModal("Attack Style", `<div class="style-list">${body}</div>`);
  modalRoot.querySelectorAll("[data-style]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = (el as HTMLElement).dataset.style as AttackStyle;
      state!.setAttackStyle(id);
      pushLog(`Attack style: ${ATTACK_STYLES.find((s) => s.id === id)?.label}`);
      closeModal();
      renderHud();
    });
  });
}

function openSkillInfo(id: SkillId) {
  if (!state) return;
  skillInfoOpen = id;
  const sk = state.save.skills[id];
  const body = `<p>${SKILL_DESCRIPTIONS[id]}</p>
    <p><strong>Level ${sk.level}</strong> · ${sk.xp} xp</p>
    <p class="muted">Click a flashing skill arrow after a level-up to open this panel.</p>`;
  openModal(SKILL_LABELS[id], body);
}

function renderInvSlotMenu(index: number, clientX: number, clientY: number) {
  if (!state || !session) return;
  const slot = state.inventoryList()[index];
  if (!slot) return;
  let useLabel = `Use ${itemName(slot.itemId)}`;
  if (slot.itemId === "ashes") useLabel = "Feed Light Orb (ashes)";
  else if (slot.itemId === "oak_logs") useLabel = "Feed / burn Oak Log";
  else if (slot.itemId === "tree_logs") useLabel = "Burn Tree Log → ash";
  showCtx(clientX, clientY, [
    { label: useLabel, action: () => session!.useItem(slot.itemId) },
    { label: "Examine", action: () => session!.examineItem(slot.itemId) },
    { label: "Research", action: () => session!.researchItem(slot.itemId) },
    { label: "Drop", action: () => session!.dropItemSlot(index) },
  ]);
}

function renderHud() {
  if (!state) return;
  const s = state.save;
  document.getElementById("hp")!.textContent = `${s.hp}/${s.maxHp}`;
  document.getElementById("gold")!.textContent = String(s.gold);
  const style = ATTACK_STYLES.find((x) => x.id === s.attackStyle);
  document.getElementById("style-label")!.textContent = style ? `Style ${style.label}` : "";

  const skills = document.getElementById("skills-panel")!;
  skills.innerHTML =
    `<h2>Skills</h2>` +
    SKILL_IDS.map((id) => {
      const sk = s.skills[id];
      const flash = flashSkill === id && performance.now() < flashUntil ? " flash" : "";
      return `<button type="button" class="skill-row${flash}${skillInfoOpen === id ? " selected" : ""}" data-skill="${id}">
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

  const quests = document.getElementById("quest-panel")!;
  quests.innerHTML =
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

  const pets = document.getElementById("pet-panel")!;
  if (!s.pets.length) {
    pets.innerHTML = `<h2>Pets</h2><p class="muted">None yet — finish the lampwright quest for a Light Orb.</p>`;
  } else {
    pets.innerHTML =
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
          return `<div class="pet-item ${p.active ? "active" : ""}" data-pet="${p.id}" data-species="${p.speciesId}">
            <strong>${p.name}</strong> · lv ${p.level}${colorNote}
            <div class="muted">${(sp?.traits ?? p.traits).join(", ")}</div>
            ${progress}
          </div>`;
        })
        .join("") +
      `<p class="muted" style="margin-top:6px;font-size:0.75rem">Click to set active · Right-click Research · Use ashes/oak on Light Orb</p>`;
    pets.querySelectorAll("[data-pet]").forEach((el) => {
      el.addEventListener("click", () => {
        state!.setActivePet((el as HTMLElement).dataset.pet!);
        syncPetVisual();
        renderHud();
      });
      el.addEventListener("contextmenu", (ev) => {
        const e = ev as MouseEvent;
        e.preventDefault();
        const species = (el as HTMLElement).dataset.species!;
        const petId = (el as HTMLElement).dataset.pet!;
        showCtx(e.clientX, e.clientY, [
          { label: "Set active", action: () => { state!.setActivePet(petId); syncPetVisual(); } },
          { label: "Research", action: () => session?.researchPetSpecies(species) },
        ]);
      });
    });
  }

  // 22-slot inventory grid
  const inv = document.getElementById("inv-panel")!;
  const slots = state.inventoryList();
  const cells = Array.from({ length: INV_SIZE }, (_, i) => {
    const slot = slots[i];
    if (!slot) return `<button type="button" class="inv-slot empty" data-slot="${i}"></button>`;
    const short = itemName(slot.itemId);
    return `<button type="button" class="inv-slot" data-slot="${i}" title="${escapeHtml(short)}">
      <span class="inv-name">${escapeHtml(short)}</span>
      <span class="inv-qty">${slot.qty > 1 ? slot.qty : ""}</span>
    </button>`;
  }).join("");
  inv.innerHTML = `<h2>Inventory <span class="muted" style="font-weight:400">${slots.filter(Boolean).length}/${INV_SIZE}</span></h2><div class="inv-grid">${cells}</div>`;
  inv.querySelectorAll("[data-slot]").forEach((el) => {
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

  const stylePanel = document.getElementById("style-panel")!;
  stylePanel.innerHTML =
    `<h2>Combat Style</h2><div class="style-row">` +
    ATTACK_STYLES.map(
      (st) =>
        `<button type="button" class="style-chip ${s.attackStyle === st.id ? "active" : ""}" data-style="${st.id}" title="${st.desc}">${st.label}</button>`
    ).join("") +
    `</div>`;
  stylePanel.querySelectorAll("[data-style]").forEach((el) => {
    el.addEventListener("click", () => {
      state!.setAttackStyle((el as HTMLElement).dataset.style as AttackStyle);
      renderHud();
    });
  });
}

function syncPetVisual() {
  if (!state || !world) return;
  const pet = state.activePet();
  if (!pet) {
    world.setActivePetSpecies(null);
    return;
  }
  if (pet.speciesId === "dwarf_dragon") {
    world.setActivePetSpecies("dwarf_dragon", pet.color);
    return;
  }
  world.setActivePetSpecies(pet.speciesId);
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
  syncPetVisual();

  session = new GameSession(state, world);
  session.onSplat = spawnSplat;
  session.onUi = () => renderHud();
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
    const items: { label: string; action: () => void }[] = [
      {
        label: "Walk here",
        action: () => world!.walkTo(ground.x, ground.z),
      },
    ];
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
      items.push({
        label: `Use ${node.label}`,
        action: () => {
          world!.walkTo(node.x, node.z, node.id);
        },
      });
      items.push({
        label: `Research ${node.label}`,
        action: () => session!.researchNode(node),
      });
      if (node.kind === "wild_pet") {
        const sp = String(node.meta?.species ?? "");
        if (sp) {
          items.push({
            label: `Research ${PET_SPECIES[sp]?.name ?? sp}`,
            action: () => session!.researchPetSpecies(sp),
          });
        }
      }
    }
    showCtx(clientX, clientY, items);
  };

  pushLog("Welcome to Brindlewick. Click to walk — right-click for Walk here / Use / Research.");
  renderHud();
  void pollChat();
  if (chatTimer) window.clearInterval(chatTimer);
  chatTimer = window.setInterval(() => void pollChat(), 2500);

  (window as unknown as { __va?: unknown }).__va = {
    state: () => state,
    world: () => world,
    session: () => session,
    interactNearest: () => document.getElementById("btn-nearest")?.dispatchEvent(new Event("click")),
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
document.getElementById("btn-research")!.addEventListener("click", () => openResearchBook());
document.getElementById("btn-styles")!.addEventListener("click", () => openStylePicker());
document.getElementById("btn-spark")!.addEventListener("click", () => {
  if (!state) return;
  castSpark(state);
  renderHud();
});
document.getElementById("btn-eat")!.addEventListener("click", () => {
  if (!state) return;
  eatFood(state, "bread");
  renderHud();
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

document.getElementById("btn-nearest")!.addEventListener("click", () => {
  if (!state || !world) return;
  const pos = world.getPlayerPos();
  let best = null as ReturnType<World3D["allNodes"]>[number] | null;
  let bestD = 2.8;
  for (const node of world.allNodes()) {
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
});

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

// silence unused import guard for ITEMS in case tree-shake — keep for examine paths
void ITEMS;
