export const FORM_THRESHOLDS = {
  HIP_SAG_THRESHOLD: 0.04,
  PIKE_THRESHOLD: -0.04,
  MIN_DEPTH_ANGLE: 110,
  MIN_LOCKOUT_ANGLE: 160,
  HEAD_CRANE_THRESHOLD: 25,
  REP_START_ANGLE: 140,
  REP_BOTTOM_ANGLE: 120,
  REP_COMPLETE_ANGLE: 160,
  CUE_COOLDOWN_MS: 4000,
  ESCALATION_THRESHOLD: 3,
};

export const CUE_TEXT: Record<
  string,
  { screen: string; voice: string; escalation: string }
> = {
  hip_sag: {
    screen: "⚠️ Raise your hips",
    voice: "Try to keep your hips in line with your shoulders",
    escalation:
      "You've had hip sag for several reps. Try pausing and resetting your position.",
  },
  depth: {
    screen: "⬇️ Go deeper",
    voice: "Try to lower your chest closer to the ground",
    escalation:
      "Your reps are still shallow. Focus on bending your elbows to at least ninety degrees.",
  },
  pike: {
    screen: "⬇️ Lower your hips",
    voice: "Your hips are too high. Flatten out your body.",
    escalation:
      "Your hips keep piking up. Think about making a straight line from head to heels.",
  },
  head_crane: {
    screen: "🔄 Neutral neck",
    voice: "Look at the ground just ahead of your hands",
    escalation:
      "Keep your neck neutral. Pick a spot on the floor and keep looking at it.",
  },
  lockout: {
    screen: "⬆️ Fully extend arms",
    voice: "Push all the way up and lock your arms out",
    escalation:
      "Make sure you're fully extending at the top of each rep.",
  },
};

export const POSITIVE_CUES = {
  great_rep: "Nice rep! Great form.",
  session_start:
    "Get into push-up position. I'll start tracking when you're ready.",
  session_end: "Great session! Generating your report now.",
};

export const AUDIO_CUE_IDS = [
  "hip_sag",
  "depth",
  "pike",
  "head_crane",
  "lockout",
  "hip_sag_escalation",
  "depth_escalation",
  "pike_escalation",
  "head_crane_escalation",
  "lockout_escalation",
  "great_rep",
  "session_start",
  "session_end",
] as const;
