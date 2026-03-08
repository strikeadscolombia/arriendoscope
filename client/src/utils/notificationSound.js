// Synthesized notification sound using Web Audio API
// Clean two-tone "ding" — no audio files needed

let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Warm up the AudioContext by resuming it after a user gesture.
 * Call this once from a document click/touch listener so that
 * future calls to playNewListingSound() (from WebSocket handlers)
 * actually produce audible output.
 */
export function warmupNotificationSound() {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch {
    // Silently fail
  }
}

export function playNewListingSound() {
  try {
    const ctx = getContext();

    // If context is suspended (no user gesture yet), try to resume
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Two quick tones: C6 → E6 (clean, minimal "ding-ding")
    const notes = [1047, 1319]; // Hz
    const now = ctx.currentTime;

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = notes[i];

      // Short envelope: quick attack, fast decay
      const start = now + i * 0.1;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.3);
    }
  } catch {
    // Silently fail if audio not available
  }
}
