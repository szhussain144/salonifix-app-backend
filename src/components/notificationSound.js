/*
 * The notification chime: two soft notes made with the Web Audio API (no sound file).
 * Browsers only allow sound after the person has interacted with the page, so the audio is
 * unlocked on the first click or key press. Muting is remembered per browser.
 */
const MUTE_KEY = "notificationSound";
let audio = null;

function context() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audio ??= new Ctx();
  return audio;
}

/** Call once: the first interaction with the page allows the chime to play later. */
export function unlockSoundOnFirstInteraction() {
  const unlock = () => {
    const ctx = context();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function isSoundOn() {
  try {
    return localStorage.getItem(MUTE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem(MUTE_KEY, on ? "on" : "off");
  } catch {
    // Private mode: the choice lasts until the page is reloaded.
  }
}

export function playChime() {
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const start = ctx.currentTime + 0.02;
  // A rising major sixth (A5 -> F#6): noticeable but gentle.
  [
    [880, 0],
    [1480, 0.13],
  ].forEach(([freq, offset]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = start + offset;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}
