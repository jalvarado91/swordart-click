#!/usr/bin/env bun
// Sword Art Click — Headless Game Evaluation
//
// Simulates the game without a browser and produces a detailed progression
// report. Useful for evaluating pacing, balance, and game feel as an agent.
//
// Usage:
//   bun scripts/evaluate.ts
//   bun scripts/evaluate.ts --minutes 90 --strategy optimal --clicks 3
//   bun scripts/evaluate.ts --minutes 30 --strategy idle
//   bun scripts/evaluate.ts --minutes 120 --strategy cheapest --prestiges 2

import type { GameState } from "../src/types.ts";
import {
  ACHIEVEMENT_DEFS,
  ARTIST_DEFS,
  MEDIA_TIERS,
  PRESTIGE_THRESHOLD,
  PRESTIGE_UPGRADE_DEFS,
  SWORD_DEFS,
  UPGRADE_DEFS,
} from "../src/data.ts";
import {
  calculateErasurePoints,
  getArtistCost,
  getEffectiveClickPower,
  getEffectivePassiveRate,
  getTotalMultiplier,
  getUpgradeCost,
} from "../src/helpers.ts";

// ─── CLI Args ─────────────────────────────────────────────────────────────────

// Bun runtime global — not in tsconfig lib since the project targets browsers
declare const Bun: { argv: string[] };
const args = Bun.argv.slice(2);
function getArg(flag: string, fallback: string): string {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? (args[idx + 1] as string) : fallback;
}

const DURATION_MINUTES = Number(getArg("--minutes", "60"));
const STRATEGY = getArg("--strategy", "optimal") as Strategy;
const CLICKS_PER_SEC = Number(getArg("--clicks", "3"));
const MAX_PRESTIGES = Number(getArg("--prestiges", "1"));

// ─── Types ────────────────────────────────────────────────────────────────────

type Strategy = "optimal" | "cheapest" | "idle" | "human";
type RunPhase = "early" | "mid" | "late";
type PurchaseType = "upgrade" | "artist" | "media";

interface Candidate {
  type: PurchaseType;
  id: string;
  name: string;
  cost: number;
  roi: number; // additional strokes/sec gained per stroke spent
}

interface SimEvent {
  simTime: number;
  tag: string;
  label: string;
  detail?: string;
}

interface Snapshot {
  time: number;
  strokes: number;
  clickPower: number;
  effectiveClickPower: number;
  passiveRate: number;
  effectivePassiveRate: number;
  totalIncome: number;
  passiveFraction: number;
  mediaTier: number;
  artistCount: number;
  phase: RunPhase;
  prestigeCount: number;
}

interface DeadZone {
  start: number;
  end: number;
  waitingFor: string;
}

interface SimResult {
  events: SimEvent[];
  snapshots: Snapshot[];
  deadZones: DeadZone[];
  finalState: GameState;
  durationSecs: number;
  totalDecisionMoments: number;
  totalCloseCallMoments: number;
  totalPurchases: number;
  prestigeTimes: number[];
}

const CLOSE_CALL_ROI_DELTA = 0.15;
const HUMAN_REACTION_DELAY_MIN = 0.35;
const HUMAN_REACTION_DELAY_MAX = 1.2;

// ─── State Management ─────────────────────────────────────────────────────────

function createState(): GameState {
  const now = Date.now();
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
    lastSave: now,
    playStartTime: now,
    erasurePoints: 0,
    totalErasurePoints: 0,
    prestigeCount: 0,
    prestigeUpgrades: {},
    lifetimeStrokes: 0,
    prestigeConfirming: false,
    prestigeConfirmTimer: 0,
    resetConfirming: false,
    resetConfirmTimer: 0,
  };
}

// ─── Simulation-specific helpers ──────────────────────────────────────────────
// Core math (getTotalMultiplier, getEffectiveClickPower, etc.) is imported from
// src/helpers.ts — no duplication.

function totalIncomeRate(s: GameState, cps: number): number {
  return getEffectivePassiveRate(s) + getEffectiveClickPower(s) * cps;
}

function passiveFraction(s: GameState, cps: number): number {
  const total = totalIncomeRate(s, cps);
  if (total === 0) return 0;
  return getEffectivePassiveRate(s) / total;
}

function getRunPhase(s: GameState): RunPhase {
  const isLate =
    s.totalStrokes >= PRESTIGE_THRESHOLD ||
    s.mediaTier >= 4 ||
    s.totalStrokes >= 1_000_000 ||
    s.prestigeCount > 0;
  if (isLate) return "late";
  const isMid =
    s.totalStrokes >= 20_000 || s.totalClicks >= 250 || s.mediaTier >= 2;
  return isMid ? "mid" : "early";
}

function totalArtists(s: GameState): number {
  return Object.values(s.artists).reduce((a, b) => a + b, 0);
}

function createDeterministicRng(seed = 0x5eed1234): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function getCpsForStrategy(strategy: Strategy, simTime: number): number {
  if (strategy === "idle") return 0.5;
  const base = CLICKS_PER_SEC > 0 ? CLICKS_PER_SEC : 3;
  if (strategy === "human") {
    // Mild deterministic rhythm variance around the target CPS.
    const factor = 0.9 + 0.2 * Math.sin(simTime / 45);
    return Math.max(0.1, base * factor);
  }
  return base;
}

// ─── Purchase Candidates ──────────────────────────────────────────────────────

function getCandidates(s: GameState, cps: number): Candidate[] {
  const candidates: Candidate[] = [];
  const mult = getTotalMultiplier(s);
  const muscleMemory = 1 + (s.prestigeUpgrades["muscleMemory"] ?? 0) * 0.1;
  const totalRate = totalIncomeRate(s, cps);

  // Click upgrades
  for (const def of UPGRADE_DEFS) {
    const cost = getUpgradeCost(def, s);
    const addedClickIncome = def.effect.value * mult * muscleMemory * cps;
    const roi = cost > 0 ? addedClickIncome / cost : 0;
    candidates.push({ type: "upgrade", id: def.id, name: def.name, cost, roi });
  }

  // Artists
  for (const def of ARTIST_DEFS) {
    const cost = getArtistCost(def, s);
    const addedPassive = def.baseRate * mult;
    const artSchool = 1 + (s.prestigeUpgrades["artSchool"] ?? 0) * 0.25;
    const roi = cost > 0 ? (addedPassive * artSchool) / cost : 0;
    candidates.push({ type: "artist", id: def.id, name: def.name, cost, roi });
  }

  // Next media tier
  const nextTier = s.mediaTier + 1;
  if (nextTier < MEDIA_TIERS.length) {
    const tierDef = MEDIA_TIERS[nextTier];
    if (tierDef) {
      const currMult = MEDIA_TIERS[s.mediaTier]?.multiplier ?? 1;
      const nextMult = tierDef.multiplier;
      // Gain = current income * (new_mult/curr_mult - 1) + current income * (new_mult/curr_mult - 1)
      // Simplified: everything scales by newMult/currMult
      const multiplierGain = nextMult / currMult - 1;
      const addedIncome = totalRate * multiplierGain;
      const roi = tierDef.cost > 0 ? addedIncome / tierDef.cost : 0;
      candidates.push({
        type: "media",
        id: tierDef.id,
        name: tierDef.name,
        cost: tierDef.cost,
        roi,
      });
    }
  }

  return candidates;
}

function selectBest(
  affordable: Candidate[],
  strategy: Strategy,
  rng: () => number
): Candidate {
  if (strategy === "cheapest") {
    return affordable.reduce((a, b) => (a.cost < b.cost ? a : b));
  }
  if (strategy === "human") {
    const ranked = [...affordable].sort((a, b) => {
      if (a.roi === b.roi) return a.cost - b.cost;
      return b.roi - a.roi;
    });
    const best = ranked[0]!;
    const roiFloor =
      best.roi <= 0 ? Number.NEGATIVE_INFINITY : best.roi * (1 - CLOSE_CALL_ROI_DELTA);
    const nearBest = ranked.filter((c) => c.roi >= roiFloor);
    if (nearBest.length === 1) return nearBest[0]!;

    const roll = rng();
    if (roll < 0.6) return nearBest[0]!;
    if (roll < 0.85) return nearBest[Math.min(1, nearBest.length - 1)]!;
    return nearBest.reduce((a, b) => (a.cost < b.cost ? a : b));
  }
  // "optimal": highest ROI (strokes/sec gained per stroke spent)
  return affordable.reduce((a, b) => (a.roi > b.roi ? a : b));
}

// ─── Apply Purchase ───────────────────────────────────────────────────────────

// Milestone counts at which we log a purchase event (first buy + round numbers)
const BUY_MILESTONES = new Set([1, 5, 10, 25, 50, 100, 200, 500]);
function isBuyMilestone(n: number): boolean {
  if (BUY_MILESTONES.has(n)) return true;
  if (n >= 1000 && n % 500 === 0) return true;
  return false;
}

function applyPurchase(
  c: Candidate,
  s: GameState,
  events: SimEvent[],
  simTime: number
): void {
  s.strokes -= c.cost;

  if (c.type === "upgrade") {
    const def = UPGRADE_DEFS.find((d) => d.id === c.id)!;
    s.upgrades[c.id] = (s.upgrades[c.id] ?? 0) + 1;
    s.clickPower += def.effect.value;
    const newCount = s.upgrades[c.id]!;
    if (isBuyMilestone(newCount)) {
      events.push({
        simTime,
        tag: "BUY",
        label: `${def.name} ×${newCount}`,
        detail: `cost ${fmtNum(c.cost)} · click power now ${s.clickPower}`,
      });
    }
  } else if (c.type === "artist") {
    const def = ARTIST_DEFS.find((d) => d.id === c.id)!;
    s.artists[c.id] = (s.artists[c.id] ?? 0) + 1;
    s.passiveRate += def.baseRate;
    const newCount = s.artists[c.id]!;
    if (isBuyMilestone(newCount)) {
      events.push({
        simTime,
        tag: "HIRE",
        label: `${def.name} ×${newCount}`,
        detail: `cost ${fmtNum(c.cost)} · passive +${fmtNum(def.baseRate)}/s · total ${fmtNum(s.passiveRate)}/s base`,
      });
    }
  } else if (c.type === "media") {
    s.mediaTier += 1;
    const tierDef = MEDIA_TIERS[s.mediaTier]!;
    events.push({
      simTime,
      tag: "MEDIA",
      label: `${tierDef.name} (tier ${s.mediaTier})`,
      detail: `cost ${fmtNum(c.cost)} · multiplier ×${tierDef.multiplier}`,
    });
  }
}

// ─── Prestige ─────────────────────────────────────────────────────────────────

function spendPrestigePoints(s: GameState): void {
  // Simple heuristic: buy speedSketch if we can afford it, else artSchool, else muscleMemory
  let changed = true;
  while (changed) {
    changed = false;
    for (const def of PRESTIGE_UPGRADE_DEFS) {
      const owned = s.prestigeUpgrades[def.id] ?? 0;
      if (owned >= def.maxLevel) continue;
      const cost = Math.floor(def.baseCost * Math.pow(1.5, owned));
      if (s.erasurePoints >= cost) {
        s.erasurePoints -= cost;
        s.prestigeUpgrades[def.id] = owned + 1;
        changed = true;
      }
    }
  }
}

function doPrestige(s: GameState, events: SimEvent[], simTime: number): void {
  const earned = calculateErasurePoints(s.totalStrokes);
  s.lifetimeStrokes += s.totalStrokes;
  s.erasurePoints += earned;
  s.totalErasurePoints += earned;
  s.prestigeCount += 1;

  // Spend LP before resetting
  spendPrestigePoints(s);

  const lpSpent = earned - s.erasurePoints;
  const prestigeUpgradesSummary = Object.entries(s.prestigeUpgrades)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      const def = PRESTIGE_UPGRADE_DEFS.find((d) => d.id === k);
      return `${def?.name ?? k} ×${v}`;
    })
    .join(", ");

  events.push({
    simTime,
    tag: "PRESTIGE",
    label: `Ascension #${s.prestigeCount}`,
    detail: `+${earned} LP earned · ${lpSpent} LP spent · Upgrades: ${prestigeUpgradesSummary || "none"}`,
  });

  // Reset
  s.strokes = 0;
  s.totalStrokes = 0;
  s.totalClicks = 0;
  s.clickPower = 1;
  s.passiveRate = 0;
  s.upgrades = {};
  s.artists = {};
  // Media tier resets (betterPaper -> tier 1, inkReserves -> tier 2)
  s.mediaTier = 0;
  if ((s.prestigeUpgrades["betterPaper"] ?? 0) >= 1) s.mediaTier = 1;
  if ((s.prestigeUpgrades["inkReserves"] ?? 0) >= 1) s.mediaTier = 2;
  // Sketch head start grants free Doodlers each run
  const headStart = s.prestigeUpgrades["sketchHeadStart"] ?? 0;
  if (headStart > 0) {
    s.artists["doodler"] = headStart;
  }
  for (const def of ARTIST_DEFS) {
    const owned = s.artists[def.id] ?? 0;
    s.passiveRate += def.baseRate * owned;
  }
  // Swords reset (keep if portfolio)
  if ((s.prestigeUpgrades["portfolio"] ?? 0) < 1) {
    s.unlockedSwords = ["butterKnife"];
  }
  s.prestigeConfirming = false;
  s.resetConfirming = false;
}

// ─── Time Advancement ─────────────────────────────────────────────────────────

// Advance state by `secs` seconds of passive income + clicking
function advanceTime(s: GameState, secs: number, cps: number): void {
  const passiveGain = getEffectivePassiveRate(s) * secs;
  const clickGain = getEffectiveClickPower(s) * cps * secs;
  const clicks = Math.floor(cps * secs);

  s.strokes += passiveGain + clickGain;
  s.totalStrokes += passiveGain + clickGain;
  s.totalClicks += clicks;
}

// ─── Sword & Achievement Checks ───────────────────────────────────────────────

function checkSwords(s: GameState, events: SimEvent[], simTime: number): void {
  for (const def of SWORD_DEFS) {
    if (!s.unlockedSwords.includes(def.id) && s.totalStrokes >= def.threshold) {
      s.unlockedSwords.push(def.id);
      events.push({
        simTime,
        tag: "SWORD",
        label: def.name,
        detail: `unlocked at ${fmtNum(def.threshold)} total strokes · +${def.bonus}% production`,
      });
    }
  }
}

function checkAchievements(
  s: GameState,
  events: SimEvent[],
  simTime: number
): void {
  for (const def of ACHIEVEMENT_DEFS) {
    if (s.unlockedAchievements.includes(def.id)) continue;
    const unlocked =
      def.id === "drawnOut"
        ? simTime >= 30 * 60
        : def.check(s);
    if (unlocked) {
      s.unlockedAchievements.push(def.id);
      events.push({
        simTime,
        tag: "ACHIEVE",
        label: def.name,
        detail: def.desc,
      });
    }
  }
}

// ─── Core Simulation ──────────────────────────────────────────────────────────

function simulate(): SimResult {
  const s = createState();
  const events: SimEvent[] = [];
  const snapshots: Snapshot[] = [];
  const deadZones: DeadZone[] = [];
  const prestigeTimes: number[] = [];
  const rng = createDeterministicRng();

  let simTime = 0;
  const maxTime = DURATION_MINUTES * 60;

  let prevPhase: RunPhase = "early";
  let deadZoneStart: number | null = null;
  let deadZoneTarget = "";
  let totalDecisionMoments = 0;
  let totalCloseCallMoments = 0;
  let totalPurchases = 0;
  let lastSnapshotTime = -Infinity;

  let cpsLabel = `${CLICKS_PER_SEC} clicks/sec`;
  if (STRATEGY === "idle") cpsLabel = "0.5 clicks/sec (idle — minimal engagement)";
  if (STRATEGY === "human") {
    cpsLabel = `${CLICKS_PER_SEC} clicks/sec target (human profile: variance + reaction delay + near-best ROI)`;
  }
  events.push({
    simTime: 0,
    tag: "START",
    label: "Game begins",
    detail: `strategy: ${STRATEGY} · ${cpsLabel}`,
  });

  // Initial sword check (butter knife at 0)
  checkSwords(s, events, simTime);

  while (simTime < maxTime) {
    const cpsNow = getCpsForStrategy(STRATEGY, simTime);
    // Snapshot every 5 minutes
    if (simTime - lastSnapshotTime >= 300) {
      snapshots.push({
        time: simTime,
        strokes: s.strokes,
        clickPower: s.clickPower,
        effectiveClickPower: getEffectiveClickPower(s),
        passiveRate: s.passiveRate,
        effectivePassiveRate: getEffectivePassiveRate(s),
        totalIncome: totalIncomeRate(s, cpsNow),
        passiveFraction: passiveFraction(s, cpsNow),
        mediaTier: s.mediaTier,
        artistCount: totalArtists(s),
        phase: getRunPhase(s),
        prestigeCount: s.prestigeCount,
      });
      lastSnapshotTime = simTime;
    }

    // Prestige check
    if (
      s.totalStrokes >= PRESTIGE_THRESHOLD &&
      s.prestigeCount < MAX_PRESTIGES
    ) {
      prestigeTimes.push(simTime);
      doPrestige(s, events, simTime);
      deadZoneStart = null; // reset dead zone tracking after prestige
      prevPhase = getRunPhase(s);
      continue;
    }

    // Get all candidates and find affordable ones
    const candidates = getCandidates(s, cpsNow);
    const affordable = candidates.filter((c) => c.cost <= s.strokes);

    if (affordable.length > 0) {
      // Close dead zone if one was open
      if (deadZoneStart !== null) {
        const duration = simTime - deadZoneStart;
        if (duration > 120) {
          deadZones.push({
            start: deadZoneStart,
            end: simTime,
            waitingFor: deadZoneTarget,
          });
        }
        deadZoneStart = null;
      }

      // Count decision moments (>= 2 affordable options)
      if (affordable.length >= 2) {
        totalDecisionMoments++;
        const ranked = [...affordable].sort((a, b) => b.roi - a.roi);
        const top = ranked[0];
        const second = ranked[1];
        if (top && second) {
          const denom = Math.max(Math.abs(top.roi), 1e-9);
          const relativeGap = Math.abs(top.roi - second.roi) / denom;
          if (relativeGap <= CLOSE_CALL_ROI_DELTA) totalCloseCallMoments++;
        }
      }
      totalPurchases++;

      const best = selectBest(affordable, STRATEGY, rng);
      applyPurchase(best, s, events, simTime);
      if (STRATEGY === "human") {
        const reactionDelay =
          HUMAN_REACTION_DELAY_MIN +
          rng() * (HUMAN_REACTION_DELAY_MAX - HUMAN_REACTION_DELAY_MIN);
        const cappedDelay = Math.min(reactionDelay, Math.max(0, maxTime - simTime));
        if (cappedDelay > 0) {
          const cpsDuringDelay = getCpsForStrategy(STRATEGY, simTime);
          advanceTime(s, cappedDelay, cpsDuringDelay);
          simTime += cappedDelay;
        }
      }
    } else {
      // Nothing affordable — find cheapest reachable target and fast-forward
      const reachable = candidates.filter((c) => c.cost > 0);
      if (reachable.length === 0) {
        simTime += 60;
        continue;
      }

      const cheapest = reachable.reduce((a, b) => (a.cost < b.cost ? a : b));
      const needed = cheapest.cost - s.strokes;
      const rate = totalIncomeRate(s, cpsNow);

      if (rate <= 0) {
        // Completely stuck (no income, no clicking)
        events.push({
          simTime,
          tag: "STUCK",
          label: "No income — cannot progress",
          detail: "needs at least one click or artist",
        });
        break;
      }

      const waitSecs = needed / rate;

      // Open dead zone tracking (only flag waits > 2 minutes)
      if (deadZoneStart === null && waitSecs > 120) {
        deadZoneStart = simTime;
        deadZoneTarget = cheapest.name;
      }

      // Advance by the wait time (capped to avoid huge jumps for readability)
      const step = Math.min(waitSecs, maxTime - simTime, 600);
      advanceTime(s, step, cpsNow);
      simTime += step;

      if (step < waitSecs) continue; // didn't reach the target yet
    }

    // Check swords, achievements, phase after each action
    checkSwords(s, events, simTime);
    checkAchievements(s, events, simTime);

    const phase = getRunPhase(s);
    if (phase !== prevPhase) {
      events.push({
        simTime,
        tag: "PHASE",
        label: `Phase → ${phase.toUpperCase()}`,
        detail: phaseDescription(phase),
      });
      prevPhase = phase;
    }
  }

  // Final snapshot
  const finalCps = getCpsForStrategy(STRATEGY, simTime);
  snapshots.push({
    time: simTime,
    strokes: s.strokes,
    clickPower: s.clickPower,
    effectiveClickPower: getEffectiveClickPower(s),
    passiveRate: s.passiveRate,
    effectivePassiveRate: getEffectivePassiveRate(s),
    totalIncome: totalIncomeRate(s, finalCps),
    passiveFraction: passiveFraction(s, finalCps),
    mediaTier: s.mediaTier,
    artistCount: totalArtists(s),
    phase: getRunPhase(s),
    prestigeCount: s.prestigeCount,
  });

  return {
    events,
    snapshots,
    deadZones,
    finalState: s,
    durationSecs: simTime,
    totalDecisionMoments,
    totalCloseCallMoments,
    totalPurchases,
    prestigeTimes,
  };
}

function phaseDescription(phase: RunPhase): string {
  const descs: Record<RunPhase, string> = {
    early: "Minimal tools. Build rhythm with deliberate strokes.",
    mid: "The floor is busy. Throughput matters now.",
    late: "The run bends toward ritual and transcendence.",
  };
  return descs[phase];
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n === 0) return "0";
  if (n < 1_000) return Math.floor(n).toString();
  const suffixes = ["", "K", "M", "B", "T"];
  const tier = Math.min(
    Math.floor(Math.log10(Math.abs(n)) / 3),
    suffixes.length - 1
  );
  if (tier === 0) return Math.floor(n).toString();
  const suffix = suffixes[tier] ?? `e${tier * 3}`;
  const scale = Math.pow(10, tier * 3);
  const scaled = n / scale;
  return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + suffix;
}

function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function getMediaTierFromEventLabel(label: string): number | null {
  const match = label.match(/\(tier (\d+)\)$/);
  if (match) return Number(match[1] ?? 0);
  const idx = MEDIA_TIERS.findIndex((tier) => label.includes(tier.name));
  return idx >= 0 ? idx : null;
}

type MajorBeatTag = "MEDIA" | "SWORD" | "ACHIEVE";

interface MajorBeat {
  simTime: number;
  tag: MajorBeatTag;
  label: string;
  key: string;
}

interface CadenceSummary {
  beatCount: number;
  firstBeatTime: number | null;
  avgGap: number | null;
  medianGap: number | null;
  longestDrought: number;
  droughtStart: number;
  droughtEnd: number;
  burstWindowSecs: number;
  peakBurstCount: number;
  peakBurstStart: number | null;
  peakBurstEnd: number | null;
}

interface RecoverySummary {
  firstPrestigeTime: number | null;
  prePrestigeMaxMediaTier: number;
  prePrestigeMaxSwordIdx: number;
  keepsSwords: boolean;
  postPrestigeStartMediaTier: number;
  mediaRecoverySecs: number | null;
  swordRecoverySecs: number | null;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const a = sorted[mid - 1] ?? 0;
  const b = sorted[mid] ?? 0;
  return (a + b) / 2;
}

function getFirstTimeMajorBeats(events: SimEvent[]): MajorBeat[] {
  const beats: MajorBeat[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    if (e.tag !== "MEDIA" && e.tag !== "SWORD" && e.tag !== "ACHIEVE") continue;

    let key = `${e.tag}:${e.label}`;
    if (e.tag === "MEDIA") {
      const tier = getMediaTierFromEventLabel(e.label);
      key = `MEDIA:${tier ?? e.label}`;
    }

    if (seen.has(key)) continue;
    seen.add(key);
    beats.push({
      simTime: e.simTime,
      tag: e.tag as MajorBeatTag,
      label: e.label,
      key,
    });
  }
  return beats.sort((a, b) => a.simTime - b.simTime);
}

function summarizeCadence(
  beats: MajorBeat[],
  sessionEnd: number,
  burstWindowSecs = 120
): CadenceSummary {
  if (beats.length === 0) {
    return {
      beatCount: 0,
      firstBeatTime: null,
      avgGap: null,
      medianGap: null,
      longestDrought: sessionEnd,
      droughtStart: 0,
      droughtEnd: sessionEnd,
      burstWindowSecs,
      peakBurstCount: 0,
      peakBurstStart: null,
      peakBurstEnd: null,
    };
  }

  const firstBeatTime = beats[0]?.simTime ?? null;
  const gaps: number[] = [];
  for (let i = 1; i < beats.length; i++) {
    const prev = beats[i - 1];
    const curr = beats[i];
    if (prev && curr) gaps.push(curr.simTime - prev.simTime);
  }

  let droughtStart = 0;
  let droughtEnd = beats[0]?.simTime ?? sessionEnd;
  let longestDrought = droughtEnd - droughtStart;
  for (let i = 1; i < beats.length; i++) {
    const prev = beats[i - 1];
    const curr = beats[i];
    if (!prev || !curr) continue;
    const gap = curr.simTime - prev.simTime;
    if (gap > longestDrought) {
      longestDrought = gap;
      droughtStart = prev.simTime;
      droughtEnd = curr.simTime;
    }
  }
  const lastBeatTime = beats[beats.length - 1]?.simTime ?? 0;
  const tailGap = Math.max(0, sessionEnd - lastBeatTime);
  if (tailGap > longestDrought) {
    longestDrought = tailGap;
    droughtStart = lastBeatTime;
    droughtEnd = sessionEnd;
  }

  let peakBurstCount = 1;
  let peakBurstStart = beats[0]?.simTime ?? null;
  let peakBurstEnd = beats[0]?.simTime ?? null;
  for (let i = 0; i < beats.length; i++) {
    const start = beats[i]?.simTime ?? 0;
    let count = 0;
    let end = start;
    for (let j = i; j < beats.length; j++) {
      const t = beats[j]?.simTime ?? start;
      if (t <= start + burstWindowSecs) {
        count++;
        end = t;
      } else {
        break;
      }
    }
    if (count > peakBurstCount) {
      peakBurstCount = count;
      peakBurstStart = start;
      peakBurstEnd = end;
    }
  }

  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
  const medianGap = median(gaps);

  return {
    beatCount: beats.length,
    firstBeatTime,
    avgGap,
    medianGap,
    longestDrought,
    droughtStart,
    droughtEnd,
    burstWindowSecs,
    peakBurstCount,
    peakBurstStart,
    peakBurstEnd,
  };
}

function summarizePostPrestigeRecovery(events: SimEvent[]): RecoverySummary {
  const prestigeEvent = events.find((e) => e.tag === "PRESTIGE");
  if (!prestigeEvent) {
    return {
      firstPrestigeTime: null,
      prePrestigeMaxMediaTier: 0,
      prePrestigeMaxSwordIdx: 0,
      keepsSwords: false,
      postPrestigeStartMediaTier: 0,
      mediaRecoverySecs: null,
      swordRecoverySecs: null,
    };
  }

  const firstPrestigeTime = prestigeEvent.simTime;
  const beforePrestige = events.filter((e) => e.simTime < firstPrestigeTime);
  const afterPrestige = events.filter((e) => e.simTime > firstPrestigeTime);

  let prePrestigeMaxMediaTier = 0;
  for (const e of beforePrestige) {
    if (e.tag !== "MEDIA") continue;
    const tier = getMediaTierFromEventLabel(e.label);
    if (tier !== null) prePrestigeMaxMediaTier = Math.max(prePrestigeMaxMediaTier, tier);
  }

  let prePrestigeMaxSwordIdx = 0;
  for (const e of beforePrestige) {
    if (e.tag !== "SWORD") continue;
    const idx = SWORD_DEFS.findIndex((d) => d.name === e.label);
    if (idx >= 0) prePrestigeMaxSwordIdx = Math.max(prePrestigeMaxSwordIdx, idx);
  }

  const detail = prestigeEvent.detail ?? "";
  const keepsSwords = detail.includes("Portfolio");
  let postPrestigeStartMediaTier = 0;
  if (detail.includes("Better Paper")) postPrestigeStartMediaTier = 1;
  if (detail.includes("Ink Reserves")) postPrestigeStartMediaTier = 2;

  let mediaRecoverySecs: number | null = null;
  if (prePrestigeMaxMediaTier <= postPrestigeStartMediaTier) {
    mediaRecoverySecs = 0;
  } else {
    for (const e of afterPrestige) {
      if (e.tag !== "MEDIA") continue;
      const tier = getMediaTierFromEventLabel(e.label);
      if (tier !== null && tier >= prePrestigeMaxMediaTier) {
        mediaRecoverySecs = e.simTime - firstPrestigeTime;
        break;
      }
    }
  }

  let swordRecoverySecs: number | null = null;
  if (prePrestigeMaxSwordIdx <= 0 || keepsSwords) {
    swordRecoverySecs = 0;
  } else {
    for (const e of afterPrestige) {
      if (e.tag !== "SWORD") continue;
      const idx = SWORD_DEFS.findIndex((d) => d.name === e.label);
      if (idx >= prePrestigeMaxSwordIdx) {
        swordRecoverySecs = e.simTime - firstPrestigeTime;
        break;
      }
    }
  }

  return {
    firstPrestigeTime,
    prePrestigeMaxMediaTier,
    prePrestigeMaxSwordIdx,
    keepsSwords,
    postPrestigeStartMediaTier,
    mediaRecoverySecs,
    swordRecoverySecs,
  };
}

// ─── Report Output ────────────────────────────────────────────────────────────

function printReport(result: SimResult): void {
  const {
    events,
    snapshots,
    deadZones,
    finalState: s,
    totalDecisionMoments,
    totalCloseCallMoments,
    totalPurchases,
    prestigeTimes,
  } = result;
  const hr = "─".repeat(60);
  const hr2 = "═".repeat(60);

  console.log();
  console.log(hr2);
  console.log("  SWORD ART CLICK — GAME EVALUATION REPORT");
  console.log(hr2);
  const stratLabel =
    STRATEGY === "idle"
      ? "idle (0.5 cps — minimal engagement)"
      : STRATEGY === "human"
        ? `human (~${CLICKS_PER_SEC} cps target, imperfect choices, reaction delays)`
      : `${STRATEGY} · ${CLICKS_PER_SEC} clicks/sec`;
  console.log(`  Strategy : ${stratLabel}`);
  console.log(`  Duration : ${DURATION_MINUTES} min simulated`);
  console.log(`  Max prestiges : ${MAX_PRESTIGES}`);
  console.log();

  // ── Timeline ──────────────────────────────────────────────────────────────
  console.log(hr);
  console.log("  TIMELINE");
  console.log(hr);
  for (const e of events) {
    const time = fmtTime(e.simTime).padStart(8);
    const tag = `[${e.tag}]`.padEnd(10);
    const detail = e.detail ? `  ·  ${e.detail}` : "";
    console.log(`  ${time}  ${tag}  ${e.label}${detail}`);
  }
  console.log();

  // ── Income Snapshots ──────────────────────────────────────────────────────
  console.log(hr);
  console.log("  INCOME SNAPSHOTS (every 5 minutes)");
  console.log(hr);
  console.log(
    "  Time       Effective Click  Passive/s   Total/s    Idle%  Media  Artists  Phase     Prestige"
  );
  console.log(
    "  " + "─".repeat(95)
  );
  for (const snap of snapshots) {
    const t = fmtTime(snap.time).padStart(8);
    const ec = fmtNum(snap.effectiveClickPower).padStart(8);
    const ep = fmtNum(snap.effectivePassiveRate).padStart(11);
    const ti = fmtNum(snap.totalIncome).padStart(10);
    const pf = fmtPct(snap.passiveFraction).padStart(6);
    const tier = MEDIA_TIERS[snap.mediaTier]?.name.slice(0, 11).padEnd(11) ?? "?";
    const arts = String(snap.artistCount).padStart(7);
    const phase = snap.phase.padEnd(9);
    const pcount = snap.prestigeCount > 0 ? `#${snap.prestigeCount}` : "-";
    console.log(
      `  ${t}  ${ec}/click ${ep}   ${ti}   ${pf}  ${tier}  ${arts}  ${phase}  ${pcount}`
    );
  }
  console.log();

  // ── Progression Milestones ────────────────────────────────────────────────
  console.log(hr);
  console.log("  CONTENT REACHED");
  console.log(hr);

  const mediaTierEvents = events
    .filter((e) => e.tag === "MEDIA")
    .map((e) => ({ event: e, tier: getMediaTierFromEventLabel(e.label) }))
    .filter((x): x is { event: SimEvent; tier: number } => x.tier !== null);
  const mediaTiersReached = Array.from(
    new Set([0, ...mediaTierEvents.map((x) => x.tier)])
  ).sort((a, b) => a - b);
  console.log("  Media tiers:");
  for (const tierIdx of mediaTiersReached) {
    const def = MEDIA_TIERS[tierIdx];
    if (!def) continue;
    const reachEvent =
      tierIdx === 0
        ? undefined
        : mediaTierEvents.find((x) => x.tier === tierIdx)?.event;
    const when = reachEvent ? `@ ${fmtTime(reachEvent.simTime)}` : "@ start";
    console.log(`    Tier ${tierIdx}: ${def.name.padEnd(18)} ${when}  ×${def.multiplier} multiplier`);
  }
  const maxTier = Math.max(...mediaTiersReached);
  for (let i = maxTier + 1; i < MEDIA_TIERS.length; i++) {
    const def = MEDIA_TIERS[i];
    if (def) console.log(`    Tier ${i}: ${def.name.padEnd(18)} NOT REACHED  (costs ${fmtNum(def.cost)})`);
  }
  console.log();

  console.log("  Swords unlocked:");
  for (const def of SWORD_DEFS) {
    const unlocked = s.unlockedSwords.includes(def.id);
    const event = events.find((e) => e.tag === "SWORD" && e.label === def.name);
    if (unlocked) {
      const when = event ? `@ ${fmtTime(event.simTime)}` : "@ start";
      console.log(`    ✓ ${def.name.padEnd(22)} ${when}  +${def.bonus}%`);
    } else {
      console.log(
        `    ✗ ${def.name.padEnd(22)} NOT REACHED  (needs ${fmtNum(def.threshold)} strokes)`
      );
    }
  }
  console.log();

  console.log("  Achievements unlocked:");
  for (const def of ACHIEVEMENT_DEFS) {
    const unlocked = s.unlockedAchievements.includes(def.id);
    const event = events.find((e) => e.tag === "ACHIEVE" && e.label === def.name);
    const when = event ? `@ ${fmtTime(event.simTime)}` : "";
    const mark = unlocked ? "✓" : "✗";
    console.log(`    ${mark} ${def.name.padEnd(38)} ${when}`);
  }
  console.log();

  console.log("  Artists hired (final state):");
  for (const def of ARTIST_DEFS) {
    const count = s.artists[def.id] ?? 0;
    const bar = "█".repeat(Math.min(count, 20));
    console.log(`    ${def.name.padEnd(22)} ×${String(count).padStart(3)}  ${bar}`);
  }
  console.log();

  if (prestigeTimes.length > 0) {
    console.log("  Prestige timeline:");
    for (let i = 0; i < prestigeTimes.length; i++) {
      console.log(`    Prestige #${i + 1} @ ${fmtTime(prestigeTimes[i]!)}`);
    }
    console.log();
  }

  // ── Pacing Analysis ───────────────────────────────────────────────────────
  console.log(hr);
  console.log("  PACING ANALYSIS");
  console.log(hr);

  // Phase durations
  const phaseEvents = events.filter((e) => e.tag === "PHASE" || e.tag === "START");
  console.log("  Phase durations:");
  let prevPhaseTime = 0;
  let prevPhaseName = "early";
  for (const e of events) {
    if (e.tag !== "PHASE") continue;
    const dur = e.simTime - prevPhaseTime;
    console.log(
      `    ${prevPhaseName.toUpperCase().padEnd(8)} : ${fmtTime(prevPhaseTime)} → ${fmtTime(e.simTime)}  (${fmtTime(dur)})`
    );
    prevPhaseTime = e.simTime;
    prevPhaseName = e.label.split("→")[1]?.trim().toLowerCase() ?? prevPhaseName;
  }
  const finalDur = result.durationSecs - prevPhaseTime;
  console.log(
    `    ${prevPhaseName.toUpperCase().padEnd(8)} : ${fmtTime(prevPhaseTime)} → ${fmtTime(result.durationSecs)}  (${fmtTime(finalDur)})`
  );
  console.log();

  // Dead zones
  const totalDeadTime = deadZones.reduce(
    (acc, dz) => acc + (dz.end - dz.start),
    0
  );
  const deadPct = result.durationSecs > 0 ? totalDeadTime / result.durationSecs : 0;
  console.log(`  Dead zones (waiting >120s with nothing to buy): ${deadZones.length}`);
  if (deadZones.length > 0) {
    for (const dz of deadZones) {
      const dur = dz.end - dz.start;
      console.log(
        `    ${fmtTime(dz.start)} → ${fmtTime(dz.end)}  (${fmtTime(dur)})  waiting for: ${dz.waitingFor}`
      );
    }
    console.log(
      `  Total dead time: ${fmtTime(totalDeadTime)}  (${fmtPct(deadPct)} of session)`
    );
  }
  console.log();

  console.log(`  Total purchases made     : ${totalPurchases.toLocaleString()}`);
  if (result.durationSecs > 0 && totalPurchases > 0) {
    const avgBetween = result.durationSecs / totalPurchases;
    console.log(`  Avg time between buys    : ${fmtTime(avgBetween)}`);
  }
  console.log(`  Decision moments (≥2 affordable options): ${totalDecisionMoments}`);
  if (result.durationSecs > 0 && totalDecisionMoments > 0) {
    const avgFreq = result.durationSecs / totalDecisionMoments;
    console.log(`  Avg decision frequency   : every ${fmtTime(avgFreq)}`);
  }
  console.log(
    `  Close-call moments (top-2 ROI within ${Math.round(CLOSE_CALL_ROI_DELTA * 100)}%): ${totalCloseCallMoments}`
  );
  if (totalDecisionMoments > 0) {
    const share = totalCloseCallMoments / totalDecisionMoments;
    console.log(`  Close-call share         : ${fmtPct(share)}`);
  }
  console.log();

  // ── Experience Cadence ────────────────────────────────────────────────────
  console.log(hr);
  console.log("  EXPERIENCE CADENCE");
  console.log(hr);

  const firstTimeBeats = getFirstTimeMajorBeats(events);
  const cadence = summarizeCadence(firstTimeBeats, result.durationSecs);
  console.log(`  First-time major beats  : ${cadence.beatCount}`);
  if (cadence.firstBeatTime !== null) {
    console.log(`  Time to first major beat: ${fmtTime(cadence.firstBeatTime)}`);
  } else {
    console.log("  Time to first major beat: none");
  }
  if (cadence.avgGap !== null) {
    console.log(`  Avg beat gap            : ${fmtTime(cadence.avgGap)}`);
  } else {
    console.log("  Avg beat gap            : n/a");
  }
  if (cadence.medianGap !== null) {
    console.log(`  Median beat gap         : ${fmtTime(cadence.medianGap)}`);
  } else {
    console.log("  Median beat gap         : n/a");
  }
  console.log(
    `  Longest novelty drought : ${fmtTime(cadence.longestDrought)} (${fmtTime(cadence.droughtStart)} -> ${fmtTime(cadence.droughtEnd)})`
  );
  if (cadence.peakBurstCount > 0 && cadence.peakBurstStart !== null && cadence.peakBurstEnd !== null) {
    console.log(
      `  Peak novelty burst      : ${cadence.peakBurstCount} beats in ${fmtTime(cadence.burstWindowSecs)} window (${fmtTime(cadence.peakBurstStart)} -> ${fmtTime(cadence.peakBurstEnd)})`
    );
  } else {
    console.log("  Peak novelty burst      : none");
  }

  const recovery = summarizePostPrestigeRecovery(events);
  if (recovery.firstPrestigeTime !== null) {
    const mediaName =
      MEDIA_TIERS[recovery.prePrestigeMaxMediaTier]?.name ?? `Tier ${recovery.prePrestigeMaxMediaTier}`;
    const swordName =
      SWORD_DEFS[recovery.prePrestigeMaxSwordIdx]?.name ?? `Sword #${recovery.prePrestigeMaxSwordIdx}`;
    console.log(
      `  Pre-prestige peaks      : media ${mediaName}, sword ${swordName}`
    );
    if (recovery.mediaRecoverySecs === 0) {
      console.log("  Post-prestige media recovery: instant");
    } else if (recovery.mediaRecoverySecs !== null) {
      console.log(`  Post-prestige media recovery: ${fmtTime(recovery.mediaRecoverySecs)}`);
    } else {
      console.log("  Post-prestige media recovery: not recovered this run");
    }

    if (recovery.swordRecoverySecs === 0) {
      const reason = recovery.keepsSwords ? "instant (Portfolio kept swords)" : "instant";
      console.log(`  Post-prestige sword recovery: ${reason}`);
    } else if (recovery.swordRecoverySecs !== null) {
      console.log(`  Post-prestige sword recovery: ${fmtTime(recovery.swordRecoverySecs)}`);
    } else {
      console.log("  Post-prestige sword recovery: not recovered this run");
    }
  } else {
    console.log("  Post-prestige recovery  : no prestige in this session");
  }
  console.log();

  // ── Balance Flags ─────────────────────────────────────────────────────────
  console.log(hr);
  console.log("  BALANCE FLAGS");
  console.log(hr);

  const flags: { warn: boolean; msg: string }[] = [];

  // Check dead zone percentage
  if (deadPct > 0.2)
    flags.push({
      warn: true,
      msg: `High dead time: ${fmtPct(deadPct)} of session spent waiting — pacing may feel slow`,
    });
  else if (deadPct < 0.05)
    flags.push({
      warn: false,
      msg: `Low dead time (${fmtPct(deadPct)}) — always something to buy, good purchase density`,
    });
  else
    flags.push({
      warn: false,
      msg: `Dead time: ${fmtPct(deadPct)} — reasonable pacing`,
    });

  // Check passive vs click income balance at end
  const finalSnap = snapshots[snapshots.length - 1];
  if (finalSnap) {
    const pf = finalSnap.passiveFraction;
    if (pf < 0.5)
      flags.push({
        warn: true,
        msg: `Clicking dominates at end (${fmtPct(pf)} passive) — passive income may be too weak`,
      });
    else if (pf > 0.98)
      flags.push({
        warn: false,
        msg: `Passive income dominates (${fmtPct(pf)}) at end — idle-friendly, clicking is supplemental`,
      });
    else
      flags.push({
        warn: false,
        msg: `Healthy click/passive split: ${fmtPct(pf)} passive at end of session`,
      });
  }

  // Check prestige timing
  if (prestigeTimes.length > 0) {
    const firstPrestige = prestigeTimes[0]!;
    const pctOfSession = firstPrestige / result.durationSecs;
    if (pctOfSession < 0.4)
      flags.push({
        warn: true,
        msg: `First prestige at ${fmtPct(pctOfSession)} of session (${fmtTime(firstPrestige)}) — may feel rushed`,
      });
    else
      flags.push({
        warn: false,
        msg: `First prestige at ${fmtTime(firstPrestige)} (${fmtPct(pctOfSession)} of session) — feels paced`,
      });
  } else if (MAX_PRESTIGES > 0) {
    flags.push({
      warn: true,
      msg: `Prestige not reached in ${DURATION_MINUTES} min — threshold is ${fmtNum(PRESTIGE_THRESHOLD)} total strokes`,
    });
  }

  if (STRATEGY === "optimal" || STRATEGY === "idle") {
    const share =
      totalDecisionMoments > 0 ? fmtPct(totalCloseCallMoments / totalDecisionMoments) : "0%";
    flags.push({
      warn: false,
      msg: `ROI strategy note: decision moments are constrained by immediate spending; close-call share is ${share}`,
    });
  }

  // Check if any artists are never hired
  for (const def of ARTIST_DEFS) {
    const count = s.artists[def.id] ?? 0;
    if (count === 0) {
      flags.push({
        warn: true,
        msg: `Artist never hired: ${def.name} (base cost ${fmtNum(def.baseCost)}) — may be unreachable`,
      });
    }
  }

  // Check early game speed (how fast do we get first artist)
  const firstHire = events.find((e) => e.tag === "HIRE");
  if (firstHire && firstHire.simTime > 120) {
    flags.push({
      warn: true,
      msg: `First artist hired at ${fmtTime(firstHire.simTime)} — early game may feel slow`,
    });
  } else if (firstHire) {
    flags.push({
      warn: false,
      msg: `First artist hired at ${fmtTime(firstHire.simTime)} — early game has quick first milestone`,
    });
  }

  // Check media tier gap (Pencil→Charcoal: 0→100 is fine, check others)
  const mediaCosts = MEDIA_TIERS.map((t) => t.cost);
  for (let i = 1; i < mediaCosts.length - 1; i++) {
    const ratio = (mediaCosts[i + 1] ?? 1) / Math.max(mediaCosts[i] ?? 1, 1);
    if (ratio > 100) {
      flags.push({
        warn: true,
        msg: `Large cost gap: ${MEDIA_TIERS[i]?.name} (${fmtNum(mediaCosts[i] ?? 0)}) → ${MEDIA_TIERS[i + 1]?.name} (${fmtNum(mediaCosts[i + 1] ?? 0)})  ratio: ×${Math.round(ratio)}`,
      });
    }
  }

  // Check for media tiers that boost but were never reached
  const maxMediaReached = Math.max(...snapshots.map((s) => s.mediaTier));
  if (maxMediaReached < MEDIA_TIERS.length - 1) {
    const nextUnreached = MEDIA_TIERS[maxMediaReached + 1];
    if (nextUnreached) {
      flags.push({
        warn: false,
        msg: `${MEDIA_TIERS.length - 1 - maxMediaReached} media tier(s) not reached — next: ${nextUnreached.name} at ${fmtNum(nextUnreached.cost)} strokes`,
      });
    }
  }

  for (const f of flags) {
    console.log(`  ${f.warn ? "⚠" : "✓"} ${f.msg}`);
  }
  console.log();

  // ── Final State Summary ───────────────────────────────────────────────────
  console.log(hr);
  console.log("  FINAL STATE SUMMARY");
  console.log(hr);
  const fs = finalSnap;
  if (fs) {
    console.log(
      `  Time elapsed    : ${fmtTime(result.durationSecs)}  (${DURATION_MINUTES} min simulated)`
    );
    console.log(`  Total strokes   : ${fmtNum(s.totalStrokes + s.lifetimeStrokes)} lifetime`);
    console.log(`  Media tier      : ${s.mediaTier} (${MEDIA_TIERS[s.mediaTier]?.name})`);
    console.log(`  Swords          : ${s.unlockedSwords.length}/${SWORD_DEFS.length}`);
    console.log(
      `  Achievements    : ${s.unlockedAchievements.length}/${ACHIEVEMENT_DEFS.length}`
    );
    console.log(`  Total artists   : ${totalArtists(s)}`);
    console.log(`  Prestige count  : ${s.prestigeCount}`);
    if (s.prestigeCount > 0) {
      const upgSummary = Object.entries(s.prestigeUpgrades)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => {
          const def = PRESTIGE_UPGRADE_DEFS.find((d) => d.id === k);
          return `${def?.name ?? k} ×${v}`;
        })
        .join(", ");
      console.log(`  Prestige upgrades: ${upgSummary || "none"}`);
    }
    console.log(`  Effective click : ${fmtNum(fs.effectiveClickPower)}/click`);
    console.log(`  Effective passive: ${fmtNum(fs.effectivePassiveRate)}/sec`);
    console.log(`  Total income    : ${fmtNum(fs.totalIncome)}/sec`);
  }
  console.log();
  console.log(hr2);
  console.log();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const result = simulate();
printReport(result);
