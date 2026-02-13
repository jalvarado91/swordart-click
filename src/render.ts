// Sword Art Click — DOM cache + single render function

import type { GameState } from "./types.ts";
import {
  ACHIEVEMENT_DEFS,
  ARTIST_DEFS,
  COLLAPSE_KEY,
  MEDIA_TIERS,
  PRESTIGE_THRESHOLD,
  PRESTIGE_UPGRADE_DEFS,
  SWORD_DEFS,
  UPGRADE_DEFS,
} from "./data.ts";
import {
  calculateErasurePoints,
  canPrestige,
  formatNumber,
  getArtistCost,
  getArtistProduction,
  getEffectiveClickPower,
  getEffectivePassiveRate,
  getPrestigeUpgradeCost,
  getTotalMultiplier,
  getUpgradeCost,
} from "./helpers.ts";
import { isMuted, setMuted, loadMuteState } from "./audio.ts";
import {
  buyArtist,
  buyMediaTier,
  buyPrestigeUpgrade,
  buyUpgrade,
  exportSave,
  handleClick,
  importSave,
  requestPrestige,
  requestReset,
  saveGame,
} from "./logic.ts";
import { showNotification } from "./effects.ts";

// --- DOM element cache ---

interface UpgradeElements {
  btn: HTMLButtonElement;
  cost: HTMLElement;
  owned: HTMLElement;
}

interface ArtistElements {
  btn: HTMLButtonElement;
  cost: HTMLElement;
  count: HTMLElement;
  prod: HTMLElement;
}

interface SwordElements {
  el: HTMLElement;
  name: HTMLElement;
  desc: HTMLElement;
  bonus: HTMLElement;
}

interface AchievementElements {
  el: HTMLElement;
  name: HTMLElement;
  desc: HTMLElement;
}

interface PrestigeUpgradeElements {
  btn: HTMLButtonElement;
  cost: HTMLElement;
  owned: HTMLElement;
}

interface BreakdownElements {
  container: HTMLElement;
  empty: HTMLElement;
  lines: Map<string, HTMLElement>;
}

interface DOMCache {
  // Stats
  strokesCount: HTMLElement;
  perClick: HTMLElement;
  perSecond: HTMLElement;
  multiplier: HTMLElement;
  // Media
  currentMedia: HTMLElement;
  mediaBtn: HTMLButtonElement;
  mediaName: HTMLElement;
  mediaCost: HTMLElement;
  mediaDesc: HTMLElement;
  // Production breakdown
  breakdown: BreakdownElements;
  // Upgrades
  upgrades: Map<string, UpgradeElements>;
  // Artists
  artists: Map<string, ArtistElements>;
  // Canvas
  canvasArea: HTMLElement;
  // Swords
  swords: Map<string, SwordElements>;
  // Achievements
  achievements: Map<string, AchievementElements>;
  achievementCounter: HTMLElement;
  // Prestige
  prestigeStats: HTMLElement;
  prestigeBtn: HTMLButtonElement;
  prestigeBtnLabel: HTMLElement;
  prestigeBtnSub: HTMLElement;
  prestigeUpgrades: Map<string, PrestigeUpgradeElements>;
  // Settings
  muteBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  saveDataTextarea: HTMLTextAreaElement;
  // Drawer
  drawer: HTMLElement;
  tabEP: HTMLElement;
  tabProduction: HTMLElement;
  // Collapsible state
  collapsed: Record<string, boolean>;
}

let dom: DOMCache;

// Track previous state to avoid unnecessary DOM writes for lists
let prevMediaTier = -1;
let prevSwordCount = -1;
let prevAchievementCount = -1;

// --- Init: create all DOM elements once ---

export function initDOM(): void {
  loadMuteState();

  // Load collapsed state
  let collapsed: Record<string, boolean> = {};
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    if (raw) collapsed = JSON.parse(raw);
  } catch {}
  if (collapsed["achievements"] === undefined) collapsed["achievements"] = true;
  if (collapsed["settings"] === undefined) collapsed["settings"] = true;

  dom = {
    strokesCount: document.getElementById("strokes-count")!,
    perClick: document.getElementById("per-click")!,
    perSecond: document.getElementById("per-second")!,
    multiplier: document.getElementById("multiplier-display")!,
    currentMedia: document.getElementById("current-media")!,
    mediaBtn: document.getElementById(
      "media-upgrade-btn",
    )! as HTMLButtonElement,
    mediaName: createElement("div", "upgrade-name"),
    mediaCost: createElement("span", "upgrade-cost"),
    mediaDesc: createElement("div", "upgrade-desc"),
    breakdown: initBreakdown(),
    upgrades: initUpgrades(),
    artists: initArtists(),
    canvasArea: document.getElementById("canvas-area")!,
    swords: initSwords(),
    achievements: initAchievements(),
    achievementCounter: document.getElementById("achievement-counter")!,
    prestigeStats: document.getElementById("prestige-stats")!,
    prestigeBtn: document.getElementById("prestige-btn")! as HTMLButtonElement,
    prestigeBtnLabel: createElement("span", ""),
    prestigeBtnSub: createElement("span", "prestige-ep-gain"),
    prestigeUpgrades: initPrestigeUpgrades(),
    muteBtn: document.getElementById("mute-btn")! as HTMLButtonElement,
    resetBtn: document.getElementById("reset-btn")! as HTMLButtonElement,
    saveDataTextarea: document.getElementById(
      "save-data",
    )! as HTMLTextAreaElement,
    drawer: document.getElementById("drawer")!,
    tabEP: document.getElementById("tab-ep")!,
    tabProduction: document.getElementById("tab-production")!,
    collapsed,
  };

  // Assemble media button (stable sub-elements, never re-created)
  dom.mediaName.appendChild(dom.mediaCost);
  dom.mediaBtn.appendChild(dom.mediaName);
  dom.mediaBtn.appendChild(dom.mediaDesc);

  // Assemble prestige button
  dom.prestigeBtn.textContent = "";
  dom.prestigeBtn.appendChild(dom.prestigeBtnLabel);
  dom.prestigeBtn.appendChild(document.createElement("br"));
  dom.prestigeBtn.appendChild(dom.prestigeBtnSub);

  // Wire event listeners (thin — just mutate state)
  document.getElementById("draw-btn")!.addEventListener("click", (e) => {
    handleClick(e.clientX, e.clientY);
  });

  dom.mediaBtn.addEventListener("click", buyMediaTier);
  dom.prestigeBtn.addEventListener("click", requestPrestige);
  dom.muteBtn.addEventListener("click", () => {
    setMuted(!isMuted());
  });
  dom.resetBtn.addEventListener("click", requestReset);

  document.getElementById("save-btn")!.addEventListener("click", () => {
    saveGame();
    showNotification("Game saved!");
  });

  document.getElementById("export-btn")!.addEventListener("click", () => {
    const data = exportSave();
    dom.saveDataTextarea.value = data;
    dom.saveDataTextarea.select();
  });

  document.getElementById("import-btn")!.addEventListener("click", () => {
    const val = dom.saveDataTextarea.value.trim();
    if (!val) return;
    if (!importSave(val)) {
      showNotification("Invalid save data!");
    }
  });

  // Collapsible sections (gallery only now)
  const toggles = Array.from(
    document.querySelectorAll<HTMLElement>(".collapsible-toggle"),
  );
  for (const toggle of toggles) {
    const section = toggle.dataset.section;
    if (!section) continue;
    const content = toggle.nextElementSibling as HTMLElement | null;
    if (!content) continue;

    // Apply initial state
    if (dom.collapsed[section]) {
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
      dom.collapsed[section] = isCollapsed;
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(dom.collapsed));
      } catch {}
    });
  }

  // Drawer tab buttons
  let activeDrawer: string | null = null;
  const tabBtns = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".tab-btn"),
  );
  const drawerPanels = Array.from(
    document.querySelectorAll<HTMLElement>(".drawer-panel"),
  );
  for (const btn of tabBtns) {
    btn.addEventListener("click", () => {
      const target = btn.dataset.drawer!;
      if (activeDrawer === target) {
        // Close drawer
        activeDrawer = null;
        dom.drawer.classList.add("drawer-closed");
        for (const b of tabBtns) b.classList.remove("active");
        for (const p of drawerPanels) p.classList.remove("active");
      } else {
        // Open/switch drawer
        activeDrawer = target;
        dom.drawer.classList.remove("drawer-closed");
        for (const b of tabBtns) b.classList.remove("active");
        btn.classList.add("active");
        for (const p of drawerPanels)
          p.classList.toggle("active", p.id === `drawer-${target}`);
      }
    });
  }

  // Force initial render of lists that depend on tracking previous state
  prevMediaTier = -1;
  prevSwordCount = -1;
  prevAchievementCount = -1;
}

// --- Render: pure function of state, writes to DOM, never reads ---

export function render(state: GameState): void {
  // Stats bar
  dom.strokesCount.textContent = formatNumber(state.strokes);
  dom.perClick.textContent = formatNumber(getEffectiveClickPower());
  dom.perSecond.textContent = formatNumber(getEffectivePassiveRate());

  const mult = getTotalMultiplier();
  dom.multiplier.textContent = mult > 1 ? `${mult.toFixed(1)}x` : "";

  // Media panel
  const tier = MEDIA_TIERS[state.mediaTier]!;
  dom.currentMedia.textContent = `${tier.name} (${tier.multiplier}x)`;

  const nextTierIdx = state.mediaTier + 1;
  if (nextTierIdx >= MEDIA_TIERS.length) {
    dom.mediaBtn.disabled = true;
    if (prevMediaTier !== state.mediaTier) {
      dom.mediaName.textContent = "Max tier reached";
      dom.mediaDesc.textContent = "";
      dom.mediaCost.textContent = "";
    }
  } else {
    const nextTier = MEDIA_TIERS[nextTierIdx]!;
    dom.mediaBtn.disabled = state.strokes < nextTier.cost;
    if (prevMediaTier !== state.mediaTier) {
      // Only rebuild text when tier changes
      dom.mediaName.childNodes[0]!.textContent = nextTier.name + " ";
      dom.mediaCost.textContent = formatNumber(nextTier.cost) + " Strokes";
      dom.mediaDesc.textContent = `${nextTier.desc} — ${nextTier.multiplier}x multiplier`;
    }
  }
  // Canvas area theming — update when tier changes
  if (prevMediaTier !== state.mediaTier) {
    dom.canvasArea.className = `canvas-${tier.id}`;
  }
  prevMediaTier = state.mediaTier;

  // Click upgrades
  for (const def of UPGRADE_DEFS) {
    const els = dom.upgrades.get(def.id)!;
    const cost = getUpgradeCost(def);
    els.btn.disabled = state.strokes < cost;
    els.cost.textContent = formatNumber(cost) + " Strokes";
    const owned = state.upgrades[def.id] ?? 0;
    els.owned.textContent = owned > 0 ? "Owned: " + owned : "";
  }

  // Artists
  for (const def of ARTIST_DEFS) {
    const els = dom.artists.get(def.id)!;
    const cost = getArtistCost(def);
    els.btn.disabled = state.strokes < cost;
    els.cost.textContent = formatNumber(cost) + " Strokes";
    const owned = state.artists[def.id] ?? 0;
    els.count.textContent = owned > 0 ? `Owned: ${owned}` : "";
    const prod = getArtistProduction(def);
    els.prod.textContent =
      owned > 0 ? `Producing: ${formatNumber(prod)}/sec` : "";
  }

  // Production breakdown
  renderBreakdown(state);

  // Sword gallery — only update when unlock count changes
  const currentSwordCount = state.unlockedSwords.length;
  if (currentSwordCount !== prevSwordCount) {
    for (const sword of SWORD_DEFS) {
      const els = dom.swords.get(sword.id)!;
      const unlocked = state.unlockedSwords.includes(sword.id);
      els.el.className = "sword-entry " + (unlocked ? "unlocked" : "locked");
      if (unlocked) {
        els.name.textContent = sword.name;
        els.desc.textContent = `"${sword.desc}"`;
        els.bonus.textContent = `+${sword.bonus}% production`;
      } else {
        els.name.textContent = "???";
        els.desc.textContent = `Reach ${sword.threshold.toLocaleString()} total Strokes`;
        els.bonus.textContent = "";
      }
    }
    prevSwordCount = currentSwordCount;
  }

  // Achievements — only update when count changes
  const currentAchCount = state.unlockedAchievements.length;
  if (currentAchCount !== prevAchievementCount) {
    for (const ach of ACHIEVEMENT_DEFS) {
      const els = dom.achievements.get(ach.id)!;
      const unlocked = state.unlockedAchievements.includes(ach.id);
      els.el.className =
        "achievement-entry " + (unlocked ? "unlocked" : "locked");
      els.name.textContent = unlocked ? ach.name : "???";
      els.desc.textContent = unlocked ? ach.desc : "Keep playing to unlock";
    }
    dom.achievementCounter.textContent = `${currentAchCount}/${ACHIEVEMENT_DEFS.length}`;
    prevAchievementCount = currentAchCount;
  }

  // Prestige stats
  dom.prestigeStats.innerHTML = [
    `Erasure Points: <strong>${state.erasurePoints}</strong>`,
    `Total earned: ${state.totalErasurePoints}`,
    `Times prestige'd: ${state.prestigeCount}`,
    `Lifetime Strokes: ${formatNumber(state.lifetimeStrokes + state.totalStrokes)}`,
  ].join("<br>");

  // Prestige button — state-driven, no closures
  if (state.prestigeConfirming) {
    const ep = calculateErasurePoints(state.totalStrokes);
    dom.prestigeBtnLabel.textContent = "Are you sure?";
    dom.prestigeBtnSub.textContent = `This resets your progress for +${ep} EP`;
    dom.prestigeBtn.disabled = false;
    dom.prestigeBtn.classList.add("confirming");
  } else {
    dom.prestigeBtn.classList.remove("confirming");
    const canDo = canPrestige();
    dom.prestigeBtn.disabled = !canDo;
    if (canDo) {
      const ep = calculateErasurePoints(state.totalStrokes);
      dom.prestigeBtnLabel.textContent = "Erase & Redraw";
      dom.prestigeBtnSub.textContent = `+${ep} Erasure Point${ep !== 1 ? "s" : ""}`;
    } else {
      dom.prestigeBtnLabel.textContent = "Erase & Redraw";
      dom.prestigeBtnSub.textContent = `Reach ${formatNumber(PRESTIGE_THRESHOLD)} total Strokes`;
    }
  }

  // Prestige upgrades
  for (const def of PRESTIGE_UPGRADE_DEFS) {
    const els = dom.prestigeUpgrades.get(def.id)!;
    const owned = state.prestigeUpgrades[def.id] ?? 0;
    const maxed = owned >= def.maxLevel;
    const cost = getPrestigeUpgradeCost(def);
    els.btn.disabled = maxed || state.erasurePoints < cost;
    els.cost.textContent = maxed ? "MAX" : cost + " EP";
    els.owned.textContent =
      owned > 0
        ? `Level ${owned}${def.maxLevel > 1 ? "/" + def.maxLevel : ""}`
        : "";
  }

  // Settings
  dom.muteBtn.textContent = isMuted() ? "Unmute" : "Mute";
  dom.resetBtn.textContent = state.resetConfirming ? "Are you sure?" : "Reset";
  if (state.resetConfirming) {
    dom.resetBtn.classList.add("danger");
  } else {
    dom.resetBtn.classList.remove("danger");
  }

  // Tab bar inline stats
  dom.tabEP.textContent = `${state.erasurePoints} EP`;
  dom.tabProduction.textContent = `${formatNumber(getEffectivePassiveRate())}/sec`;
}

// --- Init helpers: create stable DOM elements ---

function createElement(tag: string, className: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function initUpgrades(): Map<string, UpgradeElements> {
  const list = document.getElementById("upgrades-list")!;
  const map = new Map<string, UpgradeElements>();

  for (const def of UPGRADE_DEFS) {
    const btn = document.createElement("button");
    btn.className = "upgrade-btn";
    btn.id = "upgrade-" + def.id;

    const nameDiv = createElement("div", "upgrade-name");
    nameDiv.appendChild(document.createTextNode(def.name + " "));
    const costSpan = createElement("span", "upgrade-cost");
    nameDiv.appendChild(costSpan);

    const descDiv = createElement("div", "upgrade-desc");
    descDiv.textContent = def.desc;

    const ownedDiv = createElement("div", "upgrade-owned");

    btn.appendChild(nameDiv);
    btn.appendChild(descDiv);
    btn.appendChild(ownedDiv);
    btn.addEventListener("click", () => buyUpgrade(def));
    list.appendChild(btn);

    map.set(def.id, {
      btn: btn as HTMLButtonElement,
      cost: costSpan,
      owned: ownedDiv,
    });
  }

  return map;
}

function initArtists(): Map<string, ArtistElements> {
  const list = document.getElementById("artists-list")!;
  const map = new Map<string, ArtistElements>();

  for (const def of ARTIST_DEFS) {
    const btn = document.createElement("button");
    btn.className = "upgrade-btn artist-btn";
    btn.id = "artist-" + def.id;

    const nameDiv = createElement("div", "upgrade-name");
    nameDiv.appendChild(document.createTextNode(def.name + " "));
    const costSpan = createElement("span", "upgrade-cost");
    nameDiv.appendChild(costSpan);

    const descDiv = createElement("div", "upgrade-desc");
    descDiv.textContent = `${def.desc} — ${formatNumber(def.baseRate)} Strokes/sec each`;

    const countDiv = createElement("div", "artist-count");
    const prodDiv = createElement("div", "artist-production");

    btn.appendChild(nameDiv);
    btn.appendChild(descDiv);
    btn.appendChild(countDiv);
    btn.appendChild(prodDiv);
    btn.addEventListener("click", () => buyArtist(def));
    list.appendChild(btn);

    map.set(def.id, {
      btn: btn as HTMLButtonElement,
      cost: costSpan,
      count: countDiv,
      prod: prodDiv,
    });
  }

  return map;
}

function initSwords(): Map<string, SwordElements> {
  const gallery = document.getElementById("sword-gallery")!;
  const map = new Map<string, SwordElements>();

  for (const sword of SWORD_DEFS) {
    const el = createElement("div", "sword-entry locked");
    const nameEl = createElement("div", "sword-name");
    const descEl = createElement("div", "sword-desc");
    const bonusEl = createElement("div", "sword-bonus");

    el.appendChild(nameEl);
    el.appendChild(descEl);
    el.appendChild(bonusEl);
    gallery.appendChild(el);

    map.set(sword.id, { el, name: nameEl, desc: descEl, bonus: bonusEl });
  }

  return map;
}

function initAchievements(): Map<string, AchievementElements> {
  const list = document.getElementById("achievements-list")!;
  const map = new Map<string, AchievementElements>();

  for (const ach of ACHIEVEMENT_DEFS) {
    const el = createElement("div", "achievement-entry locked");
    const nameEl = createElement("div", "achievement-name");
    const descEl = createElement("div", "achievement-desc");

    el.appendChild(nameEl);
    el.appendChild(descEl);
    list.appendChild(el);

    map.set(ach.id, { el, name: nameEl, desc: descEl });
  }

  return map;
}

function initPrestigeUpgrades(): Map<string, PrestigeUpgradeElements> {
  const list = document.getElementById("prestige-upgrades-list")!;
  const map = new Map<string, PrestigeUpgradeElements>();

  for (const def of PRESTIGE_UPGRADE_DEFS) {
    const btn = document.createElement("button");
    btn.className = "upgrade-btn prestige-upgrade-btn";

    const nameDiv = createElement("div", "upgrade-name");
    nameDiv.appendChild(document.createTextNode(def.name + " "));
    const costSpan = createElement("span", "upgrade-cost");
    nameDiv.appendChild(costSpan);

    const descDiv = createElement("div", "upgrade-desc");
    descDiv.textContent = def.desc;

    const ownedDiv = createElement("div", "upgrade-owned");

    btn.appendChild(nameDiv);
    btn.appendChild(descDiv);
    btn.appendChild(ownedDiv);
    btn.addEventListener("click", () => buyPrestigeUpgrade(def));
    list.appendChild(btn);

    map.set(def.id, {
      btn: btn as HTMLButtonElement,
      cost: costSpan,
      owned: ownedDiv,
    });
  }

  return map;
}

function initBreakdown(): BreakdownElements {
  const container = document.getElementById("production-breakdown")!;
  const empty = createElement("div", "breakdown-empty");
  empty.textContent = "Hire artists to generate passive Strokes!";
  container.appendChild(empty);

  const lines = new Map<string, HTMLElement>();
  for (const def of ARTIST_DEFS) {
    const line = createElement("div", "breakdown-line");
    line.style.display = "none";
    container.appendChild(line);
    lines.set(def.id, line);
  }

  return { container, empty, lines };
}

function renderBreakdown(state: GameState): void {
  const mult = getTotalMultiplier();
  let hasAny = false;

  for (const def of ARTIST_DEFS) {
    const owned = state.artists[def.id] ?? 0;
    const line = dom.breakdown.lines.get(def.id)!;
    if (owned > 0) {
      hasAny = true;
      const prod = def.baseRate * owned * mult;
      line.textContent = `${def.name} (${owned}): ${formatNumber(prod)}/sec`;
      line.style.display = "";
    } else {
      line.style.display = "none";
    }
  }

  dom.breakdown.empty.style.display = hasAny ? "none" : "";
}
