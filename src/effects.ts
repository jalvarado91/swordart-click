// Sword Art Click — Imperative side effects (floating text, notifications, shake, erase)

import { formatNumber } from "./helpers.ts";

// --- Floating click text ---

export function showFloatingText(amount: number, x: number, y: number): void {
  const el = document.createElement("div");
  el.className = "floating-text";
  el.textContent = "+" + formatNumber(amount);
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("float-up"));
  setTimeout(() => el.remove(), 800);
}

// --- Screen shake ---

export function triggerShake(): void {
  const game = document.getElementById("game");
  if (!game) return;
  game.classList.add("shake");
  setTimeout(() => game.classList.remove("shake"), 300);
}

// --- Prestige animation ---

export function triggerEraseAnimation(): void {
  const game = document.getElementById("game");
  if (!game) return;
  game.classList.remove("erasing");
  // Force reflow so re-adding the class restarts the animation
  void game.offsetHeight;
  game.classList.add("erasing");
  setTimeout(() => game.classList.remove("erasing"), 800);
}

// --- Notifications ---

export function showNotification(msg: string): void {
  const container = document.getElementById("notifications");
  if (!container) return;

  const el = document.createElement("div");
  el.className = "notification";
  el.textContent = msg;
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add("show"));

  setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 500);
  }, 3000);
}
