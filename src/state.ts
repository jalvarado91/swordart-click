// Sword Art Click — Game state

import type { GameState } from "./types.ts";

export function createDefaultState(): GameState {
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
    // UI state
    prestigeConfirming: false,
    prestigeConfirmTimer: 0,
    resetConfirming: false,
    resetConfirmTimer: 0,
  };
}

export let state: GameState = createDefaultState();

export function replaceState(newState: GameState): void {
  state = newState;
}
