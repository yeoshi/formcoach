export const FORM_THRESHOLDS = {
  HIP_SAG_THRESHOLD: 0.07,
  PIKE_THRESHOLD: -0.07,
  MIN_DEPTH_ANGLE: 120,
  MIN_LOCKOUT_ANGLE: 150,
  HEAD_CRANE_THRESHOLD: 35,
  REP_START_ANGLE: 145,
  REP_BOTTOM_ANGLE: 125,
  REP_COMPLETE_ANGLE: 155,
  CUE_COOLDOWN_MS: 4000,
  ESCALATION_THRESHOLD: 3,
};

/** Min share of rep frames with a rule active before flagging the rep */
export const REP_VIOLATION_FRAME_RATIO = 0.3;

/** Single-frame severity that flags a rep even below the frame ratio */
export const HIGH_SEVERITY_THRESHOLD = 0.85;

/** Min ms between rep phase transitions */
export const MIN_PHASE_TRANSITION_MS = 500;

/** Hold duration before auto countdown */
export const SETUP_HOLD_MS = 3000;

/** @deprecated use SETUP_HOLD_MS */
export const CALIBRATION_HOLD_MS = SETUP_HOLD_MS;

/** IPPT timed mode duration */
export const IPPT_DURATION_SECONDS = 60;

/** Violations that invalidate a rep (do not count toward successful total) */
export const CRITICAL_VIOLATION_RULES = [
  "hip_sag",
  "depth",
  "pike",
] as const;

/** Shoulder–hip must be within this many degrees of horizontal to check head crane */
export const PUSHUP_HORIZONTAL_TOLERANCE_DEG = 30;

/** Short on-screen commands (single line, uppercase) */
export const SCREEN_CUE: Record<string, string> = {
  hip_sag: "RAISE YOUR HIPS",
  depth: "GO DEEPER",
  pike: "LOWER YOUR HIPS",
  head_crane: "LOOK AT THE FLOOR",
  lockout: "FULLY EXTEND ARMS",
  great_rep: "NICE REP! ✅",
  great_streak: "GREAT FORM! 🔥",
};

/** Rules shown with red error banner */
export const ERROR_SCREEN_RULES = ["hip_sag", "depth", "lockout"] as const;

/** Rules shown with yellow warning banner */
export const WARNING_SCREEN_RULES = ["pike", "head_crane"] as const;

export const CUE_TEXT: Record<
  string,
  { screen: string; voice: string; escalation: string }
> = {
  hip_sag: {
    screen: SCREEN_CUE.hip_sag,
    voice: "Try to keep your hips in line with your shoulders",
    escalation:
      "You've had hip sag for several reps. Try pausing and resetting your position.",
  },
  depth: {
    screen: SCREEN_CUE.depth,
    voice: "Try to lower your chest closer to the ground",
    escalation:
      "Your reps are still shallow. Focus on bending your elbows to at least ninety degrees.",
  },
  pike: {
    screen: SCREEN_CUE.pike,
    voice: "Your hips are too high. Flatten out your body.",
    escalation:
      "Your hips keep piking up. Think about making a straight line from head to heels.",
  },
  head_crane: {
    screen: SCREEN_CUE.head_crane,
    voice: "Look at the ground just ahead of your hands",
    escalation:
      "Keep your neck neutral. Pick a spot on the floor and keep looking at it.",
  },
  lockout: {
    screen: SCREEN_CUE.lockout,
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
