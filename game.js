// Sword Art Click — Core Game

const SAVE_KEY = 'swordArtClick_save';
const SAVE_INTERVAL = 30000;
const TICK_RATE = 100; // ms per tick
const COST_SCALE = 1.12;

// --- Upgrade definitions ---
const UPGRADE_DEFS = [
  {
    id: 'pencilSharpener',
    name: 'Pencil Sharpener',
    desc: 'A sharper point means bolder strokes. +1 per click.',
    baseCost: 10,
    effect: { type: 'click', value: 1 },
  },
  {
    id: 'artStudent',
    name: 'Art Student',
    desc: 'Works for exposure. +1 Stroke/sec.',
    baseCost: 25,
    effect: { type: 'passive', value: 1 },
  },
  {
    id: 'finePoint',
    name: 'Fine Point Pen',
    desc: 'Precision is an art form. +3 per click.',
    baseCost: 75,
    effect: { type: 'click', value: 3 },
  },
  {
    id: 'sketchPad',
    name: 'Sketch Pad',
    desc: 'More pages, more swords. +4 Strokes/sec.',
    baseCost: 150,
    effect: { type: 'passive', value: 4 },
  },
  {
    id: 'calligraphy',
    name: 'Calligraphy Set',
    desc: 'Every stroke is deliberate. +10 per click.',
    baseCost: 400,
    effect: { type: 'click', value: 10 },
  },
  {
    id: 'draftingTable',
    name: 'Drafting Table',
    desc: 'Professional-grade sword sketching. +15 Strokes/sec.',
    baseCost: 1000,
    effect: { type: 'passive', value: 15 },
  },
];

// --- Game state ---
let state = createDefaultState();

function createDefaultState() {
  return {
    strokes: 0,
    totalStrokes: 0,
    clickPower: 1,
    passiveRate: 0, // strokes per second
    upgrades: {},   // id -> count owned
    lastSave: Date.now(),
  };
}

// --- Cost calculation ---
function getUpgradeCost(def) {
  const owned = state.upgrades[def.id] || 0;
  return Math.floor(def.baseCost * Math.pow(COST_SCALE, owned));
}

// --- Upgrade purchase ---
function buyUpgrade(def) {
  const cost = getUpgradeCost(def);
  if (state.strokes < cost) return;

  state.strokes -= cost;
  state.upgrades[def.id] = (state.upgrades[def.id] || 0) + 1;

  if (def.effect.type === 'click') {
    state.clickPower += def.effect.value;
  } else if (def.effect.type === 'passive') {
    state.passiveRate += def.effect.value;
  }

  saveGame();
  renderUpgrades();
  updateDisplay();
}

// --- Click handler ---
function handleClick() {
  state.strokes += state.clickPower;
  state.totalStrokes += state.clickPower;
  updateDisplay();
}

// --- Tick (passive income) ---
function tick() {
  if (state.passiveRate > 0) {
    const gain = state.passiveRate * (TICK_RATE / 1000);
    state.strokes += gain;
    state.totalStrokes += gain;
    updateDisplay();
  }
}

// --- Display ---
function updateDisplay() {
  document.getElementById('strokes-count').textContent = Math.floor(state.strokes).toLocaleString();
  document.getElementById('per-click').textContent = state.clickPower.toLocaleString();
  document.getElementById('per-second').textContent = state.passiveRate.toLocaleString();

  // Update upgrade button states
  for (const def of UPGRADE_DEFS) {
    const btn = document.getElementById('upgrade-' + def.id);
    if (btn) {
      const cost = getUpgradeCost(def);
      btn.disabled = state.strokes < cost;
      btn.querySelector('.upgrade-cost').textContent = cost.toLocaleString() + ' Strokes';
      const owned = state.upgrades[def.id] || 0;
      btn.querySelector('.upgrade-owned').textContent = owned > 0 ? 'Owned: ' + owned : '';
    }
  }
}

function renderUpgrades() {
  const list = document.getElementById('upgrades-list');
  list.innerHTML = '';

  for (const def of UPGRADE_DEFS) {
    const cost = getUpgradeCost(def);
    const owned = state.upgrades[def.id] || 0;

    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.id = 'upgrade-' + def.id;
    btn.disabled = state.strokes < cost;
    btn.innerHTML = `
      <div class="upgrade-name">
        ${def.name}
        <span class="upgrade-cost">${cost.toLocaleString()} Strokes</span>
      </div>
      <div class="upgrade-desc">${def.desc}</div>
      <div class="upgrade-owned">${owned > 0 ? 'Owned: ' + owned : ''}</div>
    `;
    btn.addEventListener('click', () => buyUpgrade(def));
    list.appendChild(btn);
  }
}

// --- Save / Load ---
function saveGame() {
  state.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage might be full or unavailable
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved.strokes !== 'number') return;

    state = { ...createDefaultState(), ...saved };

    // Recalculate derived stats from owned upgrades
    state.clickPower = 1;
    state.passiveRate = 0;
    for (const def of UPGRADE_DEFS) {
      const owned = state.upgrades[def.id] || 0;
      if (owned > 0) {
        if (def.effect.type === 'click') {
          state.clickPower += def.effect.value * owned;
        } else if (def.effect.type === 'passive') {
          state.passiveRate += def.effect.value * owned;
        }
      }
    }
  } catch (e) {
    // Corrupted save, start fresh
  }
}

// --- Init ---
function init() {
  loadGame();
  renderUpgrades();
  updateDisplay();

  document.getElementById('draw-btn').addEventListener('click', handleClick);

  // Game tick
  setInterval(tick, TICK_RATE);

  // Auto-save
  setInterval(saveGame, SAVE_INTERVAL);
}

init();
