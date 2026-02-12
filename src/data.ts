// Sword Art Click — Static data definitions

import type {
  AchievementDef,
  ArtistDef,
  GameState,
  MediaTier,
  PrestigeUpgradeDef,
  SwordDef,
  UpgradeDef,
} from "./types.ts";

export const SAVE_KEY = "swordArtClick_save";
export const SAVE_INTERVAL = 30_000;
export const TICK_RATE = 100;
export const COST_SCALE = 1.12;
export const ARTIST_COST_SCALE = 1.15;
export const MAX_OFFLINE_HOURS = 8;
export const COLLAPSE_KEY = "swordArtClick_collapsed";
export const PRESTIGE_THRESHOLD = 10_000_000;

export const MEDIA_TIERS: MediaTier[] = [
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

export const SWORD_DEFS: SwordDef[] = [
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

export const ARTIST_DEFS: ArtistDef[] = [
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

export const UPGRADE_DEFS: UpgradeDef[] = [
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

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "firstStroke",
    name: "First Stroke",
    desc: "Draw your first sword",
    check: (s: GameState) => s.totalClicks >= 1,
  },
  {
    id: "sharpWit",
    name: "Sharp Wit",
    desc: "Reach 1,000 Strokes",
    check: (s: GameState) => s.totalStrokes >= 1_000,
  },
  {
    id: "cuttingEdge",
    name: "Cutting Edge",
    desc: "Buy your first media upgrade",
    check: (s: GameState) => s.mediaTier >= 1,
  },
  {
    id: "artOfWar",
    name: "The Art of War",
    desc: "Own 10 artists total",
    check: (s: GameState) => {
      let total = 0;
      for (const id in s.artists) total += s.artists[id] ?? 0;
      return total >= 10;
    },
  },
  {
    id: "sketchyBusiness",
    name: "Sketchy Business",
    desc: "Click 10,000 times",
    check: (s: GameState) => s.totalClicks >= 10_000,
  },
  {
    id: "drawnOut",
    name: "Drawn Out",
    desc: "Play for 30 minutes",
    check: (s: GameState) => Date.now() - s.playStartTime >= 30 * 60 * 1000,
  },
  {
    id: "fineLine",
    name: "A Fine Line",
    desc: "Reach 1,000,000 Strokes",
    check: (s: GameState) => s.totalStrokes >= 1_000_000,
  },
  {
    id: "foiledAgain",
    name: "Foiled Again",
    desc: "Reach the Ink & Quill media tier",
    check: (s: GameState) => s.mediaTier >= 2,
  },
  {
    id: "oilsWell",
    name: "Oil's Well That Ends Well",
    desc: "Reach Oil Painting",
    check: (s: GameState) => s.mediaTier >= 4,
  },
  {
    id: "pixelPerfect",
    name: "Pixel Perfect",
    desc: "Reach Digital Art",
    check: (s: GameState) => s.mediaTier >= 5,
  },
  {
    id: "aiOverlords",
    name: "I, For One, Welcome Our AI Overlords",
    desc: "Reach AI-Generated",
    check: (s: GameState) => s.mediaTier >= 6,
  },
];

export const PRESTIGE_UPGRADE_DEFS: PrestigeUpgradeDef[] = [
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
