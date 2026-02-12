// Sword Art Click — Pure helper functions

import type { ArtistDef, PrestigeUpgradeDef, UpgradeDef } from "./types.ts";
import {
  ARTIST_COST_SCALE,
  COST_SCALE,
  MEDIA_TIERS,
  MAX_OFFLINE_HOURS,
  PRESTIGE_THRESHOLD,
  SWORD_DEFS,
} from "./data.ts";
import { state } from "./state.ts";

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

export function getMediaMultiplier(): number {
  return MEDIA_TIERS[state.mediaTier]!.multiplier;
}

export function getSwordBonus(): number {
  let bonus = 0;
  for (const swordId of state.unlockedSwords) {
    const def = SWORD_DEFS.find((s) => s.id === swordId);
    if (def) bonus += def.bonus;
  }
  return bonus;
}

export function getPrestigeBonus(id: string): number {
  return state.prestigeUpgrades[id] ?? 0;
}

export function getTotalMultiplier(): number {
  const mediaMultiplier = getMediaMultiplier();
  const swordBonus = 1 + getSwordBonus() / 100;
  const speedSketchBonus = 1 + getPrestigeBonus("speedSketch") * 0.5;
  return mediaMultiplier * swordBonus * speedSketchBonus;
}

export function getEffectiveClickPower(): number {
  const muscleMemoryBonus = 1 + getPrestigeBonus("muscleMemory") * 0.1;
  return state.clickPower * getTotalMultiplier() * muscleMemoryBonus;
}

export function getEffectivePassiveRate(): number {
  const artSchoolBonus = 1 + getPrestigeBonus("artSchool") * 0.25;
  return state.passiveRate * getTotalMultiplier() * artSchoolBonus;
}

// --- Cost calculation ---

export function getUpgradeCost(def: UpgradeDef): number {
  const owned = state.upgrades[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(COST_SCALE, owned));
}

export function getArtistCost(def: ArtistDef): number {
  const owned = state.artists[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(ARTIST_COST_SCALE, owned));
}

export function getArtistProduction(def: ArtistDef): number {
  const owned = state.artists[def.id] ?? 0;
  return def.baseRate * owned * getTotalMultiplier();
}

export function getPrestigeUpgradeCost(def: PrestigeUpgradeDef): number {
  const owned = state.prestigeUpgrades[def.id] ?? 0;
  return Math.floor(def.baseCost * Math.pow(1.5, owned));
}

// --- Prestige helpers ---

export function calculateErasurePoints(totalStrokes: number): number {
  return Math.floor(Math.sqrt(totalStrokes / 1_000_000));
}

export function canPrestige(): boolean {
  return state.totalStrokes >= PRESTIGE_THRESHOLD;
}

// --- Offline progress ---

export function calculateOfflineProgress(elapsedMs: number): number {
  const maxMs = MAX_OFFLINE_HOURS * 60 * 60 * 1000;
  const cappedMs = Math.min(elapsedMs, maxMs);
  const seconds = cappedMs / 1000;
  return getEffectivePassiveRate() * seconds;
}
