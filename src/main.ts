// Sword Art Click — Entry point

import { SAVE_INTERVAL, TICK_RATE } from "./data.ts";
import { state } from "./state.ts";
import { loadGame, saveGame, update } from "./logic.ts";
import { initDOM, render } from "./render.ts";

function gameLoop(): void {
  update();
  render(state);
}

function init(): void {
  loadGame();
  initDOM();
  render(state);

  setInterval(gameLoop, TICK_RATE);
  setInterval(saveGame, SAVE_INTERVAL);
}

init();
