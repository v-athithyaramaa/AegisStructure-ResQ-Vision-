export function playTacticalKlaxon() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  // Two-tone burst: 880Hz -> 440Hz
  osc.type = "square";
  
  const now = ctx.currentTime;
  
  // Tone 1
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.setValueAtTime(880, now + 0.3);
  
  // Tone 2
  osc.frequency.setValueAtTime(440, now + 0.3);
  osc.frequency.setValueAtTime(440, now + 0.6);
  
  // Volume envelope to avoid clicks
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
  gain.gain.setValueAtTime(0.1, now + 0.55);
  gain.gain.linearRampToValueAtTime(0, now + 0.6);
  
  osc.start(now);
  osc.stop(now + 0.6);
}
