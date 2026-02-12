// Sword Art Click — Core Game

const SAVE_KEY = "swordArtClick_save";
const SAVE_INTERVAL = 30_000;
const TICK_RATE = 100; // ms per tick
const COST_SCALE = 1.12;
const ARTIST_COST_SCALE = 1.15;
const MAX_OFFLINE_HOURS = 8;
let soundMuted = false;
let audioCtx: AudioContext | null = null;

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
  bonus: number;
}

interface ArtistDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  baseRate: number; // Strokes per second
}

interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (s: GameState) => boolean;
}

interface PrestigeUpgradeDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  maxLevel: number;
}

interface GameState {
  strokes: number;
  totalStrokes: number;
  totalClicks: number;
  clickPower: number;
  passiveRate: number;
  upgrades: Record<string, number>;
  artists: Record<string, number>;
  mediaTier: number;
  unlockedSwords: string[];
  unlockedAchievements: string[];
  lastSave: number;
  playStartTime: number;
  // Prestige
  erasurePoints: number;
  totalErasurePoints: number;
  prestigeCount: number;
  prestigeUpgrades: Record<string, number>;
  lifetimeStrokes: number;
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

// --- Artist definitions ---

const ARTIST_DEFS: ArtistDef[] = [
  {
    id: "doodler",
    name: "Doodler",
    desc: "Scribbles in the margins",
    baseCost: 15,
    baseRate: 1,
  },
  {
    id: "sketchArtist",
    name: "Sketch Artist",
    desc: "Quick hands, quick lines",
    baseCost: 100,
    baseRate: 5,
  },
  {
    id: "caricaturist",
    name: "Caricaturist",
    desc: "Exaggerates every detail",
    baseCost: 750,
    baseRate: 25,
  },
  {
    id: "illustrator",
    name: "Illustrator",
    desc: "Turns words into blades",
    baseCost: 5_000,
    baseRate: 100,
  },
  {
    id: "courtPainter",
    name: "Court Painter",
    desc: "By royal appointment",
    baseCost: 50_000,
    baseRate: 500,
  },
  {
    id: "renaissanceMaster",
    name: "Renaissance Master",
    desc: "A true polymath of pointy things",
    baseCost: 500_000,
    baseRate: 3_000,
  },
  {
    id: "swordSwallower",
    name: "Sword Swallower",
    desc: "Draws swords differently",
    baseCost: 5_000_000,
    baseRate: 15_000,
  },
  {
    id: "bobRoss",
    name: "Bob Ross",
    desc: "Happy little swords",
    baseCost: 100_000_000,
    baseRate: 100_000,
  },
];

// --- Upgrade definitions (click-only now) ---

const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: "pencilSharpener",
    name: "Pencil Sharpener",
    desc: "A sharper point means bolder strokes. +1 per click.",
    baseCost: 10,
    effect: { type: "click", value: 1 },
  },
  {
    id: "finePoint",
    name: "Fine Point Pen",
    desc: "Precision is an art form. +3 per click.",
    baseCost: 75,
    effect: { type: "click", value: 3 },
  },
  {
    id: "calligraphy",
    name: "Calligraphy Set",
    desc: "Every stroke is deliberate. +10 per click.",
    baseCost: 400,
    effect: { type: "click", value: 10 },
  },
];

// --- Achievements ---

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "firstStroke",
    name: "First Stroke",
    desc: "Draw your first sword",
    check: (s) => s.totalClicks >= 1,
  },
  {
    id: "sharpWit",
    name: "Sharp Wit",
    desc: "Reach 1,000 Strokes",
    check: (s) => s.totalStrokes >= 1_000,
  },
  {
    id: "cuttingEdge",
    name: "Cutting Edge",
    desc: "Buy your first media upgrade",
    check: (s) => s.mediaTier >= 1,
  },
  {
    id: "artOfWar",
    name: "The Art of War",
    desc: "Own 10 artists total",
    check: (s) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id];
      return total >= 10;
    },
  },
  {
    id: "sketchyBusiness",
    name: "Sketchy Business",
    desc: "Click 10,000 times",
    check: (s) => s.totalClicks >= 10_000,
  },
  {
    id: "drawnOut",
    name: "Drawn Out",
    desc: "Play for 30 minutes",
    check: (s) => Date.now() - s.playStartTime >= 30 * 60 * 1000,
  },
  {
    id: "fineLine",
    name: "A Fine Line",
    desc: "Reach 1,000,000 Strokes",
    check: (s) => s.totalStrokes >= 1_000_000,
  },
  {
    id: "foiledAgain",
    name: "Foiled Again",
    desc: "Reach the Ink & Quill media tier",
    check: (s) => s.mediaTier >= 2,
  },
  {
    id: "oilsWell",
    name: "Oil's Well That Ends Well",
    desc: "Reach Oil Painting",
    check: (s) => s.mediaTier >= 4,
  },
  {
    id: "pixelPerfect",
    name: "Pixel Perfect",
    desc: "Reach Digital Art",
    check: (s) => s.mediaTier >= 5,
  },
  {
    id: "aiOverlords",
    name: "I, For One, Welcome Our AI Overlords",
    desc: "Reach AI-Generated",
    check: (s) => s.mediaTier >= 6,
  },
];

// --- Prestige definitions ---

const PRESTIGE_THRESHOLD = 10_000_000;

const PRESTIGE_UPGRADE_DEFS: PrestigeUpgradeDef[] = [
  {
    id: "muscleMemory",
    name: "Muscle Memory",
    desc: "+10% click power per level",
    baseCost: 1,
    maxLevel: 50,
  },
  {
    id: "artSchool",
    name: "Art School",
    desc: "+25% artist production per level",
    baseCost: 2,
    maxLevel: 50,
  },
  {
    id: "betterPaper",
    name: "Better Paper",
    desc: "Start with Charcoal media after prestige",
    baseCost: 5,
    maxLevel: 1,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    desc: "Keep unlocked sword types across prestiges",
    baseCost: 10,
    maxLevel: 1,
  },
  {
    id: "speedSketch",
    name: "Speed Sketch",
    desc: "+50% all production per level",
    baseCost: 25,
    maxLevel: 20,
  },
];

// --- Number formatting ---

function formatNumber(n: number): string {
  if (n < 1_000) return Math.floor(n).toString();
  const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi"];
  const tier = Math.floor(Math.log10(Math.abs(n)) / 3);
  if (tier === 0) return Math.floor(n).toLocaleString();
  const suffix = suffixes[tier] ?? `e${tier * 3}`;
  const scale = Math.pow(10, tier * 3);
  const scaled = n / scale;
  return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + suffix;
}

// --- Sound effects (Web Audio API) ---

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playSound(
  type: "click" | "purchase" | "achievement" | "milestone",
): void {
  if (soundMuted) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
      case "click":
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      case "purchase":
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case "achievement":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(784, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case "milestone":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(392, now);
        osc.frequency.setValueAtTime(523, now + 0.15);
        osc.frequency.setValueAtTime(659, now + 0.3);
        osc.frequency.setValueAtTime(784, now + 0.45);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
    }
  } catch {
    // Web Audio not supported
  }
}

// --- Game state ---

let state: GameState = createDefaultState();

function createDefaultState(): GameState {
  return {
    strokes: 0,
    totalStrokes: 0,
    totalClicks: 0,
    clickPower: 1,
    passiveRate: 0,
    upgrades: {},
    artists: {},
    mediaTier: 0,
    unlockedSwords: ["butterKnife"],
    unlockedAchievements: [],
    lastSave: Date.now(),
    playStartTime: Date.now(),
    erasurePoints: 0,
    totalErasurePoints: 0,
    prestigeCount: 0,
    prestigeUpgrades: {},
    lifetimeStrokes: 0,
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

function getPrestigeBonus(id: string): number {
  return state.prestigeUpgrades[id] ?? 0;
}

function getTotalMultiplier(): number {
  const mediaMultiplier = getMediaMultiplier();
  const swordBonus = 1 + getSwordBonus() / 100;
  const speedSketchBonus = 1 + getPrestigeBonus("speedSketch") * 0.5;
  return mediaMultiplier * swordBonus * speedSketchBonus;
}

function getEffectiveClickPower(): number {
  const muscleMemoryBonus = 1 + getPrestigeBonus("muscleMemory") * 0.1;
  return state.clickPower * getTotalMultiplier() * muscleMemoryBonus;
}

function getEffectivePassiveRate(): number {
  const artSchoolBonus = 1 + getPrestigeBonus("artSchool") * 0.25;
  return state.passiveRate * getTotalMultiplier() * artSchoolBonus;
}

// --- Cost calculation ---

function getUpgradeCost(def: UpgradeDef): number {
  const owned = state.upgrades[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(COST_SCALE, owned));
}

function getArtistCost(def: ArtistDef): number {
  const owned = state.artists[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(ARTIST_COST_SCALE, owned));
}

// --- Artist system ---

function recalcPassiveRate(): void {
  state.passiveRate = 0;
  for (const def of ARTIST_DEFS) {
    const owned = state.artists[def.id] ?? 0;
    state.passiveRate += def.baseRate * owned;
  }
}

function getArtistProduction(def: ArtistDef): number {
  const owned = state.artists[def.id] ?? 0;
  return def.baseRate * owned * getTotalMultiplier();
}

function buyArtist(def: ArtistDef): void {
  const cost = getArtistCost(def);
  if (state.strokes < cost) return;

  state.strokes -= cost;
  state.artists[def.id] = (state.artists[def.id] ?? 0) + 1;
  recalcPassiveRate();
  playSound("purchase");
  checkAchievements();

  saveGame();
  renderArtists();
  updateDisplay();
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
  playSound("milestone");
  triggerShake();
  checkAchievements();
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
      playSound("milestone");
      triggerShake();
      renderGallery();
    }
  }
}

// --- Achievement checking ---

function checkAchievements(): void {
  for (const ach of ACHIEVEMENT_DEFS) {
    if (state.unlockedAchievements.includes(ach.id)) continue;
    if (ach.check(state)) {
      state.unlockedAchievements.push(ach.id);
      showNotification(`Achievement: ${ach.name}! — ${ach.desc}`);
      playSound("achievement");
      renderAchievements();
    }
  }
}

// --- Floating click text ---

function showFloatingText(amount: number, event: MouseEvent): void {
  const el = document.createElement("div");
  el.className = "floating-text";
  el.textContent = "+" + formatNumber(amount);
  el.style.left = event.clientX + "px";
  el.style.top = event.clientY + "px";
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("float-up"));
  setTimeout(() => el.remove(), 800);
}

// --- Screen shake ---

function triggerShake(): void {
  const game = document.getElementById("game");
  if (!game) return;
  game.classList.add("shake");
  setTimeout(() => game.classList.remove("shake"), 300);
}

// --- Notifications ---

function showNotification(msg: string): void {
  const container = document.getElementById("notifications");
  if (!container) return;

  const el = document.createElement("div");
  el.className = "notification";
  el.textContent = msg;
  container.appendChild(el);

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
  }

  playSound("purchase");
  saveGame();
  renderUpgrades();
  updateDisplay();
}

// --- Click handler ---

function handleClick(event?: MouseEvent): void {
  const gain = getEffectiveClickPower();
  state.strokes += gain;
  state.totalStrokes += gain;
  state.totalClicks++;
  if (event) showFloatingText(gain, event);
  playSound("click");
  checkSwordUnlocks();
  checkAchievements();
  updateDisplay();
}

// --- Tick (passive income) ---

function tick(): void {
  if (state.passiveRate > 0) {
    const gain = getEffectivePassiveRate() * (TICK_RATE / 1000);
    state.strokes += gain;
    state.totalStrokes += gain;
    checkSwordUnlocks();
    checkAchievements();
    updateDisplay();
  }
}

// --- Display ---

function updateDisplay(): void {
  document.getElementById("strokes-count")!.textContent = formatNumber(
    state.strokes,
  );
  document.getElementById("per-click")!.textContent = formatNumber(
    getEffectiveClickPower(),
  );
  document.getElementById("per-second")!.textContent = formatNumber(
    getEffectivePassiveRate(),
  );

  const multEl = document.getElementById("multiplier-display");
  if (multEl) {
    const mult = getTotalMultiplier();
    multEl.textContent = mult > 1 ? `${mult.toFixed(1)}x` : "";
  }

  // Update click upgrades
  for (const def of UPGRADE_DEFS) {
    const btn = document.getElementById(
      "upgrade-" + def.id,
    ) as HTMLButtonElement | null;
    if (btn) {
      const cost = getUpgradeCost(def);
      btn.disabled = state.strokes < cost;
      btn.querySelector(".upgrade-cost")!.textContent =
        formatNumber(cost) + " Strokes";
      const owned = state.upgrades[def.id] ?? 0;
      btn.querySelector(".upgrade-owned")!.textContent =
        owned > 0 ? "Owned: " + owned : "";
    }
  }

  // Update artist buttons
  for (const def of ARTIST_DEFS) {
    const btn = document.getElementById(
      "artist-" + def.id,
    ) as HTMLButtonElement | null;
    if (btn) {
      const cost = getArtistCost(def);
      btn.disabled = state.strokes < cost;
      btn.querySelector(".upgrade-cost")!.textContent =
        formatNumber(cost) + " Strokes";
      const owned = state.artists[def.id] ?? 0;
      btn.querySelector(".artist-count")!.textContent =
        owned > 0 ? `Owned: ${owned}` : "";
      const prod = getArtistProduction(def);
      btn.querySelector(".artist-production")!.textContent =
        owned > 0 ? `Producing: ${formatNumber(prod)}/sec` : "";
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
      if (!mediaBtn.dataset.maxed) {
        mediaBtn.textContent = "Max tier reached";
        mediaBtn.dataset.maxed = "1";
      }
    } else {
      const tier = MEDIA_TIERS[nextTier];
      mediaBtn.disabled = state.strokes < tier.cost;
      // Only rewrite innerHTML when the tier changes to avoid clobbering clicks
      if (mediaBtn.dataset.tierId !== tier.id) {
        mediaBtn.dataset.tierId = tier.id;
        delete mediaBtn.dataset.maxed;
        mediaBtn.innerHTML = `
          <div class="upgrade-name">
            ${tier.name}
            <span class="upgrade-cost">${formatNumber(tier.cost)} Strokes</span>
          </div>
          <div class="upgrade-desc">${tier.desc} — ${tier.multiplier}x multiplier</div>
        `;
      }
    }
  }

  // Update production breakdown
  renderProductionBreakdown();

  // Update prestige panel affordability
  for (const def of PRESTIGE_UPGRADE_DEFS) {
    const btn = document.querySelector(
      `#prestige-upgrades-list .prestige-upgrade-btn:nth-child(${PRESTIGE_UPGRADE_DEFS.indexOf(def) + 1})`,
    ) as HTMLButtonElement | null;
    if (btn) {
      const owned = state.prestigeUpgrades[def.id] ?? 0;
      const maxed = owned >= def.maxLevel;
      const cost = getPrestigeUpgradeCost(def);
      btn.disabled = maxed || state.erasurePoints < cost;
    }
  }

  // Update prestige button availability
  const prestigeBtn = document.getElementById(
    "prestige-btn",
  ) as HTMLButtonElement | null;
  if (prestigeBtn && !prestigeBtn.classList.contains("confirming")) {
    const canDo = canPrestige();
    const ep = calculateErasurePoints(state.totalStrokes);
    prestigeBtn.disabled = !canDo;
    if (canDo) {
      prestigeBtn.innerHTML = `Erase &amp; Redraw<br><span class="prestige-ep-gain">+${ep} Erasure Point${ep !== 1 ? "s" : ""}</span>`;
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
        <span class="upgrade-cost">${formatNumber(cost)} Strokes</span>
      </div>
      <div class="upgrade-desc">${def.desc}</div>
      <div class="upgrade-owned">${owned > 0 ? "Owned: " + owned : ""}</div>
    `;
    btn.addEventListener("click", () => buyUpgrade(def));
    list.appendChild(btn);
  }
}

function renderArtists(): void {
  const list = document.getElementById("artists-list")!;
  list.innerHTML = "";

  for (const def of ARTIST_DEFS) {
    const cost = getArtistCost(def);
    const owned = state.artists[def.id] ?? 0;
    const prod = getArtistProduction(def);

    const btn = document.createElement("button");
    btn.className = "upgrade-btn artist-btn";
    btn.id = "artist-" + def.id;
    btn.disabled = state.strokes < cost;
    btn.innerHTML = `
      <div class="upgrade-name">
        ${def.name}
        <span class="upgrade-cost">${formatNumber(cost)} Strokes</span>
      </div>
      <div class="upgrade-desc">${def.desc} — ${formatNumber(def.baseRate)} Strokes/sec each</div>
      <div class="artist-count">${owned > 0 ? `Owned: ${owned}` : ""}</div>
      <div class="artist-production">${owned > 0 ? `Producing: ${formatNumber(prod)}/sec` : ""}</div>
    `;
    btn.addEventListener("click", () => buyArtist(def));
    list.appendChild(btn);
  }
}

function renderProductionBreakdown(): void {
  const el = document.getElementById("production-breakdown");
  if (!el) return;

  const mult = getTotalMultiplier();
  const lines: string[] = [];

  for (const def of ARTIST_DEFS) {
    const owned = state.artists[def.id] ?? 0;
    if (owned > 0) {
      const prod = def.baseRate * owned * mult;
      lines.push(`${def.name} (${owned}): ${formatNumber(prod)}/sec`);
    }
  }

  if (lines.length === 0) {
    el.innerHTML =
      '<div class="breakdown-empty">Hire artists to generate passive Strokes!</div>';
  } else {
    el.innerHTML = lines
      .map((l) => `<div class="breakdown-line">${l}</div>`)
      .join("");
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

// --- Achievements panel ---

function renderAchievements(): void {
  const list = document.getElementById("achievements-list");
  if (!list) return;
  list.innerHTML = "";

  for (const ach of ACHIEVEMENT_DEFS) {
    const unlocked = state.unlockedAchievements.includes(ach.id);
    const el = document.createElement("div");
    el.className = "achievement-entry" + (unlocked ? " unlocked" : " locked");
    el.innerHTML = unlocked
      ? `<div class="achievement-name">${ach.name}</div><div class="achievement-desc">${ach.desc}</div>`
      : `<div class="achievement-name">???</div><div class="achievement-desc">Keep playing to unlock</div>`;
    list.appendChild(el);
  }

  const counter = document.getElementById("achievement-counter");
  if (counter) {
    counter.textContent = `${state.unlockedAchievements.length}/${ACHIEVEMENT_DEFS.length}`;
  }
}

// --- Prestige system ---

function calculateErasurePoints(totalStrokes: number): number {
  return Math.floor(Math.sqrt(totalStrokes / 1_000_000));
}

function canPrestige(): boolean {
  return state.totalStrokes >= PRESTIGE_THRESHOLD;
}

function getPrestigeUpgradeCost(def: PrestigeUpgradeDef): number {
  const owned = state.prestigeUpgrades[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(1.5, owned));
}

function buyPrestigeUpgrade(def: PrestigeUpgradeDef): void {
  const owned = state.prestigeUpgrades[def.id] ?? 0;
  if (owned >= def.maxLevel) return;
  const cost = getPrestigeUpgradeCost(def);
  if (state.erasurePoints < cost) return;

  state.erasurePoints -= cost;
  state.prestigeUpgrades[def.id] = owned + 1;
  playSound("purchase");
  saveGame();
  renderPrestige();
  updateDisplay();
}

function doPrestige(): void {
  const epGained = calculateErasurePoints(state.totalStrokes);
  if (epGained <= 0) return;

  // Preserve prestige-persistent data
  const preserved = {
    erasurePoints: state.erasurePoints + epGained,
    totalErasurePoints: state.totalErasurePoints + epGained,
    prestigeCount: state.prestigeCount + 1,
    prestigeUpgrades: { ...state.prestigeUpgrades },
    lifetimeStrokes: state.lifetimeStrokes + state.totalStrokes,
    unlockedAchievements: [...state.unlockedAchievements],
    playStartTime: state.playStartTime,
  };

  // Keep swords if portfolio upgrade is owned
  const keepSwords = getPrestigeBonus("portfolio") >= 1;
  const preservedSwords = keepSwords
    ? [...state.unlockedSwords]
    : ["butterKnife"];

  // Reset to default
  state = createDefaultState();

  // Restore prestige data
  state.erasurePoints = preserved.erasurePoints;
  state.totalErasurePoints = preserved.totalErasurePoints;
  state.prestigeCount = preserved.prestigeCount;
  state.prestigeUpgrades = preserved.prestigeUpgrades;
  state.lifetimeStrokes = preserved.lifetimeStrokes;
  state.unlockedAchievements = preserved.unlockedAchievements;
  state.playStartTime = preserved.playStartTime;
  state.unlockedSwords = preservedSwords;

  // Apply "Better Paper" — start with Charcoal
  if (getPrestigeBonus("betterPaper") >= 1) {
    state.mediaTier = 1;
  }

  recalcPassiveRate();
  saveGame();
  renderAll();
  triggerEraseAnimation();
  showNotification(
    `Erased & Redrawn! Gained ${epGained} Erasure Point${epGained !== 1 ? "s" : ""}. (Prestige #${state.prestigeCount})`,
  );
  playSound("milestone");
}

function triggerEraseAnimation(): void {
  const game = document.getElementById("game");
  if (!game) return;
  game.classList.add("erasing");
  setTimeout(() => game.classList.remove("erasing"), 1000);
}

function renderPrestige(): void {
  const panel = document.getElementById("prestige-panel");
  if (!panel) return;

  const epAvailable = calculateErasurePoints(state.totalStrokes);
  const canDo = canPrestige();

  // Stats
  const statsEl = document.getElementById("prestige-stats");
  if (statsEl) {
    const lines = [
      `Erasure Points: <strong>${state.erasurePoints}</strong>`,
      `Total earned: ${state.totalErasurePoints}`,
      `Times prestige'd: ${state.prestigeCount}`,
      `Lifetime Strokes: ${formatNumber(state.lifetimeStrokes + state.totalStrokes)}`,
    ];
    statsEl.innerHTML = lines.join("<br>");
  }

  // Prestige button
  const prestigeBtn = document.getElementById(
    "prestige-btn",
  ) as HTMLButtonElement | null;
  if (prestigeBtn) {
    if (canDo) {
      prestigeBtn.disabled = false;
      prestigeBtn.innerHTML = `Erase &amp; Redraw<br><span class="prestige-ep-gain">+${epAvailable} Erasure Point${epAvailable !== 1 ? "s" : ""}</span>`;
    } else {
      prestigeBtn.disabled = true;
      prestigeBtn.innerHTML = `Erase &amp; Redraw<br><span class="prestige-ep-gain">Reach ${formatNumber(PRESTIGE_THRESHOLD)} total Strokes</span>`;
    }
  }

  // Prestige upgrades list
  const list = document.getElementById("prestige-upgrades-list");
  if (list) {
    list.innerHTML = "";
    for (const def of PRESTIGE_UPGRADE_DEFS) {
      const owned = state.prestigeUpgrades[def.id] ?? 0;
      const maxed = owned >= def.maxLevel;
      const cost = getPrestigeUpgradeCost(def);

      const btn = document.createElement("button");
      btn.className = "upgrade-btn prestige-upgrade-btn";
      btn.disabled = maxed || state.erasurePoints < cost;
      btn.innerHTML = `
        <div class="upgrade-name">
          ${def.name}
          <span class="upgrade-cost">${maxed ? "MAX" : cost + " EP"}</span>
        </div>
        <div class="upgrade-desc">${def.desc}</div>
        <div class="upgrade-owned">${owned > 0 ? `Level ${owned}${def.maxLevel > 1 ? "/" + def.maxLevel : ""}` : ""}</div>
      `;
      btn.addEventListener("click", () => buyPrestigeUpgrade(def));
      list.appendChild(btn);
    }
  }
}

// --- Settings / Export / Import ---

function exportSave(): string {
  saveGame();
  return btoa(JSON.stringify(state));
}

function importSave(data: string): boolean {
  try {
    const parsed = JSON.parse(atob(data)) as Partial<GameState>;
    if (typeof parsed.strokes !== "number") return false;
    state = { ...createDefaultState(), ...parsed } as GameState;
    recalcPassiveRate();
    renderAll();
    saveGame();
    showNotification("Save imported successfully!");
    return true;
  } catch {
    return false;
  }
}

function renderAll(): void {
  renderUpgrades();
  renderArtists();
  renderMediaPanel();
  renderGallery();
  renderAchievements();
  renderPrestige();
  updateDisplay();
}

function setupSettings(): void {
  const muteBtn = document.getElementById("mute-btn");
  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      soundMuted = !soundMuted;
      muteBtn.textContent = soundMuted ? "Unmute" : "Mute";
      try {
        localStorage.setItem("swordArtClick_muted", soundMuted ? "1" : "0");
      } catch {}
    });
    try {
      soundMuted = localStorage.getItem("swordArtClick_muted") === "1";
      muteBtn.textContent = soundMuted ? "Unmute" : "Mute";
    } catch {}
  }

  document.getElementById("save-btn")?.addEventListener("click", () => {
    saveGame();
    showNotification("Game saved!");
  });

  document.getElementById("export-btn")?.addEventListener("click", () => {
    const data = exportSave();
    const textarea = document.getElementById(
      "save-data",
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = data;
      textarea.select();
    }
  });

  document.getElementById("import-btn")?.addEventListener("click", () => {
    const textarea = document.getElementById(
      "save-data",
    ) as HTMLTextAreaElement | null;
    if (!textarea || !textarea.value.trim()) return;
    if (!importSave(textarea.value.trim())) {
      showNotification("Invalid save data!");
    }
  });

  // Reset with two-click confirmation
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    let confirmTimeout: ReturnType<typeof setTimeout> | null = null;
    let awaitingConfirm = false;

    resetBtn.addEventListener("click", () => {
      if (awaitingConfirm) {
        // Second click — actually reset
        if (confirmTimeout) clearTimeout(confirmTimeout);
        awaitingConfirm = false;
        resetBtn.textContent = "Reset";
        resetBtn.classList.remove("danger");

        state = createDefaultState();
        try {
          localStorage.removeItem(SAVE_KEY);
        } catch {}
        saveGame();
        renderAll();
        showNotification("Game reset! Starting fresh.");
      } else {
        // First click — ask for confirmation
        awaitingConfirm = true;
        resetBtn.textContent = "Are you sure?";
        resetBtn.classList.add("danger");

        confirmTimeout = setTimeout(() => {
          awaitingConfirm = false;
          resetBtn.textContent = "Reset";
          resetBtn.classList.remove("danger");
        }, 3000);
      }
    });
  }

  // Prestige button with two-click confirmation
  const prestigeBtn = document.getElementById("prestige-btn");
  if (prestigeBtn) {
    let confirmTimeout: ReturnType<typeof setTimeout> | null = null;
    let awaitingConfirm = false;

    prestigeBtn.addEventListener("click", () => {
      if (!canPrestige()) return;
      if (awaitingConfirm) {
        if (confirmTimeout) clearTimeout(confirmTimeout);
        awaitingConfirm = false;
        prestigeBtn.classList.remove("confirming");
        doPrestige();
      } else {
        awaitingConfirm = true;
        const ep = calculateErasurePoints(state.totalStrokes);
        prestigeBtn.innerHTML = `Are you sure?<br><span class="prestige-ep-gain">This resets your progress for +${ep} EP</span>`;
        prestigeBtn.classList.add("confirming");
        confirmTimeout = setTimeout(() => {
          awaitingConfirm = false;
          prestigeBtn.classList.remove("confirming");
          renderPrestige();
        }, 4000);
      }
    });
  }
}

// --- Collapsible sections ---

const COLLAPSE_KEY = "swordArtClick_collapsed";

function setupCollapsibles(): void {
  let collapsed: Record<string, boolean> = {};
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    if (raw) collapsed = JSON.parse(raw);
  } catch {}

  // Default: achievements and settings collapsed, gallery expanded
  if (collapsed["achievements"] === undefined) collapsed["achievements"] = true;
  if (collapsed["settings"] === undefined) collapsed["settings"] = true;

  const toggles = document.querySelectorAll<HTMLElement>(".collapsible-toggle");
  for (const toggle of toggles) {
    const section = toggle.dataset.section;
    if (!section) continue;

    const content = toggle.nextElementSibling as HTMLElement | null;
    if (!content) continue;

    // Apply saved state
    if (collapsed[section]) {
      content.classList.add("collapsed");
      toggle.closest(".collapsible")?.classList.add("is-collapsed");
    } else {
      content.classList.remove("collapsed");
      toggle.closest(".collapsible")?.classList.remove("is-collapsed");
    }

    toggle.addEventListener("click", () => {
      const isCollapsed = content.classList.toggle("collapsed");
      toggle
        .closest(".collapsible")
        ?.classList.toggle("is-collapsed", isCollapsed);
      collapsed[section] = isCollapsed;
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
      } catch {}
    });
  }
}

// --- Offline progress ---

function calculateOfflineProgress(elapsedMs: number): number {
  const maxMs = MAX_OFFLINE_HOURS * 60 * 60 * 1000;
  const cappedMs = Math.min(elapsedMs, maxMs);
  const seconds = cappedMs / 1000;
  return getEffectivePassiveRate() * seconds;
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

    // Ensure fields exist for saves from older sessions
    if (!state.artists) state.artists = {};
    if (!state.unlockedAchievements) state.unlockedAchievements = [];
    if (!state.totalClicks) state.totalClicks = 0;
    if (!state.playStartTime) state.playStartTime = Date.now();
    if (!state.erasurePoints) state.erasurePoints = 0;
    if (!state.totalErasurePoints) state.totalErasurePoints = 0;
    if (!state.prestigeCount) state.prestigeCount = 0;
    if (!state.prestigeUpgrades) state.prestigeUpgrades = {};
    if (!state.lifetimeStrokes) state.lifetimeStrokes = 0;

    // Recalculate click power from owned upgrades
    state.clickPower = 1;
    for (const def of UPGRADE_DEFS) {
      const owned = state.upgrades[def.id] ?? 0;
      if (owned > 0 && def.effect.type === "click") {
        state.clickPower += def.effect.value * owned;
      }
    }

    // Recalculate passive rate from artists
    recalcPassiveRate();

    // Migrate old passive upgrades: convert artStudent/sketchPad/draftingTable counts to artists
    const oldPassiveIds = ["artStudent", "sketchPad", "draftingTable"];
    let hadOldPassive = false;
    for (const oldId of oldPassiveIds) {
      if (state.upgrades[oldId] && state.upgrades[oldId] > 0) {
        hadOldPassive = true;
        // Give equivalent doodlers for old passive upgrades
        const oldOwned = state.upgrades[oldId];
        state.artists["doodler"] = (state.artists["doodler"] ?? 0) + oldOwned;
        delete state.upgrades[oldId];
      }
    }
    if (hadOldPassive) recalcPassiveRate();

    // Calculate offline earnings
    if (state.lastSave && state.passiveRate > 0) {
      const elapsed = Date.now() - state.lastSave;
      if (elapsed > 1000) {
        const offlineGain = calculateOfflineProgress(elapsed);
        if (offlineGain > 0) {
          state.strokes += offlineGain;
          state.totalStrokes += offlineGain;
          const seconds = Math.min(elapsed, MAX_OFFLINE_HOURS * 3600000) / 1000;
          const timeStr =
            seconds >= 3600
              ? `${(seconds / 3600).toFixed(1)} hours`
              : seconds >= 60
                ? `${Math.floor(seconds / 60)} minutes`
                : `${Math.floor(seconds)} seconds`;
          setTimeout(() => {
            showNotification(
              `Welcome back! Earned ${formatNumber(offlineGain)} Strokes while away (${timeStr})`,
            );
          }, 500);
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
  renderArtists();
  renderMediaPanel();
  renderGallery();
  renderAchievements();
  renderPrestige();
  updateDisplay();
  setupSettings();
  setupCollapsibles();

  document
    .getElementById("draw-btn")!
    .addEventListener("click", (e) => handleClick(e));
  document
    .getElementById("media-upgrade-btn")!
    .addEventListener("click", buyMediaTier);

  setInterval(tick, TICK_RATE);
  setInterval(saveGame, SAVE_INTERVAL);
}

init();
