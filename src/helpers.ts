// Sword Art Click — Pure helper functions
//
// All state-dependent functions take GameState as an explicit first parameter
// so they can be used both by the browser game (logic.ts, render.ts) and by
// headless tools (scripts/evaluate.ts) without importing the global singleton.

import type { ArtistDef, GameState, PrestigeUpgradeDef, UpgradeDef } from "./types.ts";
import {
  ARTIST_COST_SCALE,
  COST_SCALE,
  MEDIA_TIERS,
  MAX_OFFLINE_HOURS,
  PRESTIGE_THRESHOLD,
  SWORD_DEFS,
} from "./data.ts";

// --- Number formatting ---

export function formatNumber(n: number): string {
  if (n < 1_000) return Math.floor(n).toString();
  const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi"];
  const tier = Math.floor(Math.log10(Math.abs(n)) / 3);
  if (tier === 0) return Math.floor(n).toLocaleString();
  const suffix = suffixes[tier] ?? `e${tier * 3}`;
  const scale = Math.pow(10, tier * 3);
  const scaled = n / scale;
  return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + suffix;
}

// --- Multiplier calculation ---

function getMediaMultiplier(s: GameState): number {
  return MEDIA_TIERS[s.mediaTier]!.multiplier;
}

export function getSwordBonus(s: GameState): number {
  let bonus = 0;
  for (const swordId of s.unlockedSwords) {
    const def = SWORD_DEFS.find((d) => d.id === swordId);
    if (def) bonus += def.bonus;
  }
  return bonus;
}

export function getPrestigeBonus(s: GameState, id: string): number {
  return s.prestigeUpgrades[id] ?? 0;
}

export function getTotalMultiplier(s: GameState): number {
  const mediaMultiplier = getMediaMultiplier(s);
  const swordBonus = 1 + getSwordBonus(s) / 100;
  const speedSketchBonus = 1 + getPrestigeBonus(s, "speedSketch") * 0.5;
  const sharpEyeBonus = 1 + getPrestigeBonus(s, "sharpEye") * 0.05;
  return mediaMultiplier * swordBonus * speedSketchBonus * sharpEyeBonus;
}

export function getEffectiveClickPower(s: GameState): number {
  const muscleMemoryBonus = 1 + getPrestigeBonus(s, "muscleMemory") * 0.1;
  const steadyHandBonus = 1 + getPrestigeBonus(s, "steadyHand") * 0.05;
  return s.clickPower * getTotalMultiplier(s) * muscleMemoryBonus * steadyHandBonus;
}

export function getEffectivePassiveRate(s: GameState): number {
  const artSchoolBonus = 1 + getPrestigeBonus(s, "artSchool") * 0.25;
  return s.passiveRate * getTotalMultiplier(s) * artSchoolBonus;
}

// --- Cost calculation ---

export function getUpgradeCost(def: UpgradeDef, s: GameState): number {
  const owned = s.upgrades[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(COST_SCALE, owned));
}

export function getArtistCost(def: ArtistDef, s: GameState): number {
  const owned = s.artists[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(ARTIST_COST_SCALE, owned));
}

export function getArtistProduction(def: ArtistDef, s: GameState): number {
  const owned = s.artists[def.id] ?? 0;
  return def.baseRate * owned * getTotalMultiplier(s);
}

export function getPrestigeUpgradeCost(def: PrestigeUpgradeDef, s: GameState): number {
  const owned = s.prestigeUpgrades[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(1.5, owned));
}

// --- Prestige helpers ---

export function calculateErasurePoints(totalStrokes: number): number {
  return Math.floor(Math.sqrt(totalStrokes / 1_000_000));
}

export function canPrestige(s: GameState): boolean {
  return s.totalStrokes >= PRESTIGE_THRESHOLD;
}

// --- Offline progress ---

export function calculateOfflineProgress(s: GameState, elapsedMs: number): number {
  const maxMs = MAX_OFFLINE_HOURS * 60 * 60 * 1000;
  const cappedMs = Math.min(elapsedMs, maxMs);
  const seconds = cappedMs / 1000;
  return getEffectivePassiveRate(s) * seconds;
}
