let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playCountdownBeep(isGo: boolean) {
  try {
    const ac = ctx();
    if (ac.state === "suspended") {
      void ac.resume();
    }
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.frequency.value = isGo ? 880 : 440;
    const dur = isGo ? 0.22 : 0.1;
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + dur);
  } catch {
    // Web Audio not available — silent
  }
}

export function playTimesUpBuzzer() {
  try {
    const ac = ctx();
    if (ac.state === "suspended") {
      void ac.resume();
    }
    [330, 220].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ac.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2 + i * 0.1);
      osc.start(ac.currentTime + i * 0.1);
      osc.stop(ac.currentTime + 0.25 + i * 0.1);
    });
  } catch {
    // silent
  }
}
