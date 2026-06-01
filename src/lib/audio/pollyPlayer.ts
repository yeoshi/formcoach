import { AUDIO_CUE_IDS } from "@/lib/constants";
import { synthesizeSpeech } from "@/lib/api/polly";

const audioMap = new Map<string, HTMLAudioElement>();
let currentAudio: HTMLAudioElement | null = null;

export function preloadAudio(): void {
  if (typeof window === "undefined") return;
  AUDIO_CUE_IDS.forEach((cueId) => {
    const audio = new Audio(`/audio/${cueId}.mp3`);
    audio.preload = "auto";
    audioMap.set(cueId, audio);
  });
}

export function playCue(cueId: string): void {
  const audio = audioMap.get(cueId);
  if (!audio) {
    console.warn(`Audio cue not found: ${cueId}`);
    return;
  }

  if (currentAudio && currentAudio !== audio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  currentAudio = audio;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Silent fail if autoplay blocked
  });
}

export async function playDynamicCue(text: string): Promise<void> {
  try {
    const blob = await synthesizeSpeech(text);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    currentAudio = audio;
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Dynamic cue failed:", err);
  }
}

export function isAudioPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}
