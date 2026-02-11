// Sword Art Click — Core Game

const SAVE_KEY = "swordArtClick_save";
const SAVE_INTERVAL = 30_000;
const TICK_RATE = 100; // ms per tick
const COST_SCALE = 1.12;

// --- Types ---

interface UpgradeEffect {
  type: "click" | "passive";
  value: number;
}

interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  effect: UpgradeEffect;
}

interface MediaTier {
  id: string;
  name: string;
  multiplier: number;
  cost: number;
  desc: string;
}

interface SwordDef {
  id: string;
  name: string;
  desc: string;
  threshold: number;
  bonus: number; // percentage bonus to all production
}

interface GameState {
  strokes: number;
  totalStrokes: number;
  clickPower: number;
  passiveRate: number;
  upgrades: Record<string, number>;
  mediaTier: number;
  unlockedSwords: string[];
  lastSave: number;
}

// --- Media tiers ---

const MEDIA_TIERS: MediaTier[] = [
  {
    id: "pencil",
    name: "Pencil Sketch",
    multiplier: 1,
    cost: 0,
    desc: "Simple graphite on paper",
  },
  {
    id: "charcoal",
    name: "Charcoal",
    multiplier: 3,
    cost: 100,
    desc: "Smudgy but soulful",
  },
  {
    id: "ink",
    name: "Ink & Quill",
    multiplier: 10,
    cost: 1_000,
    desc: "Permanent and precise",
  },
  {
    id: "watercolor",
    name: "Watercolor",
    multiplier: 50,
    cost: 25_000,
    desc: "Flowing and unpredictable",
  },
  {
    id: "oil",
    name: "Oil Painting",
    multiplier: 250,
    cost: 500_000,
    desc: "Rich, layered masterwork",
  },
  {
    id: "digital",
    name: "Digital Art",
    multiplier: 2_000,
    cost: 10_000_000,
    desc: "Ctrl+Z is your best friend",
  },
  {
    id: "ai",
    name: "AI-Generated",
    multiplier: 50_000,
    cost: 1_000_000_000,
    desc: "You've become what you swore to destroy",
  },
];

// --- Sword catalog ---

const SWORD_DEFS: SwordDef[] = [
  {
    id: "butterKnife",
    name: "Butter Knife",
    desc: "Everyone starts somewhere",
    threshold: 0,
    bonus: 0,
  },
  {
    id: "letterOpener",
    name: "Letter Opener",
    desc: "The pen is... adjacent to the sword",
    threshold: 50,
    bonus: 2,
  },
  {
    id: "broadsword",
    name: "Broadsword",
    desc: "Wide strokes",
    threshold: 500,
    bonus: 5,
  },
  {
    id: "swordfish",
    name: "Swordfish",
    desc: "Something smells fishy about this one",
    threshold: 5_000,
    bonus: 5,
  },
  {
    id: "crosswordSword",
    name: "Crossword Sword",
    desc: "4 across: pointy weapon",
    threshold: 25_000,
    bonus: 8,
  },
  {
    id: "passwordSword",
    name: "Password Sword",
    desc: "Must contain 1 uppercase, 1 number, and 1 hilt",
    threshold: 100_000,
    bonus: 10,
  },
  {
    id: "swordOfDamocles",
    name: "Sword of Damocles",
    desc: "Hangs over your head while you draw",
    threshold: 500_000,
    bonus: 12,
  },
  {
    id: "excalibur",
    name: "Excalibur",
    desc: "Pulled from a pencil case",
    threshold: 5_000_000,
    bonus: 15,
  },
  {
    id: "lightsaber",
    name: "Lightsaber",
    desc: "Technically not a sword. We'll allow it.",
    threshold: 50_000_000,
    bonus: 18,
  },
  {
    id: "penSword",
    name: "Pen Sword",
    desc: "Mightier than itself. A paradox.",
    threshold: 500_000_000,
    bonus: 25,
  },
];

// --- Upgrade definitions ---

const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: "pencilSharpener",
    name: "Pencil Sharpener",
    desc: "A sharper point means bolder strokes. +1 per click.",
    baseCost: 10,
    effect: { type: "click", value: 1 },
  },
  {
    id: "artStudent",
    name: "Art Student",
    desc: "Works for exposure. +1 Stroke/sec.",
    baseCost: 25,
    effect: { type: "passive", value: 1 },
  },
  {
    id: "finePoint",
    name: "Fine Point Pen",
    desc: "Precision is an art form. +3 per click.",
    baseCost: 75,
    effect: { type: "click", value: 3 },
  },
  {
    id: "sketchPad",
    name: "Sketch Pad",
    desc: "More pages, more swords. +4 Strokes/sec.",
    baseCost: 150,
    effect: { type: "passive", value: 4 },
  },
  {
    id: "calligraphy",
    name: "Calligraphy Set",
    desc: "Every stroke is deliberate. +10 per click.",
    baseCost: 400,
    effect: { type: "click", value: 10 },
  },
  {
    id: "draftingTable",
    name: "Drafting Table",
    desc: "Professional-grade sword sketching. +15 Strokes/sec.",
    baseCost: 1000,
    effect: { type: "passive", value: 15 },
  },
];

// --- Game state ---

let state: GameState = createDefaultState();
let pendingNotifications: string[] = [];

function createDefaultState(): GameState {
  return {
    strokes: 0,
    totalStrokes: 0,
    clickPower: 1,
    passiveRate: 0,
    upgrades: {},
    mediaTier: 0,
    unlockedSwords: ["butterKnife"],
    lastSave: Date.now(),
  };
}

// --- Multiplier calculation ---

function getMediaMultiplier(): number {
  return MEDIA_TIERS[state.mediaTier].multiplier;
}

function getSwordBonus(): number {
  let bonus = 0;
  for (const swordId of state.unlockedSwords) {
    const def = SWORD_DEFS.find((s) => s.id === swordId);
    if (def) bonus += def.bonus;
  }
  return bonus;
}

function getTotalMultiplier(): number {
  const mediaMultiplier = getMediaMultiplier();
  const swordBonus = 1 + getSwordBonus() / 100;
  return mediaMultiplier * swordBonus;
}

function getEffectiveClickPower(): number {
  return state.clickPower * getTotalMultiplier();
}

function getEffectivePassiveRate(): number {
  return state.passiveRate * getTotalMultiplier();
}

// --- Cost calculation ---

function getUpgradeCost(def: UpgradeDef): number {
  const owned = state.upgrades[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(COST_SCALE, owned));
}

// --- Media tier upgrade ---

function buyMediaTier(): void {
  const nextTier = state.mediaTier + 1;
  if (nextTier >= MEDIA_TIERS.length) return;

  const tier = MEDIA_TIERS[nextTier];
  if (state.strokes < tier.cost) return;

  state.strokes -= tier.cost;
  state.mediaTier = nextTier;

  showNotification(
    `Media upgraded to ${tier.name}! (${tier.multiplier}x multiplier)`,
  );
  saveGame();
  renderMediaPanel();
  updateDisplay();
}

// --- Sword unlock checking ---

function checkSwordUnlocks(): void {
  for (const sword of SWORD_DEFS) {
    if (state.unlockedSwords.includes(sword.id)) continue;
    if (state.totalStrokes >= sword.threshold) {
      state.unlockedSwords.push(sword.id);
      showNotification(`Sword unlocked: ${sword.name}! "${sword.desc}"`);
      renderGallery();
    }
  }
}

// --- Notifications ---

function showNotification(msg: string): void {
  const container = document.getElementById("notifications");
  if (!container) return;

  const el = document.createElement("div");
  el.className = "notification";
  el.textContent = msg;
  container.appendChild(el);

  // Trigger animation
  requestAnimationFrame(() => el.classList.add("show"));

  setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 500);
  }, 3000);
}

// --- Upgrade purchase ---

function buyUpgrade(def: UpgradeDef): void {
  const cost = getUpgradeCost(def);
  if (state.strokes < cost) return;

  state.strokes -= cost;
  state.upgrades[def.id] = (state.upgrades[def.id] ?? 0) + 1;

  if (def.effect.type === "click") {
    state.clickPower += def.effect.value;
  } else if (def.effect.type === "passive") {
    state.passiveRate += def.effect.value;
  }

  saveGame();
  renderUpgrades();
  updateDisplay();
}

// --- Click handler ---

function handleClick(): void {
  const gain = getEffectiveClickPower();
  state.strokes += gain;
  state.totalStrokes += gain;
  checkSwordUnlocks();
  updateDisplay();
}

// --- Tick (passive income) ---

function tick(): void {
  if (state.passiveRate > 0) {
    const gain = getEffectivePassiveRate() * (TICK_RATE / 1000);
    state.strokes += gain;
    state.totalStrokes += gain;
    checkSwordUnlocks();
    updateDisplay();
  }
}

// --- Display ---

function updateDisplay(): void {
  document.getElementById("strokes-count")!.textContent = Math.floor(
    state.strokes,
  ).toLocaleString();
  document.getElementById("per-click")!.textContent = Math.floor(
    getEffectiveClickPower(),
  ).toLocaleString();
  document.getElementById("per-second")!.textContent = Math.floor(
    getEffectivePassiveRate(),
  ).toLocaleString();

  // Update multiplier display
  const multEl = document.getElementById("multiplier-display");
  if (multEl) {
    const mult = getTotalMultiplier();
    multEl.textContent = mult > 1 ? `${mult.toFixed(1)}x` : "";
  }

  for (const def of UPGRADE_DEFS) {
    const btn = document.getElementById(
      "upgrade-" + def.id,
    ) as HTMLButtonElement | null;
    if (btn) {
      const cost = getUpgradeCost(def);
      btn.disabled = state.strokes < cost;
      btn.querySelector(".upgrade-cost")!.textContent =
        cost.toLocaleString() + " Strokes";
      const owned = state.upgrades[def.id] ?? 0;
      btn.querySelector(".upgrade-owned")!.textContent =
        owned > 0 ? "Owned: " + owned : "";
    }
  }

  // Update media upgrade button
  const mediaBtn = document.getElementById(
    "media-upgrade-btn",
  ) as HTMLButtonElement | null;
  if (mediaBtn) {
    const nextTier = state.mediaTier + 1;
    if (nextTier >= MEDIA_TIERS.length) {
      mediaBtn.disabled = true;
      mediaBtn.textContent = "Max tier reached";
    } else {
      const tier = MEDIA_TIERS[nextTier];
      mediaBtn.disabled = state.strokes < tier.cost;
      mediaBtn.innerHTML = `
        <div class="upgrade-name">
          ${tier.name}
          <span class="upgrade-cost">${tier.cost.toLocaleString()} Strokes</span>
        </div>
        <div class="upgrade-desc">${tier.desc} — ${tier.multiplier}x multiplier</div>
      `;
    }
  }
}

function renderUpgrades(): void {
  const list = document.getElementById("upgrades-list")!;
  list.innerHTML = "";

  for (const def of UPGRADE_DEFS) {
    const cost = getUpgradeCost(def);
    const owned = state.upgrades[def.id] ?? 0;

    const btn = document.createElement("button");
    btn.className = "upgrade-btn";
    btn.id = "upgrade-" + def.id;
    btn.disabled = state.strokes < cost;
    btn.innerHTML = `
      <div class="upgrade-name">
        ${def.name}
        <span class="upgrade-cost">${cost.toLocaleString()} Strokes</span>
      </div>
      <div class="upgrade-desc">${def.desc}</div>
      <div class="upgrade-owned">${owned > 0 ? "Owned: " + owned : ""}</div>
    `;
    btn.addEventListener("click", () => buyUpgrade(def));
    list.appendChild(btn);
  }
}

function renderMediaPanel(): void {
  const currentEl = document.getElementById("current-media");
  if (currentEl) {
    const tier = MEDIA_TIERS[state.mediaTier];
    currentEl.textContent = `${tier.name} (${tier.multiplier}x)`;
  }
}

function renderGallery(): void {
  const gallery = document.getElementById("sword-gallery");
  if (!gallery) return;

  gallery.innerHTML = "";
  for (const sword of SWORD_DEFS) {
    const unlocked = state.unlockedSwords.includes(sword.id);
    const el = document.createElement("div");
    el.className = "sword-entry" + (unlocked ? " unlocked" : " locked");
    el.innerHTML = unlocked
      ? `<div class="sword-name">${sword.name}</div>
         <div class="sword-desc">"${sword.desc}"</div>
         <div class="sword-bonus">+${sword.bonus}% production</div>`
      : `<div class="sword-name">???</div>
         <div class="sword-desc">Reach ${sword.threshold.toLocaleString()} total Strokes</div>`;
    gallery.appendChild(el);
  }
}

// --- Save / Load ---

function saveGame(): void {
  state.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // localStorage might be full or unavailable
  }
}

function loadGame(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<GameState> | null;
    if (!saved || typeof saved.strokes !== "number") return;

    state = { ...createDefaultState(), ...saved } as GameState;

    // Recalculate derived stats from owned upgrades
    state.clickPower = 1;
    state.passiveRate = 0;
    for (const def of UPGRADE_DEFS) {
      const owned = state.upgrades[def.id] ?? 0;
      if (owned > 0) {
        if (def.effect.type === "click") {
          state.clickPower += def.effect.value * owned;
        } else if (def.effect.type === "passive") {
          state.passiveRate += def.effect.value * owned;
        }
      }
    }
  } catch {
    // Corrupted save, start fresh
  }
}

// --- Init ---

function init(): void {
  loadGame();
  renderUpgrades();
  renderMediaPanel();
  renderGallery();
  updateDisplay();

  document.getElementById("draw-btn")!.addEventListener("click", handleClick);
  document
    .getElementById("media-upgrade-btn")!
    .addEventListener("click", buyMediaTier);

  setInterval(tick, TICK_RATE);
  setInterval(saveGame, SAVE_INTERVAL);
}

init();
