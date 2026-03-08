/**
 * Splash Page Audio Engine — Web Audio API
 *
 * Creates an immersive soundscape for the intro:
 * 1. Low-frequency drone (110Hz) with slow fade-in
 * 2. Ascending radar pings synced to ring animations (every 0.6s)
 * 3. Exit sweep (high→low) on dismiss
 *
 * Zero dependencies, zero audio files.
 */

let audioCtx = null;
let droneOsc = null;
let droneGain = null;
let pingTimer = null;
let isPlaying = false;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Resume AudioContext after user gesture (autoplay policy).
 * Call this on the first click/touch on the splash container.
 */
export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Start the splash soundscape — drone + radar pings
 */
export function startSplashAudio() {
  if (isPlaying) return;
  isPlaying = true;

  try {
    const ctx = getContext();
    const now = ctx.currentTime;

    // ─── 1. Ambient drone — 110Hz sine, slow fade-in ───
    droneOsc = ctx.createOscillator();
    droneGain = ctx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 110;
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(0.06, now + 2.5);
    droneOsc.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneOsc.start(now);

    // Add a subtle sub-harmonic (55Hz) for depth
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.value = 55;
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.03, now + 3);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);

    // ─── 2. Radar pings — ascending C4→E4→G4→B4→D5 ───
    // Synced to ring animation delays: 0, 0.6, 1.2, 1.8, 2.4s
    const pingNotes = [261.63, 329.63, 392.00, 493.88, 587.33]; // C4, E4, G4, B4, D5
    const pingDelay = 0.6;

    function schedulePingCycle(startTime) {
      pingNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const t = startTime + i * pingDelay;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    }

    // First cycle after short delay
    schedulePingCycle(now + 0.5);

    // Loop every 3s (matching radarPingLarge animation duration)
    pingTimer = setInterval(() => {
      if (audioCtx && audioCtx.state === 'running') {
        schedulePingCycle(audioCtx.currentTime);
      }
    }, 3000);
  } catch {
    // Silently fail if audio not available
  }
}

/**
 * Stop with exit sweep (high→low) — call on "COMENZAR" click
 */
export function stopSplashAudio() {
  if (!audioCtx || !isPlaying) return;
  isPlaying = false;

  try {
    const ctx = audioCtx;
    const now = ctx.currentTime;

    // Stop ping loop
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }

    // Fade out drone
    if (droneGain) {
      droneGain.gain.cancelScheduledValues(now);
      droneGain.gain.setValueAtTime(droneGain.gain.value, now);
      droneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    }
    if (droneOsc) {
      droneOsc.stop(now + 0.7);
      droneOsc = null;
      droneGain = null;
    }

    // ─── Exit sweep: descending 880→55Hz ───
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'sine';
    sweepOsc.frequency.setValueAtTime(880, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(55, now + 0.8);
    sweepGain.gain.setValueAtTime(0.1, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    sweepOsc.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweepOsc.start(now);
    sweepOsc.stop(now + 1);
  } catch {
    // Silently fail
  }
}

/**
 * Full cleanup — call on unmount
 */
export function cleanupSplashAudio() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  if (droneOsc) {
    try { droneOsc.stop(); } catch {}
    droneOsc = null;
    droneGain = null;
  }
  if (audioCtx) {
    try { audioCtx.close(); } catch {}
    audioCtx = null;
  }
  isPlaying = false;
}
