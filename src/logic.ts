// Sword Art Click — Game logic (all state-mutating functions)

import type { ArtistDef, PrestigeUpgradeDef, UpgradeDef } from "./types.ts";
import {
  ACHIEVEMENT_DEFS,
  ARTIST_DEFS,
  MAX_OFFLINE_HOURS,
  MEDIA_TIERS,
  SAVE_KEY,
  SWORD_DEFS,
  TICK_RATE,
  UPGRADE_DEFS,
} from "./data.ts";
import { createDefaultState, state, replaceState } from "./state.ts";
import {
  calculateErasurePoints,
  calculateOfflineProgress,
  canPrestige,
  formatNumber,
  getArtistCost,
  getEffectiveClickPower,
  getEffectivePassiveRate,
  getPrestigeBonus,
  getPrestigeUpgradeCost,
  getUpgradeCost,
} from "./helpers.ts";
import { playSound } from "./audio.ts";
import {
  showFloatingText,
  showNotification,
  triggerEraseAnimation,
  triggerShake,
} from "./effects.ts";

// --- Passive rate recalc ---

export function recalcPassiveRate(): void {
  state.passiveRate = 0;
  for (const def of ARTIST_DEFS) {
    const owned = state.artists[def.id] ?? 0;
    state.passiveRate += def.baseRate * owned;
  }
}

// --- Click handler ---

export function handleClick(x?: number, y?: number): void {
  const gain = getEffectiveClickPower(state);
  state.strokes += gain;
  state.totalStrokes += gain;
  state.totalClicks++;
  if (x !== undefined && y !== undefined) showFloatingText(gain, x, y);
  playSound("click");
  checkSwordUnlocks();
  checkAchievements();
}

// --- Tick (passive income) ---

export function tick(): void {
  if (state.passiveRate > 0) {
    const gain = getEffectivePassiveRate(state) * (TICK_RATE / 1000);
    state.strokes += gain;
    state.totalStrokes += gain;
    checkSwordUnlocks();
    checkAchievements();
  }
}

// --- Update (game loop step) ---

export function update(): void {
  tick();

  // Expire confirmation timers
  const now = Date.now();
  if (state.prestigeConfirming && now > state.prestigeConfirmTimer) {
    state.prestigeConfirming = false;
  }
  if (state.resetConfirming && now > state.resetConfirmTimer) {
    state.resetConfirming = false;
  }
}

// --- Upgrade purchase ---

export function buyUpgrade(def: UpgradeDef): void {
  const cost = getUpgradeCost(def, state);
  if (state.strokes < cost) return;

  state.strokes -= cost;
  state.upgrades[def.id] = (state.upgrades[def.id] ?? 0) + 1;

  if (def.effect.type === "click") {
    state.clickPower += def.effect.value;
  }

  playSound("purchase");
  saveGame();
}

// --- Artist purchase ---

export function buyArtist(def: ArtistDef): void {
  const cost = getArtistCost(def, state);
  if (state.strokes < cost) return;

  state.strokes -= cost;
  state.artists[def.id] = (state.artists[def.id] ?? 0) + 1;
  recalcPassiveRate();
  playSound("purchase");
  checkAchievements();
  saveGame();
}

// --- Media tier upgrade ---

export function buyMediaTier(): void {
  const nextTier = state.mediaTier + 1;
  if (nextTier >= MEDIA_TIERS.length) return;

  const tier = MEDIA_TIERS[nextTier]!;
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
}

// --- Sword unlock checking ---

export function checkSwordUnlocks(): void {
  for (const sword of SWORD_DEFS) {
    if (state.unlockedSwords.includes(sword.id)) continue;
    if (state.totalStrokes >= sword.threshold) {
      state.unlockedSwords.push(sword.id);
      showNotification(`Sword unlocked: ${sword.name}! "${sword.desc}"`);
      playSound("milestone");
      triggerShake();
    }
  }
}

// --- Achievement checking ---

export function checkAchievements(): void {
  for (const ach of ACHIEVEMENT_DEFS) {
    if (state.unlockedAchievements.includes(ach.id)) continue;
    if (ach.check(state)) {
      state.unlockedAchievements.push(ach.id);
      showNotification(`Achievement: ${ach.name}! — ${ach.desc}`);
      playSound("achievement");
    }
  }
}

// --- Prestige ---

export function requestPrestige(): void {
  if (!canPrestige(state)) return;
  if (state.prestigeConfirming) {
    state.prestigeConfirming = false;
    doPrestige();
  } else {
    state.prestigeConfirming = true;
    state.prestigeConfirmTimer = Date.now() + 4000;
  }
}

export function buyPrestigeUpgrade(def: PrestigeUpgradeDef): void {
  const owned = state.prestigeUpgrades[def.id] ?? 0;
  if (owned >= def.maxLevel) return;
  const cost = getPrestigeUpgradeCost(def, state);
  if (state.erasurePoints < cost) return;

  state.erasurePoints -= cost;
  state.prestigeUpgrades[def.id] = owned + 1;
  playSound("purchase");
  saveGame();
}

function doPrestige(): void {
  const epGained = calculateErasurePoints(state.totalStrokes);
  if (epGained <= 0) return;

  const preserved = {
    erasurePoints: state.erasurePoints + epGained,
    totalErasurePoints: state.totalErasurePoints + epGained,
    prestigeCount: state.prestigeCount + 1,
    prestigeUpgrades: { ...state.prestigeUpgrades },
    lifetimeStrokes: state.lifetimeStrokes + state.totalStrokes,
    unlockedAchievements: [...state.unlockedAchievements],
    playStartTime: state.playStartTime,
  };

  const keepSwords = getPrestigeBonus(state, "portfolio") >= 1;
  const preservedSwords = keepSwords
    ? [...state.unlockedSwords]
    : ["butterKnife"];

  const newState = createDefaultState();

  newState.erasurePoints = preserved.erasurePoints;
  newState.totalErasurePoints = preserved.totalErasurePoints;
  newState.prestigeCount = preserved.prestigeCount;
  newState.prestigeUpgrades = preserved.prestigeUpgrades;
  newState.lifetimeStrokes = preserved.lifetimeStrokes;
  newState.unlockedAchievements = preserved.unlockedAchievements;
  newState.playStartTime = preserved.playStartTime;
  newState.unlockedSwords = preservedSwords;

  if ((newState.prestigeUpgrades["betterPaper"] ?? 0) >= 1) {
    newState.mediaTier = 1;
  }
  if ((newState.prestigeUpgrades["inkReserves"] ?? 0) >= 1) {
    newState.mediaTier = 2;
  }

  const headStart = newState.prestigeUpgrades["sketchHeadStart"] ?? 0;
  if (headStart > 0) {
    newState.artists["doodler"] = headStart;
  }

  replaceState(newState);
  recalcPassiveRate();
  saveGame();
  triggerEraseAnimation();
  showNotification(
    `Erased & Redrawn! Gained ${epGained} Erasure Point${epGained !== 1 ? "s" : ""}. (Prestige #${state.prestigeCount})`,
  );
  playSound("milestone");
}

// --- Reset ---

export function requestReset(): void {
  if (state.resetConfirming) {
    state.resetConfirming = false;
    replaceState(createDefaultState());
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    saveGame();
    showNotification("Game reset! Starting fresh.");
  } else {
    state.resetConfirming = true;
    state.resetConfirmTimer = Date.now() + 3000;
  }
}

// --- Save / Load ---

export function saveGame(): void {
  state.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {}
}

export function loadGame(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Record<string, unknown> | null;
    if (!saved || typeof saved.strokes !== "number") return;

    const loaded = { ...createDefaultState(), ...saved };
    replaceState(loaded);

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

    recalcPassiveRate();

    // Migrate old passive upgrades
    const oldPassiveIds = ["artStudent", "sketchPad", "draftingTable"];
    let hadOldPassive = false;
    for (const oldId of oldPassiveIds) {
      if (state.upgrades[oldId] && state.upgrades[oldId] > 0) {
        hadOldPassive = true;
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
        const offlineGain = calculateOfflineProgress(state, elapsed);
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

export function exportSave(): string {
  saveGame();
  return btoa(JSON.stringify(state));
}

export function importSave(data: string): boolean {
  try {
    const parsed = JSON.parse(atob(data)) as Record<string, unknown>;
    if (typeof parsed.strokes !== "number") return false;
    const loaded = { ...createDefaultState(), ...parsed };
    replaceState(loaded);
    recalcPassiveRate();
    saveGame();
    showNotification("Save imported successfully!");
    return true;
  } catch {
    return false;
  }
}
