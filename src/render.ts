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
  status: HTMLElement;
  desc: HTMLElement;
  bonus: HTMLElement;
}

interface AchievementElements {
  el: HTMLElement;
  name: HTMLElement;
  status: HTMLElement;
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
  game: HTMLElement;
  // Stats
  strokesCount: HTMLElement;
  perClick: HTMLElement;
  perSecond: HTMLElement;
  multiplier: HTMLElement;
  statsContainer: HTMLElement;
  strokesTile: HTMLElement;
  secondTile: HTMLElement;
  clickTile: HTMLElement;
  multiplierTile: HTMLElement;
  // Media
  mediaPanel: HTMLElement;
  drawBtn: HTMLButtonElement;
  currentMedia: HTMLElement;
  mediaBtn: HTMLButtonElement;
  mediaName: HTMLElement;
  mediaCost: HTMLElement;
  mediaDesc: HTMLElement;
  mediaNext: HTMLElement;
  // Production breakdown
  breakdown: BreakdownElements;
  // Upgrades
  upgrades: Map<string, UpgradeElements>;
  // Artists
  artists: Map<string, ArtistElements>;
  // Canvas
  canvasArea: HTMLElement;
  heroTitle: HTMLElement;
  heroStatus: HTMLElement;
  mediaHeading: HTMLElement;
  mediaPhaseTone: HTMLElement;
  upgradesHeading: HTMLElement;
  upgradesPhaseTone: HTMLElement;
  artistsHeading: HTMLElement;
  artistsPhaseTone: HTMLElement;
  galleryHeading: HTMLElement;
  galleryHeadingLabel: HTMLElement;
  galleryPhaseTone: HTMLElement;
  drawBtnLabel: HTMLElement;
  // Swords
  swords: Map<string, SwordElements>;
  // Achievements
  achievements: Map<string, AchievementElements>;
  achievementCounter: HTMLElement;
  // Prestige
  prestigeStats: HTMLElement;
  prestigePanel: HTMLElement;
  prestigePhaseBuild: HTMLElement;
  prestigePhaseQualify: HTMLElement;
  prestigePhaseConfirm: HTMLElement;
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
  drawerBackdrop: HTMLElement;
  drawerTitle: HTMLElement;
  drawerCloseBtn: HTMLButtonElement;
  tabEP: HTMLElement;
  tabProduction: HTMLElement;
  prestigeTabBtn: HTMLButtonElement;
  productionArtistPill: HTMLElement;
  productionTopPill: HTMLElement;
  // Collapsible state
  collapsed: Record<string, boolean>;
}

let dom: DOMCache;

type RunPhase = "early" | "mid" | "late";

interface PhaseContent {
  mediaHeading: string;
  mediaTone: string;
  upgradesHeading: string;
  upgradesTone: string;
  artistsHeading: string;
  artistsTone: string;
  galleryHeading: string;
  galleryTone: string;
  drawLabel: string;
  heroTitle: string;
}

const PHASE_CONTENT: Record<RunPhase, PhaseContent> = {
  early: {
    mediaHeading: "Sketchbook Desk",
    mediaTone: "Minimal tools. Build rhythm with deliberate strokes.",
    upgradesHeading: "Hand Techniques",
    upgradesTone: "Tighten fundamentals before scaling up.",
    artistsHeading: "Apprentices",
    artistsTone: "A few helping hands keep the ink flowing.",
    galleryHeading: "Sword Sketches",
    galleryTone: "New blades appear as your total Strokes climb.",
    drawLabel: "Draw!",
    heroTitle: "Blank Forge",
  },
  mid: {
    mediaHeading: "Production Workshop",
    mediaTone: "The floor is busy. Throughput matters now.",
    upgradesHeading: "Tooling Line",
    upgradesTone: "Tune click power and flow for consistent output.",
    artistsHeading: "Workshop Crew",
    artistsTone: "Specialists keep production steady between clicks.",
    galleryHeading: "Workshop Armory",
    galleryTone: "Milestones now unlock faster, heavier designs.",
    drawLabel: "Forge Stroke",
    heroTitle: "Active Forge",
  },
  late: {
    mediaHeading: "Ascension Atelier",
    mediaTone: "The run bends toward ritual and transcendence.",
    upgradesHeading: "Ritual Instruments",
    upgradesTone: "Every upgrade sharpens the final ascent.",
    artistsHeading: "Ritual Circle",
    artistsTone: "Your crew sustains the chant of production.",
    galleryHeading: "Relic Archive",
    galleryTone: "Legendary forms gather before ascension.",
    drawLabel: "Invoke Stroke",
    heroTitle: "Ascendant Sigil",
  },
};

// Track previous state to avoid unnecessary DOM writes for lists
let prevMediaTier = -1;
let prevCanvasMediaClass = "";
let prevPhase: RunPhase | null = null;
let prevSwordCount = -1;
let prevAchievementCount = -1;
let prevUnlockedAchievements = new Set<string>();
let achievementsInitialized = false;
let prevTotalClicks = -1;
let prevHeroSwordCount = -1;
let prevHeroAchievementCount = -1;
let prevCanPrestige = false;
let prevPrestigeCount = -1;
let heroActiveUntil = 0;
let heroMilestoneUntil = 0;
let prevHeroActiveClass = false;
let prevHeroMilestoneClass = false;
let prevHeroAscensionClass = false;
let prevPerClickValue = -1;
let prevPerSecondValue = -1;
let prevMultValue = -1;
let prevShowMultiplier: boolean | null = null;
let statStrokesCueUntil = 0;
let statClickCueUntil = 0;
let statSecondCueUntil = 0;
let statMultCueUntil = 0;
let statClickCueDir: "up" | "down" = "up";
let statSecondCueDir: "up" | "down" = "up";
let statMultCueDir: "up" | "down" = "up";
let statStrokesAccum = 0;
let statClickAccum = 0;
let statSecondAccum = 0;
let statMultAccum = 0;
let statStrokesMergeUntil = 0;
let statClickMergeUntil = 0;
let statSecondMergeUntil = 0;
let statMultMergeUntil = 0;

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
    game: document.getElementById("game")!,
    strokesCount: document.getElementById("strokes-count")!,
    perClick: document.getElementById("per-click")!,
    perSecond: document.getElementById("per-second")!,
    multiplier: document.getElementById("multiplier-display")!,
    statsContainer: document.getElementById("stats")!,
    strokesTile: document.getElementById("stat-strokes-tile")!,
    secondTile: document.getElementById("stat-second-tile")!,
    clickTile: document.getElementById("stat-click-tile")!,
    multiplierTile: document.getElementById("stat-multiplier")!,
    mediaPanel: document.getElementById("media-panel")!,
    drawBtn: document.getElementById("draw-btn")! as HTMLButtonElement,
    currentMedia: document.getElementById("current-media")!,
    mediaBtn: document.getElementById(
      "media-upgrade-btn",
    )! as HTMLButtonElement,
    mediaName: createElement("div", "upgrade-name"),
    mediaCost: createElement("span", "upgrade-cost"),
    mediaDesc: createElement("div", "upgrade-desc"),
    mediaNext: createElement("div", "upgrade-tag media-next"),
    breakdown: initBreakdown(),
    upgrades: initUpgrades(),
    artists: initArtists(),
    canvasArea: document.getElementById("canvas-area")!,
    heroTitle: document.getElementById("hero-title")!,
    heroStatus: document.getElementById("hero-status")!,
    mediaHeading: document.getElementById("media-heading")!,
    mediaPhaseTone: document.getElementById("media-phase-tone")!,
    upgradesHeading: document.getElementById("upgrades-heading")!,
    upgradesPhaseTone: document.getElementById("upgrades-phase-tone")!,
    artistsHeading: document.getElementById("artists-heading")!,
    artistsPhaseTone: document.getElementById("artists-phase-tone")!,
    galleryHeading: document.getElementById("gallery-heading")!,
    galleryHeadingLabel: document.getElementById("gallery-heading-label")!,
    galleryPhaseTone: document.getElementById("gallery-phase-tone")!,
    drawBtnLabel: document.getElementById("draw-btn-label")!,
    swords: initSwords(),
    achievements: initAchievements(),
    achievementCounter: document.getElementById("achievement-counter")!,
    prestigeStats: document.getElementById("prestige-stats")!,
    prestigePanel: document.getElementById("prestige-panel")!,
    prestigePhaseBuild: document.getElementById("prestige-phase-build")!,
    prestigePhaseQualify: document.getElementById("prestige-phase-qualify")!,
    prestigePhaseConfirm: document.getElementById("prestige-phase-confirm")!,
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
    drawerBackdrop: document.getElementById("drawer-backdrop")!,
    drawerTitle: document.getElementById("drawer-title")!,
    drawerCloseBtn: document.getElementById(
      "drawer-close-btn",
    )! as HTMLButtonElement,
    tabEP: document.getElementById("tab-ep")!,
    tabProduction: document.getElementById("tab-production")!,
    prestigeTabBtn: document.querySelector<HTMLButtonElement>(
      '.tab-btn[data-drawer="prestige"]',
    )!,
    productionArtistPill: document.getElementById("production-artist-pill")!,
    productionTopPill: document.getElementById("production-top-pill")!,
    collapsed,
  };

  // Assemble media button (stable sub-elements, never re-created)
  const mediaMeta = createElement("div", "upgrade-meta");
  mediaMeta.appendChild(dom.mediaNext);
  dom.mediaName.appendChild(dom.mediaCost);
  dom.mediaBtn.appendChild(dom.mediaName);
  dom.mediaBtn.appendChild(dom.mediaDesc);
  dom.mediaBtn.appendChild(mediaMeta);

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
  const drawerTitles: Record<string, string> = {
    production: "Production",
    achievements: "Achievements",
    prestige: "Ascension",
    settings: "Settings",
  };

  const closeDrawer = () => {
    activeDrawer = null;
    dom.drawer.classList.add("drawer-closed");
    for (const b of tabBtns) b.classList.remove("active");
    for (const p of drawerPanels) p.classList.remove("active");
  };

  const openDrawer = (target: string) => {
    activeDrawer = target;
    dom.drawer.classList.remove("drawer-closed");
    dom.drawerTitle.textContent = drawerTitles[target] ?? "Panel";
    for (const b of tabBtns) b.classList.remove("active");
    const activeTab = tabBtns.find((b) => b.dataset.drawer === target);
    activeTab?.classList.add("active");
    for (const p of drawerPanels)
      p.classList.toggle("active", p.id === `drawer-${target}`);
  };

  for (const btn of tabBtns) {
    btn.addEventListener("click", () => {
      const target = btn.dataset.drawer!;
      if (activeDrawer === target) {
        closeDrawer();
      } else {
        openDrawer(target);
      }
    });
  }

  dom.drawerCloseBtn.addEventListener("click", closeDrawer);
  dom.drawerBackdrop.addEventListener("click", closeDrawer);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && activeDrawer) closeDrawer();
  });

  // Force initial render of lists that depend on tracking previous state
  prevMediaTier = -1;
  prevCanvasMediaClass = "";
  prevPhase = null;
  prevSwordCount = -1;
  prevAchievementCount = -1;
  prevUnlockedAchievements = new Set<string>();
  achievementsInitialized = false;
  prevTotalClicks = -1;
  prevHeroSwordCount = -1;
  prevHeroAchievementCount = -1;
  prevCanPrestige = false;
  prevPrestigeCount = -1;
  heroActiveUntil = 0;
  heroMilestoneUntil = 0;
  prevHeroActiveClass = false;
  prevHeroMilestoneClass = false;
  prevHeroAscensionClass = false;
  prevPerClickValue = -1;
  prevPerSecondValue = -1;
  prevMultValue = -1;
  prevShowMultiplier = null;
  statStrokesCueUntil = 0;
  statClickCueUntil = 0;
  statSecondCueUntil = 0;
  statMultCueUntil = 0;
  statClickCueDir = "up";
  statSecondCueDir = "up";
  statMultCueDir = "up";
  statStrokesAccum = 0;
  statClickAccum = 0;
  statSecondAccum = 0;
  statMultAccum = 0;
  statStrokesMergeUntil = 0;
  statClickMergeUntil = 0;
  statSecondMergeUntil = 0;
  statMultMergeUntil = 0;
}

// --- Render: pure function of state, writes to DOM, never reads ---

export function render(state: GameState): void {
  const now = performance.now();
  const clickDelta = prevTotalClicks < 0 ? 0 : state.totalClicks - prevTotalClicks;
  const canAscend = canPrestige(state);
  const phase = detectRunPhase(state, canAscend);
  if (phase !== prevPhase) {
    applyPhaseClasses(phase);
    applyPhaseCopy(phase);
    dom.game.dataset.runPhase = phase;
    prevPhase = phase;
  }

  // Stats bar
  const perClickValue = getEffectiveClickPower(state);
  const perSecondValue = getEffectivePassiveRate(state);
  dom.strokesCount.textContent = formatNumber(state.strokes);
  dom.perClick.textContent = formatNumber(perClickValue);
  dom.perSecond.textContent = formatNumber(perSecondValue);

  const mult = getTotalMultiplier(state);
  const showMultiplier = mult > 1;
  dom.multiplier.textContent = mult > 1 ? `${mult.toFixed(1)}x` : "";
  dom.multiplierTile.style.display = showMultiplier ? "" : "none";
  if (prevShowMultiplier === null || prevShowMultiplier !== showMultiplier) {
    orderStatTiles(showMultiplier);
    prevShowMultiplier = showMultiplier;
  }
  if (clickDelta > 0) {
    statStrokesCueUntil = now + 380;
    const delta = perClickValue * clickDelta;
    statStrokesAccum = accumulateDelta(
      statStrokesAccum,
      delta,
      now,
      statStrokesMergeUntil,
    );
    statStrokesMergeUntil = now + 260;
    dom.strokesTile.dataset.delta = formatDeltaValue(statStrokesAccum);
    restartStatCueBurst(dom.strokesTile);
  }
  if (prevPerClickValue >= 0 && perClickValue !== prevPerClickValue) {
    statClickCueUntil = now + 620;
    const delta = perClickValue - prevPerClickValue;
    statClickAccum = accumulateDelta(statClickAccum, delta, now, statClickMergeUntil);
    statClickMergeUntil = now + 260;
    statClickCueDir = statClickAccum >= 0 ? "up" : "down";
    dom.clickTile.dataset.delta = formatDeltaValue(statClickAccum);
    restartStatCueBurst(dom.clickTile);
  }
  if (prevPerSecondValue >= 0 && perSecondValue !== prevPerSecondValue) {
    statSecondCueUntil = now + 620;
    const delta = perSecondValue - prevPerSecondValue;
    statSecondAccum = accumulateDelta(
      statSecondAccum,
      delta,
      now,
      statSecondMergeUntil,
    );
    statSecondMergeUntil = now + 260;
    statSecondCueDir = statSecondAccum >= 0 ? "up" : "down";
    dom.secondTile.dataset.delta = formatDeltaValue(statSecondAccum);
    restartStatCueBurst(dom.secondTile);
  }
  if (prevMultValue >= 0 && mult !== prevMultValue) {
    statMultCueUntil = now + 620;
    const delta = mult - prevMultValue;
    statMultAccum = accumulateDelta(statMultAccum, delta, now, statMultMergeUntil);
    statMultMergeUntil = now + 260;
    statMultCueDir = statMultAccum >= 0 ? "up" : "down";
    dom.multiplierTile.dataset.delta =
      `${statMultAccum > 0 ? "+" : ""}${statMultAccum.toFixed(1)}x`;
    restartStatCueBurst(dom.multiplierTile);
  }
  applyStatCue(dom.strokesTile, now < statStrokesCueUntil, "up");
  applyStatCue(dom.clickTile, now < statClickCueUntil, statClickCueDir);
  applyStatCue(dom.secondTile, now < statSecondCueUntil, statSecondCueDir);
  applyStatCue(dom.multiplierTile, now < statMultCueUntil, statMultCueDir);
  prevPerClickValue = perClickValue;
  prevPerSecondValue = perSecondValue;
  prevMultValue = mult;

  // Media panel
  const tier = MEDIA_TIERS[state.mediaTier]!;
  dom.currentMedia.textContent = `${tier.name} (${tier.multiplier}x)`;

  const nextTierIdx = state.mediaTier + 1;
  if (nextTierIdx >= MEDIA_TIERS.length) {
    dom.mediaBtn.disabled = true;
    dom.mediaPanel.classList.add("media-maxed");
    dom.drawBtn.classList.add("draw-focus-maxed");
    if (prevMediaTier !== state.mediaTier) {
      dom.mediaName.textContent = "Max tier reached";
      dom.mediaDesc.textContent = "";
      dom.mediaCost.textContent = "";
      dom.mediaNext.textContent = "Maxed";
    }
  } else {
    const nextTier = MEDIA_TIERS[nextTierIdx]!;
    dom.mediaPanel.classList.remove("media-maxed");
    dom.drawBtn.classList.remove("draw-focus-maxed");
    dom.mediaBtn.disabled = state.strokes < nextTier.cost;
    if (prevMediaTier !== state.mediaTier) {
      // Only rebuild text when tier changes
      dom.mediaName.childNodes[0]!.textContent = nextTier.name + " ";
      dom.mediaCost.textContent = formatNumber(nextTier.cost) + " Strokes";
      dom.mediaDesc.textContent = nextTier.desc;
      dom.mediaNext.textContent = `Next ${nextTier.multiplier}x`;
    }
  }
  // Canvas area theming — update when tier changes
  if (prevMediaTier !== state.mediaTier) {
    const mediaClass = `canvas-${tier.id}`;
    if (prevCanvasMediaClass) dom.canvasArea.classList.remove(prevCanvasMediaClass);
    dom.canvasArea.classList.add(mediaClass);
    prevCanvasMediaClass = mediaClass;
    heroMilestoneUntil = performance.now() + 1_800;
  }
  prevMediaTier = state.mediaTier;

  // Click upgrades
  const historicalStrokes = state.lifetimeStrokes + state.totalStrokes;
  let visibleUpgradeCount = 0;
  let nextUpgradeEls: UpgradeElements | null = null;
  let nextUpgradeScore = -1;
  for (const def of UPGRADE_DEFS) {
    const els = dom.upgrades.get(def.id)!;
    const cost = getUpgradeCost(def, state);
    const owned = state.upgrades[def.id] ?? 0;
    const isVisible = shouldShowProgressiveOption(
      cost,
      state.strokes,
      historicalStrokes,
      owned,
    );
    els.btn.classList.toggle("is-hidden-by-progression", !isVisible);
    if (isVisible) visibleUpgradeCount++;
    const progressScore = state.strokes / Math.max(1, cost);
    if (progressScore > nextUpgradeScore) {
      nextUpgradeScore = progressScore;
      nextUpgradeEls = els;
    }
    els.btn.disabled = state.strokes < cost;
    els.cost.textContent = formatNumber(cost) + " Strokes";
    els.owned.textContent = `Owned ${owned}`;
  }
  if (visibleUpgradeCount === 0 && nextUpgradeEls) {
    nextUpgradeEls.btn.classList.remove("is-hidden-by-progression");
  }

  // Artists
  let visibleArtistCount = 0;
  let nextArtistEls: ArtistElements | null = null;
  let nextArtistScore = -1;
  for (const def of ARTIST_DEFS) {
    const els = dom.artists.get(def.id)!;
    const cost = getArtistCost(def, state);
    const owned = state.artists[def.id] ?? 0;
    const isVisible = shouldShowProgressiveOption(
      cost,
      state.strokes,
      historicalStrokes,
      owned,
    );
    els.btn.classList.toggle("is-hidden-by-progression", !isVisible);
    if (isVisible) visibleArtistCount++;
    const progressScore = state.strokes / Math.max(1, cost);
    if (progressScore > nextArtistScore) {
      nextArtistScore = progressScore;
      nextArtistEls = els;
    }
    els.btn.disabled = state.strokes < cost;
    els.cost.textContent = formatNumber(cost) + " Strokes";
    els.count.textContent = owned > 0 ? `Owned: ${owned}` : "";
    const prod = getArtistProduction(def, state);
    els.prod.textContent =
      owned > 0 ? `Producing: ${formatNumber(prod)}/sec` : "";
  }
  if (visibleArtistCount === 0 && nextArtistEls) {
    nextArtistEls.btn.classList.remove("is-hidden-by-progression");
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
        els.status.textContent = "Collected";
        els.desc.textContent = sword.desc;
        els.bonus.textContent = `Passive bonus +${sword.bonus}% production`;
      } else {
        els.name.textContent = "???";
        els.status.textContent = "Milestone";
        els.desc.textContent =
          `Unlock at ${formatNumber(sword.threshold)} total Strokes`;
        els.bonus.textContent = `At unlock +${sword.bonus}% production`;
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
      const newlyUnlocked =
        unlocked &&
        achievementsInitialized &&
        !prevUnlockedAchievements.has(ach.id);
      els.el.className = `achievement-entry ${unlocked ? "unlocked" : "locked"}${newlyUnlocked ? " newly-unlocked" : ""}`;
      els.name.textContent = unlocked ? ach.name : "???";
      els.status.textContent = unlocked ? "Unlocked" : "Locked";
      els.desc.textContent = ach.desc;
    }
    dom.achievementCounter.textContent = `${currentAchCount}/${ACHIEVEMENT_DEFS.length}`;
    prevUnlockedAchievements = new Set(state.unlockedAchievements);
    achievementsInitialized = true;
    prevAchievementCount = currentAchCount;
  }

  if (clickDelta > 0) {
    heroActiveUntil = now + 420;
  }
  const unlockedMilestone =
    (prevHeroSwordCount >= 0 && currentSwordCount > prevHeroSwordCount) ||
    (prevHeroAchievementCount >= 0 && currentAchCount > prevHeroAchievementCount) ||
    (prevPrestigeCount >= 0 && state.prestigeCount > prevPrestigeCount) ||
    (!prevCanPrestige && canAscend);
  if (unlockedMilestone) {
    heroMilestoneUntil = now + 2_200;
  }
  const heroActiveClass = now < heroActiveUntil;
  const heroMilestoneClass = now < heroMilestoneUntil;
  const heroAscensionClass = canAscend;
  if (heroActiveClass !== prevHeroActiveClass) {
    dom.canvasArea.classList.toggle("hero-active", heroActiveClass);
    prevHeroActiveClass = heroActiveClass;
  }
  if (heroMilestoneClass !== prevHeroMilestoneClass) {
    dom.canvasArea.classList.toggle("hero-milestone", heroMilestoneClass);
    prevHeroMilestoneClass = heroMilestoneClass;
  }
  if (heroAscensionClass !== prevHeroAscensionClass) {
    dom.canvasArea.classList.toggle("hero-ascension-ready", heroAscensionClass);
    prevHeroAscensionClass = heroAscensionClass;
  }
  dom.heroStatus.textContent = getHeroStatus(state, canAscend);
  dom.drawBtnLabel.textContent = PHASE_CONTENT[phase].drawLabel;
  prevTotalClicks = state.totalClicks;
  prevHeroSwordCount = currentSwordCount;
  prevHeroAchievementCount = currentAchCount;
  prevCanPrestige = canAscend;
  prevPrestigeCount = state.prestigeCount;

  // Prestige stats
  dom.prestigeStats.innerHTML = [
    `Legacy Points: <strong>${state.erasurePoints}</strong>`,
    `Total Legacy earned: ${state.totalErasurePoints}`,
    `Ascensions: ${state.prestigeCount}`,
    `Lifetime Strokes: ${formatNumber(state.lifetimeStrokes + state.totalStrokes)}`,
  ].join("<br>");

  // Prestige button — state-driven, no closures
  if (state.prestigeConfirming) {
    const ep = calculateErasurePoints(state.totalStrokes);
    dom.prestigeBtnLabel.textContent = "Confirm Ascension";
    dom.prestigeBtnSub.textContent = `Begin a new run with +${ep} LP`;
    dom.prestigeBtn.disabled = false;
    dom.prestigeBtn.classList.add("confirming");
  } else {
    dom.prestigeBtn.classList.remove("confirming");
    dom.prestigeBtn.disabled = !canAscend;
    if (canAscend) {
      const ep = calculateErasurePoints(state.totalStrokes);
      dom.prestigeBtnLabel.textContent = "Ascend";
      dom.prestigeBtnSub.textContent = `Gain +${ep} Legacy Point${ep !== 1 ? "s" : ""}`;
    } else {
      dom.prestigeBtnLabel.textContent = "Ascend";
      dom.prestigeBtnSub.textContent = `Reach ${formatNumber(PRESTIGE_THRESHOLD)} total Strokes to unlock`;
    }
  }
  const prestigeState = state.prestigeConfirming
    ? "confirm"
    : canAscend
      ? "ready"
      : "locked";
  dom.prestigePanel.dataset.state = prestigeState;
  dom.prestigePhaseBuild.classList.toggle("is-active", prestigeState === "locked");
  dom.prestigePhaseBuild.classList.toggle(
    "is-complete",
    prestigeState !== "locked",
  );
  dom.prestigePhaseQualify.classList.toggle("is-active", prestigeState === "ready");
  dom.prestigePhaseQualify.classList.toggle(
    "is-complete",
    prestigeState === "confirm",
  );
  dom.prestigePhaseConfirm.classList.toggle(
    "is-active",
    prestigeState === "confirm",
  );

  // Prestige upgrades
  for (const def of PRESTIGE_UPGRADE_DEFS) {
    const els = dom.prestigeUpgrades.get(def.id)!;
    const owned = state.prestigeUpgrades[def.id] ?? 0;
    const maxed = owned >= def.maxLevel;
    const cost = getPrestigeUpgradeCost(def, state);
    els.btn.disabled = maxed || state.erasurePoints < cost;
    els.cost.textContent = maxed ? "MAX" : cost + " LP";
    els.owned.textContent =
      `Level ${owned}${def.maxLevel > 1 ? "/" + def.maxLevel : ""}`;
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
  dom.tabEP.textContent = `${state.erasurePoints} LP`;
  dom.prestigeTabBtn.classList.toggle("tab-ready", canAscend);
  const passiveRate = getEffectivePassiveRate(state);
  let activeArtistTypes = 0;
  let topArtistName = "none";
  let topArtistProd = 0;
  for (const def of ARTIST_DEFS) {
    const owned = state.artists[def.id] ?? 0;
    if (owned > 0) {
      activeArtistTypes++;
      const prod = getArtistProduction(def, state);
      if (prod > topArtistProd) {
        topArtistProd = prod;
        topArtistName = def.name;
      }
    }
  }
  dom.tabProduction.textContent = `${activeArtistTypes} active`;
  dom.productionArtistPill.textContent = `${activeArtistTypes} artist type${activeArtistTypes === 1 ? "" : "s"} active`;
  dom.productionTopPill.textContent =
    topArtistProd > 0
      ? `Top: ${topArtistName} (${formatNumber(topArtistProd)}/sec)`
      : "Top: none";
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

    const metaDiv = createElement("div", "upgrade-meta");
    const ownedDiv = createElement("div", "upgrade-owned upgrade-tag");

    btn.appendChild(nameDiv);
    btn.appendChild(descDiv);
    metaDiv.appendChild(ownedDiv);
    btn.appendChild(metaDiv);
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
    descDiv.textContent = def.desc;

    const metaDiv = createElement("div", "artist-meta");
    const rateDiv = createElement("div", "artist-rate");
    rateDiv.textContent = `Base ${formatNumber(def.baseRate)}/sec each`;

    const countDiv = createElement("div", "artist-count");
    const prodDiv = createElement("div", "artist-production");

    btn.appendChild(nameDiv);
    btn.appendChild(descDiv);
    metaDiv.appendChild(rateDiv);
    metaDiv.appendChild(countDiv);
    metaDiv.appendChild(prodDiv);
    btn.appendChild(metaDiv);
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
    const headEl = createElement("div", "sword-head");
    const nameEl = createElement("div", "sword-name");
    const statusEl = createElement("div", "sword-status");
    const descEl = createElement("div", "sword-desc");
    const bonusEl = createElement("div", "sword-bonus");

    headEl.appendChild(nameEl);
    headEl.appendChild(statusEl);
    el.appendChild(headEl);
    el.appendChild(descEl);
    el.appendChild(bonusEl);
    gallery.appendChild(el);

    map.set(sword.id, {
      el,
      name: nameEl,
      status: statusEl,
      desc: descEl,
      bonus: bonusEl,
    });
  }

  return map;
}

function initAchievements(): Map<string, AchievementElements> {
  const list = document.getElementById("achievements-list")!;
  const map = new Map<string, AchievementElements>();

  for (const ach of ACHIEVEMENT_DEFS) {
    const el = createElement("div", "achievement-entry locked");
    const headEl = createElement("div", "achievement-head");
    const nameEl = createElement("div", "achievement-name");
    const statusEl = createElement("div", "achievement-status");
    const descEl = createElement("div", "achievement-desc");

    headEl.appendChild(nameEl);
    headEl.appendChild(statusEl);
    el.appendChild(headEl);
    el.appendChild(descEl);
    list.appendChild(el);

    map.set(ach.id, { el, name: nameEl, status: statusEl, desc: descEl });
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

    const metaDiv = createElement("div", "upgrade-meta");
    const maxDiv = createElement("div", "upgrade-tag");
    maxDiv.textContent = `Max ${def.maxLevel}`;
    const ownedDiv = createElement("div", "upgrade-owned upgrade-tag");

    btn.appendChild(nameDiv);
    btn.appendChild(descDiv);
    metaDiv.appendChild(maxDiv);
    metaDiv.appendChild(ownedDiv);
    btn.appendChild(metaDiv);
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
  const mult = getTotalMultiplier(state);
  const totalRate = getEffectivePassiveRate(state);
  let hasAny = false;
  const rows: Array<{
    defId: string;
    name: string;
    owned: number;
    prod: number;
  }> = [];

  for (const def of ARTIST_DEFS) {
    const owned = state.artists[def.id] ?? 0;
    if (owned > 0) {
      hasAny = true;
      const prod = def.baseRate * owned * mult;
      rows.push({ defId: def.id, name: def.name, owned, prod });
    }
  }

  rows.sort((a, b) => b.prod - a.prod);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const line = dom.breakdown.lines.get(row.defId)!;
    const share = totalRate > 0 ? Math.round((row.prod / totalRate) * 100) : 0;
    line.style.setProperty("--share", `${Math.max(4, share)}%`);
    line.innerHTML = `<span class="breakdown-rank">#${i + 1}</span><span class="breakdown-name">${row.name}</span><span class="breakdown-owned">${row.owned} owned</span><span class="breakdown-share">${share}%</span><span class="breakdown-prod">${formatNumber(row.prod)}/sec</span><span class="breakdown-bar" aria-hidden="true"></span>`;
    line.style.display = "";
    dom.breakdown.container.appendChild(line);
  }
  for (const def of ARTIST_DEFS) {
    if (rows.some((r) => r.defId === def.id)) continue;
    const line = dom.breakdown.lines.get(def.id)!;
    line.style.display = "none";
  }

  dom.breakdown.empty.style.display = hasAny ? "none" : "";
}

function detectRunPhase(state: GameState, canAscend: boolean): RunPhase {
  const lateRun =
    canAscend ||
    state.prestigeCount > 0 ||
    state.mediaTier >= 4 ||
    state.totalStrokes >= 1_000_000;
  if (lateRun) return "late";

  const midRun =
    state.mediaTier >= 2 || state.totalStrokes >= 20_000 || state.totalClicks >= 250;
  if (midRun) return "mid";

  return "early";
}

function applyPhaseClasses(phase: RunPhase): void {
  document.body.classList.remove("run-phase-early", "run-phase-mid", "run-phase-late");
  document.body.classList.add(`run-phase-${phase}`);
}

function applyPhaseCopy(phase: RunPhase): void {
  const content = PHASE_CONTENT[phase];
  dom.mediaHeading.textContent = content.mediaHeading;
  dom.mediaPhaseTone.textContent = content.mediaTone;
  dom.upgradesHeading.textContent = content.upgradesHeading;
  dom.upgradesPhaseTone.textContent = content.upgradesTone;
  dom.artistsHeading.textContent = content.artistsHeading;
  dom.artistsPhaseTone.textContent = content.artistsTone;
  dom.galleryHeadingLabel.textContent = content.galleryHeading;
  dom.galleryPhaseTone.textContent = content.galleryTone;
  dom.heroTitle.textContent = content.heroTitle;
}

function getHeroStatus(state: GameState, canAscend: boolean): string {
  if (state.prestigeCount > 0) {
    return `Ascended ${state.prestigeCount} time${state.prestigeCount === 1 ? "" : "s"} · Legacy ${state.erasurePoints} LP`;
  }
  if (canAscend) {
    return "Ascension available. Seal this run and begin stronger.";
  }
  if (state.mediaTier >= 5) {
    return "Late-run pressure building. The sigil is almost complete.";
  }
  if (state.mediaTier >= 2) {
    return "Workshop cadence established. Keep the line moving.";
  }
  if (state.totalClicks > 0) {
    return "First drafts in motion. Every click leaves a mark.";
  }
  return "Awaiting your next stroke.";
}

function applyStatCue(
  tile: HTMLElement,
  active: boolean,
  dir: "up" | "down",
): void {
  tile.classList.toggle("stat-cue", active);
  tile.classList.toggle("stat-cue-up", active && dir === "up");
  tile.classList.toggle("stat-cue-down", active && dir === "down");
}

function restartStatCueBurst(tile: HTMLElement): void {
  tile.classList.remove("stat-cue-burst");
  void tile.offsetWidth;
  tile.classList.add("stat-cue-burst");
}

function accumulateDelta(
  current: number,
  delta: number,
  now: number,
  mergeUntil: number,
): number {
  return now <= mergeUntil ? current + delta : delta;
}

function formatDeltaValue(delta: number): string {
  return `${delta > 0 ? "+" : ""}${formatNumber(delta)}`;
}

function shouldShowProgressiveOption(
  cost: number,
  currentStrokes: number,
  historicalStrokes: number,
  owned: number,
): boolean {
  if (owned > 0) return true;
  const safeCost = Math.max(1, cost);
  const currentRatio = currentStrokes / safeCost;
  const historicalRatio = historicalStrokes / safeCost;
  const remaining = Math.max(0, cost - currentStrokes);
  const almostAffordable =
    currentRatio >= 0.72 || remaining <= Math.max(12, cost * 0.14);
  const known = historicalRatio >= 0.72;
  return almostAffordable || known;
}


function orderStatTiles(showMultiplier: boolean): void {
  // Keep critical stats in a stable left-to-right order.
  dom.statsContainer.appendChild(dom.strokesTile);
  dom.statsContainer.appendChild(dom.secondTile);
  dom.statsContainer.appendChild(dom.clickTile);
  if (showMultiplier) {
    dom.statsContainer.appendChild(dom.multiplierTile);
  }
}
