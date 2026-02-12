// Sword Art Click — Type definitions

export interface UpgradeEffect {
  type: "click" | "passive";
  value: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  effect: UpgradeEffect;
}

export interface MediaTier {
  id: string;
  name: string;
  multiplier: number;
  cost: number;
  desc: string;
}

export interface SwordDef {
  id: string;
  name: string;
  desc: string;
  threshold: number;
  bonus: number;
}

export interface ArtistDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  baseRate: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (s: GameState) => boolean;
}

export interface PrestigeUpgradeDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  maxLevel: number;
}

export interface GameState {
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
  // UI state (previously in closures)
  prestigeConfirming: boolean;
  prestigeConfirmTimer: number;
  resetConfirming: boolean;
  resetConfirmTimer: number;
}
