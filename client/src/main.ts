import "./styles.css";
import { SKILL_IDS, SKILL_LABELS, type AuthUser, type CharacterSave } from "@shared/index";
import { PET_SPECIES } from "./content/pets";
import { QUESTS } from "./content/quests";
import { itemName } from "./content/items";
import { GameState } from "./game/state";
import { World3D } from "./game/world3d";
import { castSpark, eatFood, interact } from "./game/actions";
import { WORLD_NODES } from "./content/world";
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
    <div class="hud">
      <div class="panel topbar">
        <div class="brand">Gaslamp &amp; Familiar</div>
        <div class="statline">
          <span>HP <strong id="hp">10/10</strong></span>
          <span>Gold <strong id="gold">0</strong></span>
          <span id="user-label"></span>
        </div>
        <div class="auth-actions" style="margin:0">
          <button type="button" id="btn-save">Save</button>
          <button type="button" id="btn-logout">Log out</button>
        </div>
      </div>
      <div class="panel skills" id="skills-panel"></div>
      <div class="side">
        <div class="panel" id="quest-panel"></div>
        <div class="panel" id="pet-panel"></div>
        <div class="panel" id="inv-panel"></div>
        <div class="panel">
          <h2>Actions</h2>
          <div class="toolbar">
            <button type="button" class="primary" id="btn-spark">Cast Spark (burn logs)</button>
            <button type="button" id="btn-eat">Eat Bread</button>
            <button type="button" id="btn-nearest">Interact nearest</button>
          </div>
          <p class="muted" style="margin:8px 0 0;font-size:0.8rem">Click the ground to walk. Click (or use Interact nearest) on NPCs, trees, rocks, enemies, or wild familiars.</p>
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

let state: GameState | null = null;
let world: World3D | null = null;
let user: AuthUser | null = null;
let saveTimer = 0;
let lastUi = 0;

function pushLog(msg: string) {
  const line = document.createElement("div");
  line.textContent = msg;
  logEl.prepend(line);
  while (logEl.childElementCount > 40) logEl.lastChild?.remove();
}

function renderHud() {
  if (!state) return;
  const s = state.save;
  document.getElementById("hp")!.textContent = `${s.hp}/${s.maxHp}`;
  document.getElementById("gold")!.textContent = String(s.gold);

  const skills = document.getElementById("skills-panel")!;
  skills.innerHTML = `<h2>Skills</h2>${SKILL_IDS.map((id) => {
    const sk = s.skills[id];
    return `<div class="skill-row"><span>${SKILL_LABELS[id]}</span><strong>${sk.level}</strong></div>`;
  }).join("")}`;

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
    pets.innerHTML = `<h2>Pets</h2><p class="muted">None yet — finish the lampwright quest.</p>`;
  } else {
    pets.innerHTML =
      `<h2>Pets</h2>` +
      s.pets
        .map((p) => {
          const sp = PET_SPECIES[p.speciesId];
          return `<div class="pet-item ${p.active ? "active" : ""}" data-pet="${p.id}">
            <strong>${p.name}</strong> · lv ${p.level}
            <div class="muted">${(sp?.traits ?? p.traits).join(", ")}</div>
          </div>`;
        })
        .join("") +
      `<p class="muted" style="margin-top:6px;font-size:0.75rem">Click a pet to set active.</p>`;
    pets.querySelectorAll("[data-pet]").forEach((el) => {
      el.addEventListener("click", () => {
        state!.setActivePet((el as HTMLElement).dataset.pet!);
        syncPetVisual();
        renderHud();
      });
    });
  }

  const inv = document.getElementById("inv-panel")!;
  inv.innerHTML =
    `<h2>Inventory</h2>` +
    s.inventory
      .map((slot) => `<div class="inv-item">${itemName(slot.itemId)} × ${slot.qty}</div>`)
      .join("");
}

function syncPetVisual() {
  if (!state || !world) return;
  const pet = state.activePet();
  const color = pet ? PET_SPECIES[pet.speciesId]?.color ?? 0xf6e27a : null;
  world.setActivePetColor(color);
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

async function enterWorld(u: AuthUser, save: CharacterSave) {
  user = u;
  authEl.style.display = "none";
  gameEl.classList.add("active");
  document.getElementById("user-label")!.textContent = u.username;

  state = new GameState(save, pushLog);
  const viewport = document.getElementById("viewport")!;
  viewport.innerHTML = "";
  world = new World3D(viewport);
  world.setPlayerPosition(save.position.x, save.position.z);
  syncPetVisual();
  world.onInteract = (node) => {
    if (!state || !world) return;
    interact(node, state, world);
    renderHud();
  };
  world.onHover = (label) => {
    const el = document.getElementById("hover-label")!;
    if (!label) {
      el.classList.remove("show");
      return;
    }
    el.textContent = label;
    el.classList.add("show");
  };

  pushLog("Welcome to Brindlewick. Click to walk — talk to Mabel by the square.");
  renderHud();

  // Dev/test hook for automation
  (window as unknown as { __va?: unknown }).__va = {
    state: () => state,
    world: () => world,
    interactNearest: () => document.getElementById("btn-nearest")?.dispatchEvent(new Event("click")),
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
    world?.update(dt);
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

document.getElementById("btn-nearest")!.addEventListener("click", () => {
  if (!state || !world) return;
  const pos = world.getPlayerPos();
  let best = null as (typeof WORLD_NODES)[number] | null;
  let bestD = 2.8;
  for (const node of WORLD_NODES) {
    const d = Math.hypot(node.x - pos.x, node.z - pos.z);
    if (d < bestD) {
      bestD = d;
      best = node;
    }
  }
  if (!best) {
    pushLog("Nothing nearby to interact with.");
    return;
  }
  interact(best, state, world);
  renderHud();
});

// Session restore
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
