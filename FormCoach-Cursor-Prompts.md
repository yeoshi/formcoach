# FormCoach — Master Cursor Prompt

> **How to use this file:** Paste the Phase 0 prompt first to scaffold the project. Then paste each subsequent phase prompt into Cursor Composer one at a time. Wait for each phase to finish and test before moving to the next. Don't skip phases — they build on each other.

---

## Phase 0: Project Scaffold

```
Create a Next.js 14 app (App Router) called "formcoach" with the following setup:

Tech stack:
- Next.js 14 with App Router (TypeScript)
- Tailwind CSS
- No authentication

Project structure:
src/
  app/
    layout.tsx          — root layout with global styles, font loading
    page.tsx            — home page (session history + start CTA)
    session/
      page.tsx          — live webcam session view
    report/
      [id]/
        page.tsx        — post-session report view
  components/
    ui/                 — reusable UI primitives
      Button.tsx
      Card.tsx
      ProgressBar.tsx
      Badge.tsx
    session/
      PoseDetector.tsx  — webcam + MediaPipe integration
      SkeletonOverlay.tsx — draws pose landmarks on canvas
      FormFeedback.tsx  — on-screen text overlay for corrections
      RepCounter.tsx    — live rep count display
      SessionControls.tsx — start/end session buttons
    report/
      ReportCard.tsx    — full post-session report layout
      IssueCard.tsx     — individual form issue with frame
      RepTimeline.tsx   — rep-by-rep breakdown
    home/
      SessionHistoryCard.tsx — past session summary card
      HeroSection.tsx   — landing hero with CTA
  lib/
    pose/
      mediapose.ts      — MediaPipe Pose setup and config
      angles.ts         — angle calculation utilities
      ruleEngine.ts     — push-up form rules + rep state machine
      types.ts          — all pose/form related types
    audio/
      pollyPlayer.ts    — audio cue playback manager
    api/
      bedrock.ts        — Bedrock API call for report generation
      polly.ts          — Polly TTS API call (for dynamic cues)
    storage/
      sessions.ts       — localStorage CRUD for session data
    constants.ts        — thresholds, cue texts, config values
    types.ts            — global shared types
  hooks/
    usePoseDetection.ts — hook wrapping MediaPipe lifecycle
    useFormAnalysis.ts  — hook for rule engine + violation tracking
    useAudioCues.ts     — hook for playing voice cues with throttling
    useSessionRecorder.ts — hook for capturing frames + building session data

Design system:
- Font: Inter for body, font-mono for data/numbers
- Color palette:
    --bg: #0A0A0B (near black)
    --surface: #141416
    --surface-hover: #1C1C1F
    --border: #2A2A2E
    --text-primary: #F5F5F7
    --text-secondary: #8E8E93
    --accent-green: #30D158
    --accent-red: #FF453A
    --accent-amber: #FFD60A
    --accent-blue: #0A84FF
- Dark theme only
- Rounded corners: 12px for cards, 8px for buttons
- Subtle glass-morphism on cards: bg-opacity + backdrop-blur

Create all the files with placeholder content and correct imports.
Each component should have a basic skeleton with a TODO comment for implementation.
Make sure the app compiles and runs with `npm run dev`.
```

---

## Phase 1: MediaPipe Pose Detection + Webcam

```
Implement real-time pose detection using MediaPipe Pose in the browser.

### File: src/lib/pose/mediapose.ts

Set up MediaPipe Pose using the @mediapipe/pose package (or CDN):
- Install: @mediapipe/pose, @mediapipe/camera_utils, @mediapipe/drawing_utils
- If npm install has issues, use CDN instead:
  https://cdn.jsdelivr.net/npm/@mediapipe/pose
  https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils
  https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils

Configuration:
- modelComplexity: 1 (balanced speed/accuracy)
- smoothLandmarks: true
- enableSegmentation: false
- minDetectionConfidence: 0.7
- minTrackingConfidence: 0.5

Export a function initPose(videoElement, onResults) that:
1. Creates Pose instance with config above
2. Creates Camera instance from camera_utils bound to the video element
3. On each results callback, passes NormalizedLandmarkList to onResults
4. Returns cleanup function to stop camera + close pose

### File: src/lib/pose/types.ts

```typescript
export interface Landmark {
  x: number;  // 0-1 normalized
  y: number;  // 0-1 normalized
  z: number;  // depth
  visibility: number;  // 0-1 confidence
}

export interface PoseFrame {
  landmarks: Landmark[];
  timestamp: number;
}

export type RepPhase = 'idle' | 'descending' | 'ascending' | 'complete';

export interface RepState {
  phase: RepPhase;
  repCount: number;
  minElbowAngle: number;    // tracks lowest angle in current rep
  maxElbowAngle: number;    // tracks highest angle in current rep
  lastPhaseChange: number;  // timestamp
}

export type ViolationRule = 'hip_sag' | 'depth' | 'pike' | 'head_crane' | 'lockout';

export interface Violation {
  rule: ViolationRule;
  severity: number;       // 0-1
  message: string;        // on-screen text
  voiceCueId: string;     // maps to audio file
  timestamp: number;
  repNumber: number;
}

export interface FormCheckResult {
  violations: Violation[];
  repState: RepState;
  bodyAlignment: {
    hipDeviation: number;
    isAligned: boolean;
  };
}

export interface FlaggedFrame {
  imageBase64: string;
  timestamp: number;
  violation: ViolationRule;
  repNumber: number;
}

export interface RepData {
  repNumber: number;
  minElbowAngle: number;
  hipDeviation: number;
  durationSeconds: number;
  violations: ViolationRule[];
  formScore: number;  // per-rep score
}
```

### File: src/hooks/usePoseDetection.ts

Create a React hook that:
1. Takes a ref to a <video> element
2. Initializes MediaPipe Pose on mount
3. Returns: { landmarks: Landmark[] | null, isLoading: boolean, error: string | null }
4. Cleans up on unmount
5. Handles the case where webcam permission is denied gracefully

### File: src/components/session/PoseDetector.tsx

Create the main webcam + canvas component:
1. Render a <video> element (hidden, muted, playsInline)
2. Render a <canvas> element on top (same dimensions, position: absolute)
3. Use usePoseDetection hook to get landmarks
4. On each frame:
   a. Draw the mirrored video frame to canvas (scale(-1,1) for mirror effect)
   b. Draw skeleton overlay using @mediapipe/drawing_utils:
      - Connectors: 2.5px, rgba(48, 209, 88, 0.6) [accent-green with opacity]
      - Landmark dots: 5px circles, white fill
      - Key joints (shoulder, elbow, wrist, hip, ankle): 7px circles, #FFD60A fill
5. Canvas should be responsive and fill its container while maintaining 4:3 aspect ratio
6. Show a loading spinner while MediaPipe model loads
7. Show a permission prompt if webcam access is denied

Pass landmarks up to parent via onPoseUpdate callback prop.
```

---

## Phase 2: Form Rule Engine + Rep Counter

```
Implement the push-up form analysis engine.

### File: src/lib/pose/angles.ts

Utility functions for pose math:

1. calculateAngle(a: Landmark, b: Landmark, c: Landmark): number
   - Returns the angle in degrees at vertex point b
   - Uses atan2 for the angle between vectors ba and bc
   - Returns value between 0 and 180

2. getPerpendicularDistance(point: Landmark, lineStart: Landmark, lineEnd: Landmark): number
   - Returns signed perpendicular distance of point from the line
   - Positive = point is BELOW the line, negative = point is ABOVE
   - Used for hip sag/pike detection

3. getVisibleSide(landmarks: Landmark[]): 'left' | 'right'
   - Compare average visibility of left landmarks (11,13,15,23,27) vs right (12,14,16,24,28)
   - Return whichever side has higher average visibility
   - This determines which side of the body we analyze (since camera is to the side)

4. getLandmarksBySize(landmarks: Landmark[], side: 'left' | 'right'): object
   - Return the relevant landmarks for the visible side:
     { shoulder, elbow, wrist, hip, knee, ankle, ear }
   - Left side indices: shoulder=11, elbow=13, wrist=15, hip=23, knee=25, ankle=27, ear=7
   - Right side indices: shoulder=12, elbow=14, wrist=16, hip=24, knee=26, ankle=28, ear=8

### File: src/lib/constants.ts

```typescript
export const FORM_THRESHOLDS = {
  // Hip sag: hip drops below shoulder-ankle line
  HIP_SAG_THRESHOLD: 0.04,        // normalized distance (4% of frame height)

  // Pike: hip rises above shoulder-ankle line
  PIKE_THRESHOLD: -0.04,           // negative = above line

  // Depth: elbow angle at bottom of rep
  MIN_DEPTH_ANGLE: 110,            // if elbow angle > 110° at bottom, too shallow

  // Lockout: elbow angle at top of rep
  MIN_LOCKOUT_ANGLE: 160,          // if elbow angle < 160° at top, not full extension

  // Head crane: angle deviation between ear-shoulder and shoulder-hip
  HEAD_CRANE_THRESHOLD: 25,        // degrees of deviation

  // Rep detection
  REP_START_ANGLE: 140,            // elbow angle threshold to start descending phase
  REP_BOTTOM_ANGLE: 120,           // below this = definitely in the bottom
  REP_COMPLETE_ANGLE: 160,         // above this = rep complete

  // Feedback throttling
  CUE_COOLDOWN_MS: 4000,           // same cue can't repeat within 4s
  ESCALATION_THRESHOLD: 3,         // consecutive reps with same violation → escalate
};

export const CUE_TEXT: Record<string, { screen: string; voice: string; escalation: string }> = {
  hip_sag: {
    screen: "⚠️ Raise your hips",
    voice: "Try to keep your hips in line with your shoulders",
    escalation: "You've had hip sag for several reps. Try pausing and resetting your position.",
  },
  depth: {
    screen: "⬇️ Go deeper",
    voice: "Try to lower your chest closer to the ground",
    escalation: "Your reps are still shallow. Focus on bending your elbows to at least ninety degrees.",
  },
  pike: {
    screen: "⬇️ Lower your hips",
    voice: "Your hips are too high. Flatten out your body.",
    escalation: "Your hips keep piking up. Think about making a straight line from head to heels.",
  },
  head_crane: {
    screen: "🔄 Neutral neck",
    voice: "Look at the ground just ahead of your hands",
    escalation: "Keep your neck neutral. Pick a spot on the floor and keep looking at it.",
  },
  lockout: {
    screen: "⬆️ Fully extend arms",
    voice: "Push all the way up and lock your arms out",
    escalation: "Make sure you're fully extending at the top of each rep.",
  },
};

export const POSITIVE_CUES = {
  great_rep: "Nice rep! Great form.",
  session_start: "Get into push-up position. I'll start tracking when you're ready.",
  session_end: "Great session! Generating your report now.",
};
```

### File: src/lib/pose/ruleEngine.ts

The main form analysis engine:

1. createRepStateMachine(): RepState
   - Returns initial state: { phase: 'idle', repCount: 0, minElbowAngle: 180, maxElbowAngle: 0, lastPhaseChange: Date.now() }

2. updateRepState(state: RepState, elbowAngle: number): RepState
   State machine logic:
   - IDLE: if elbowAngle < REP_START_ANGLE → transition to DESCENDING
   - DESCENDING: track minElbowAngle. If elbowAngle starts increasing (current > min + 10°) → ASCENDING
   - ASCENDING: track maxElbowAngle. If elbowAngle > REP_COMPLETE_ANGLE → COMPLETE
   - COMPLETE: increment repCount, reset min/max angles → IDLE

3. checkForm(landmarks: Landmark[], repState: RepState, side: 'left' | 'right'): FormCheckResult
   - Get the relevant landmarks for the visible side
   - Calculate elbow angle (shoulder → elbow → wrist)
   - Calculate body alignment (shoulder → hip → ankle perpendicular distance)
   - Calculate head angle
   - Update rep state

   Apply rules based on rep phase:
   - ALWAYS check: hip_sag, pike, head_crane
   - At rep BOTTOM (descending→ascending): check depth (min elbow angle)
   - At rep TOP (complete): check lockout (max elbow angle)

   Return all violations found + updated repState + bodyAlignment data

4. createFeedbackThrottler()
   - Maintains a map of { [rule]: lastFiredTimestamp }
   - shouldFire(rule: ViolationRule): boolean — returns true only if cooldown has elapsed
   - markFired(rule: ViolationRule): void — records timestamp
   - Track consecutive violations per rule for escalation

### File: src/hooks/useFormAnalysis.ts

Hook that connects pose detection to the rule engine:
1. Takes landmarks as input (from usePoseDetection)
2. Maintains repState, violations array, and repData array via useState/useRef
3. On each landmarks update:
   a. Determine visible side
   b. Run checkForm()
   c. Update rep state
   d. If violations found and throttle allows, emit them via onViolation callback
   e. On rep complete, record RepData
4. Returns: { repCount, currentViolations, repData, allViolations, repState }

### File: src/components/session/RepCounter.tsx

A floating counter component positioned top-right of the canvas:
- Large number showing current rep count (font-mono, 48px, white)
- Small label "REPS" below in text-secondary
- Subtle pulse animation when count increments
- Semi-transparent dark background pill with backdrop-blur

### File: src/components/session/FormFeedback.tsx

On-screen text overlay for form corrections:
- Positioned bottom-center of the canvas
- Shows current violation text (from CUE_TEXT[rule].screen)
- Background: semi-transparent red/amber pill depending on severity
- Animates in with a slide-up + fade, stays for 3 seconds, fades out
- If multiple violations on same frame, show the highest severity one only
- Escalation messages show in a different style (larger, yellow border)
```

---

## Phase 3: Audio Cues (Polly Integration)

```
Implement voice feedback using pre-generated audio files and Amazon Polly for dynamic cues.

### Strategy:
- Pre-generate the ~10 common voice cues as MP3 files using a setup script
- Store them in /public/audio/ as static assets
- Play them instantly from the browser when triggered
- For escalation cues (dynamic text), call Polly API on-demand via our backend

### File: scripts/generate-audio-cues.ts (run once during setup)

Create a Node.js script that:
1. Uses AWS SDK v3 (@aws-sdk/client-polly)
2. For each cue in CUE_TEXT + POSITIVE_CUES:
   - Calls Polly.synthesizeSpeech with:
     - Engine: "neural"
     - VoiceId: "Joanna"
     - OutputFormat: "mp3"
     - Text: the voice cue text
   - Saves the MP3 to public/audio/{cueId}.mp3
3. Logs each file created

The cue files to generate:
- hip_sag.mp3
- depth.mp3
- pike.mp3
- head_crane.mp3
- lockout.mp3
- hip_sag_escalation.mp3
- depth_escalation.mp3
- pike_escalation.mp3
- head_crane_escalation.mp3
- lockout_escalation.mp3
- great_rep.mp3
- session_start.mp3
- session_end.mp3

### File: src/lib/audio/pollyPlayer.ts

Audio playback manager:

1. preloadAudio(): void
   - On app load, create Audio objects for all MP3 files in /public/audio/
   - Store in a Map<string, HTMLAudioElement>
   - This ensures instant playback with no loading delay

2. playCue(cueId: string): void
   - Look up the Audio object in the map
   - If another cue is currently playing, stop it (pause + reset currentTime)
   - Play the new cue
   - Only one voice cue at a time

3. playDynamicCue(text: string): Promise<void>
   - For escalation messages or custom text
   - Call our Next.js API route /api/polly with the text
   - Receive audio stream back
   - Play it via AudioContext or a dynamic Audio element
   - Fallback: if API fails, just show the text on screen (don't block)

### File: src/app/api/polly/route.ts

Next.js API route for on-demand Polly TTS:
- POST request with { text: string } body
- Uses AWS SDK v3 PollyClient
- Credentials from environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
- Calls synthesizeSpeech with neural Joanna voice
- Returns the audio stream as Response with Content-Type: audio/mpeg
- Rate limit: max 1 call per 3 seconds (simple in-memory throttle)
- Error handling: return 500 with error message, don't crash

### File: src/hooks/useAudioCues.ts

Hook that connects violations to audio playback:
1. On mount, call preloadAudio()
2. Expose playViolationCue(violation: Violation, isEscalation: boolean)
   - If escalation: play {rule}_escalation.mp3 or fall back to playDynamicCue
   - If normal: play {rule}.mp3
3. Expose playPositiveCue(cueId: string) for great_rep, session_start, session_end
4. Tracks whether audio is currently playing to prevent overlap
5. Returns: { playViolationCue, playPositiveCue, isPlaying }
```

---

## Phase 4: Session Recording + Frame Capture

```
Implement frame capture for flagged moments and session data collection.

### File: src/hooks/useSessionRecorder.ts

Hook that records session data throughout the exercise:

1. State:
   - sessionStartTime: number
   - flaggedFrames: FlaggedFrame[]
   - repDataList: RepData[]
   - allViolations: Violation[]

2. captureFrame(canvasRef: RefObject<HTMLCanvasElement>, violation: Violation): void
   - Read the canvas content (which already has the skeleton overlay drawn)
   - Convert to base64 JPEG at 0.7 quality using canvas.toDataURL('image/jpeg', 0.7)
   - Store as FlaggedFrame with timestamp, violation rule, and rep number
   - Limit to max 20 flagged frames (drop lowest severity if over limit)

3. recordRep(repData: RepData): void
   - Append to repDataList

4. recordViolation(violation: Violation): void
   - Append to allViolations

5. endSession(): SessionData
   - Calculate total duration
   - Compile all data into a complete Session object
   - Generate a UUID for session ID
   - Save to localStorage via the storage module
   - Return the session data for report generation

6. Returns: { captureFrame, recordRep, recordViolation, endSession, flaggedFrames, repCount }

### File: src/lib/storage/sessions.ts

localStorage CRUD for session persistence:

```typescript
const STORAGE_KEY = 'formcoach_sessions';

export function saveSesison(session: Session): void {
  const sessions = getAllSessions();
  sessions.unshift(session);  // newest first
  // Keep max 20 sessions to avoid localStorage bloat
  if (sessions.length > 20) sessions.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getAllSessions(): Session[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getSession(id: string): Session | null {
  return getAllSessions().find(s => s.id === id) || null;
}

export function deleteSession(id: string): void {
  const sessions = getAllSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
```

Important: Session type includes:
```typescript
export interface Session {
  id: string;
  date: string;               // ISO timestamp
  exercise: 'push-up';
  totalReps: number;
  durationSeconds: number;
  formScore: number;           // 0-100, calculated after Bedrock report
  violations: Violation[];
  repData: RepData[];
  report: BedrockReport | null;
  flaggedFrames: FlaggedFrame[];
}
```
```

---

## Phase 5: Live Session Page (Putting It All Together)

```
Build the full live session page that combines webcam, pose detection, form analysis, audio cues, and frame capture.

### File: src/app/session/page.tsx

This is the main session view. Layout:

┌──────────────────────────────────────────────┐
│  ← Back to Home                FormCoach     │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │                                      │   │
│  │         WEBCAM + CANVAS              │   │
│  │     (with skeleton overlay)          │   │
│  │                                      │   │
│  │                           ┌────┐     │   │
│  │                           │ 05 │     │   │
│  │                           │REPS│     │   │
│  │                           └────┘     │   │
│  │                                      │   │
│  │    ┌────────────────────────────┐    │   │
│  │    │  ⚠️ Raise your hips        │    │   │
│  │    └────────────────────────────┘    │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────┐  ┌───────────────────────┐    │
│  │ ⏱ 01:23  │  │    End Session ■      │    │
│  └──────────┘  └───────────────────────┘    │
│                                              │
│  Setup tip: Position laptop to your side,    │
│  about 1.5m away, at waist height.          │
└──────────────────────────────────────────────┘

Implementation details:

1. View states: 'setup' | 'active' | 'ending' | 'generating'
   - setup: shows webcam preview + positioning guide + "Start" button
   - active: full session with rep counter + form feedback + timer
   - ending: brief "Session complete!" message
   - generating: "Analyzing your form..." with loading skeleton

2. Setup view:
   - Show webcam feed with pose detection active but no form checking
   - Overlay a translucent guide: "Stand to the side of your laptop"
   - Show a reference silhouette of correct push-up starting position
   - When landmarks are detected with good confidence, show green checkmark: "Position detected!"
   - "Start Session" button activates when position is good

3. Active session view:
   - PoseDetector component fills the main area
   - RepCounter overlay top-right
   - FormFeedback overlay bottom-center
   - Timer display below canvas (minutes:seconds, font-mono)
   - "End Session" button with stop icon (red accent)
   - On each frame:
     a. Get landmarks from PoseDetector
     b. Run through useFormAnalysis → get violations + rep data
     c. If violation + throttle allows → show FormFeedback + play audio cue
     d. If violation → capture frame via useSessionRecorder
     e. On rep complete → record rep data

4. Ending flow:
   - User clicks "End Session"
   - Play session_end audio cue
   - Show "Session complete! 🎉" for 2 seconds
   - Transition to 'generating' state
   - Call endSession() to compile data
   - Call Bedrock API to generate report
   - Save complete session (with report) to localStorage
   - Redirect to /report/[sessionId]

5. Edge case handling:
   - If webcam permission denied: show friendly message with instructions to enable
   - If MediaPipe fails to load: show error with retry button
   - If person leaves frame during session: pause form checking, show "Step back into frame"
   - If Bedrock API fails: save session without report, show "Report generation failed" with retry button on report page

Canvas sizing:
- Max width: 800px
- Maintain 4:3 aspect ratio
- Center horizontally
- On mobile: full width
```

---

## Phase 6: Bedrock Integration (Post-Session Report)

```
Implement the AWS Bedrock API call for generating the post-session coaching report.

### File: src/app/api/report/route.ts

Next.js API route for Bedrock report generation:

POST /api/report
Body: { sessionData: SessionDataForReport }

Where SessionDataForReport is a slimmed version (no base64 frames sent to Bedrock):
```typescript
{
  exercise: "push-up",
  totalReps: number,
  durationSeconds: number,
  violations: {
    rule: string,
    repNumber: number,
    severity: number,
    timestamp: number,
  }[],
  repData: {
    repNumber: number,
    minElbowAngle: number,
    hipDeviation: number,
    durationSeconds: number,
    violations: string[],
  }[]
}
```

Implementation:
1. Use AWS SDK v3: @aws-sdk/client-bedrock-runtime
2. Credentials from env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
3. Call InvokeModel with:
   - modelId: "anthropic.claude-sonnet-4-20250514-v1:0" (or latest available Claude on Bedrock)
   - System prompt:

```
You are a friendly, encouraging fitness coach analyzing a push-up session.
You receive structured data about the user's reps and form violations.

Respond ONLY with valid JSON (no markdown fences, no preamble). Schema:

{
  "summary": "2-3 sentences on how the session went. Be encouraging but honest.",
  "formScore": 0-100 integer based on violation frequency and severity,
  "topIssues": [
    {
      "rule": "hip_sag",
      "count": 4,
      "explanation": "One sentence explaining what happened in plain English.",
      "fix": "One specific, actionable tip to correct this. Be concrete.",
      "frameIndex": 0
    }
  ],
  "nextSessionFocus": "One sentence — the single most important thing to work on next time.",
  "repBreakdown": [
    {
      "repNumber": 1,
      "status": "good" | "minor_issues" | "needs_work",
      "note": "Optional very short note (5 words max)"
    }
  ]
}

Rules for scoring:
- Start at 100, deduct points per violation
- hip_sag/pike: -5 per occurrence
- depth: -4 per occurrence
- lockout: -3 per occurrence
- head_crane: -2 per occurrence
- Minimum score: 20 (don't go below even for bad sessions — keep it encouraging)
- Round to nearest 5

Rules for topIssues:
- Max 3 issues, sorted by count descending
- frameIndex should reference which flagged frame best shows this issue (0-indexed)
- If there are no violations at all, return empty topIssues array and formScore of 95-100

Tone: Like a supportive gym buddy. Use "you" not "the user". Short sentences. No jargon.
```

   - User message: JSON.stringify(sessionData)
   - max_tokens: 1024
   - temperature: 0.3 (low creativity, consistent output)

4. Parse the response:
   - Strip any markdown fences if present
   - JSON.parse the response
   - Validate the structure matches BedrockReport type
   - If parsing fails, return a fallback report with basic stats

5. Return the parsed report as JSON response

### File: src/lib/api/bedrock.ts

Client-side function to call our API route:

```typescript
export async function generateReport(sessionData: SessionDataForReport): Promise<BedrockReport> {
  const response = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionData }),
  });

  if (!response.ok) {
    throw new Error(`Report generation failed: ${response.status}`);
  }

  return response.json();
}
```
```

---

## Phase 7: Post-Session Report Page

```
Build the post-session report page showing the AI-generated coaching analysis with annotated frames.

### File: src/app/report/[id]/page.tsx

Fetches session from localStorage by ID and renders the full report.

Layout:

┌──────────────────────────────────────────────┐
│  ← Back to Home                FormCoach     │
├──────────────────────────────────────────────┤
│                                              │
│  SESSION COMPLETE ✅                         │
│  June 9, 2026 · Push-ups                    │
│                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │   12   │  │  1:27  │  │   74   │        │
│  │  reps  │  │  time  │  │ score  │        │
│  └────────┘  └────────┘  └────────┘        │
│                                              │
│  ████████████████░░░░░░  74/100             │
│  "Good effort! You maintained solid form..." │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  TOP ISSUES TO FIX                           │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  1. Hip Sag · 4 reps                 │   │
│  │  ┌────────────────────────────────┐  │   │
│  │  │                                │  │   │
│  │  │  [Flagged frame with skeleton  │  │   │
│  │  │   overlay — hip area           │  │   │
│  │  │   highlighted in red]          │  │   │
│  │  │                                │  │   │
│  │  └────────────────────────────────┘  │   │
│  │                                      │   │
│  │  Your hips dropped below your body   │   │
│  │  line on 4 out of 12 reps.          │   │
│  │                                      │   │
│  │  💡 Squeeze your glutes and imagine  │   │
│  │  balancing a cup of water on your    │   │
│  │  lower back.                         │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  2. Insufficient Depth · 3 reps      │   │
│  │  [similar card layout]               │   │
│  └──────────────────────────────────────┘   │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  🎯 NEXT SESSION FOCUS                       │
│  ┌──────────────────────────────────────┐   │
│  │  Focus on keeping your hips level.   │   │
│  │  Do 3 slow reps before your set to   │   │
│  │  lock in the feeling.                │   │
│  └──────────────────────────────────────┘   │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  REP-BY-REP BREAKDOWN                        │
│                                              │
│  Rep 1  ✅  Good form                        │
│  Rep 2  ✅  Good form                        │
│  Rep 3  ⚠️  Hip sag                         │
│  Rep 4  ✅  Good form                        │
│  Rep 5  ⚠️  Hip sag, shallow                │
│  Rep 6  ✅  Good form                        │
│  ...                                         │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │       Start New Session →             │   │
│  └──────────────────────────────────────┘   │
│                                              │
└──────────────────────────────────────────────┘

### Component details:

1. ReportCard.tsx — the main wrapper
   - Fetches session from localStorage on mount
   - If session not found, show "Session not found" with link to home
   - If session.report is null, show "Report still generating..." with retry button
   - Otherwise, render all sub-components

2. Stats row (reps, time, score)
   - Three equal-width cards in a row
   - Score card color: green (80+), amber (50-79), red (<50)
   - Score has animated count-up from 0 on mount

3. IssueCard.tsx — for each top issue
   - Header: issue name + rep count badge
   - Flagged frame image: render from base64 stored in session.flaggedFrames[frameIndex]
   - If frame has skeleton overlay, great — it was captured from the canvas
   - Red tinted border on the frame image
   - Explanation text
   - Fix tip in a blue-tinted callout box with 💡 icon

4. RepTimeline.tsx
   - Vertical list of all reps
   - Each rep: number, status icon (✅/⚠️/❌), brief note
   - Good form reps are muted (text-secondary), problem reps are highlighted
   - Collapsible — show first 5, "Show all" button

5. Next Session Focus card
   - Accent-blue left border
   - Target emoji + the focus text
   - Prominent, visually distinct from issue cards

### Frame annotation:
The frames stored in flaggedFrames already have the skeleton overlay baked in (captured from canvas).
To add extra annotation:
- Draw a semi-transparent red circle/highlight around the problem area
- This can be done client-side by rendering the base64 image to a canvas,
  drawing the highlight overlay based on the violation type
  (e.g., hip area for hip_sag, elbow area for depth), then converting back to display.

Map violation rules to highlight positions (approximate % of frame):
- hip_sag / pike: circle around hip area (x: 50%, y: 55%, radius: 15%)
- depth: circle around elbow area (x: 40%, y: 45%, radius: 12%)
- head_crane: circle around head/neck (x: 50%, y: 20%, radius: 10%)
- lockout: circle around elbow/arm (x: 40%, y: 40%, radius: 12%)
```

---

## Phase 8: Home Page + Session History

```
Build the home/landing page with session history.

### File: src/app/page.tsx

Layout:

┌──────────────────────────────────────────────┐
│                  FormCoach                    │
│            AI Push-Up Coach                   │
│                                              │
│  Get real-time form feedback on your         │
│  push-ups using just your laptop webcam.     │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │                                      │   │
│  │     [Illustration: side view of      │   │
│  │      person doing push-up with       │   │
│  │      skeleton overlay + checkmarks   │   │
│  │      on form points]                 │   │
│  │                                      │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │         Start Session →               │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  HOW IT WORKS                                │
│  1. Position your laptop to your side        │
│  2. Do push-ups — AI tracks your form        │
│  3. Get voice cues to fix your form          │
│  4. Review your session report after         │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  PAST SESSIONS                               │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Jun 9 · 12 reps · Score: 74/100    │   │
│  │  Top issue: Hip sag                   │   │
│  │  ████████████████░░░░░░              │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Jun 8 · 8 reps · Score: 62/100     │   │
│  │  Top issue: Depth                     │   │
│  │  ████████████░░░░░░░░░░              │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  No past sessions yet? Start your first!     │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  SETUP TIPS                                  │
│  • Laptop at waist height, 1.5m away        │
│  • Side view (left or right)                 │
│  • Good lighting — avoid backlight           │
│  • Wear fitted clothing for best tracking    │
│                                              │
│  Built with MediaPipe + AWS Bedrock + Polly  │
│                                              │
└──────────────────────────────────────────────┘

### Component details:

1. HeroSection.tsx
   - App name "FormCoach" in large bold text
   - Subtitle: "AI Push-Up Coach"
   - Brief description
   - Illustration: create an SVG illustration of a side-view push-up silhouette
     with dotted lines showing joint angles and green checkmarks.
     Keep it simple and stylized — not realistic.
   - "Start Session" primary button → navigates to /session

2. How It Works section
   - 4 steps with numbered circles and short descriptions
   - Icons for each step (camera, running figure, speaker, clipboard)
   - Horizontal on desktop, vertical on mobile

3. SessionHistoryCard.tsx
   - Click navigates to /report/[id]
   - Shows: date, rep count, form score with mini progress bar, top issue
   - Score color: green/amber/red
   - If no sessions: show empty state with encouraging message

4. Setup Tips section
   - Simple tips list
   - Optional: small illustration showing ideal laptop positioning

5. Footer
   - "Built with MediaPipe + AWS Bedrock + Polly"
   - Link to team info or hackathon
```

---

## Phase 9: Polish + Edge Cases

```
Final polish pass on the entire app.

### Visual polish:

1. Page transitions
   - Add subtle fade transitions between pages using next/navigation
   - Loading states: skeleton components that match the layout (not spinner)

2. Session view polish
   - When no violations for 3+ consecutive reps, briefly flash "🔥 Great streak!" overlay
   - Rep counter pulses green on a clean rep
   - Timer blinks red when in active session

3. Report page polish
   - Score counter animates from 0 to final value on mount (200ms per increment)
   - Issue cards stagger-animate in (each delayed 100ms)
   - Frame images have subtle zoom-on-hover

4. Responsive design
   - Mobile: stack everything vertically, canvas full width
   - Tablet: same as mobile
   - Desktop: max-width 800px centered, comfortable reading width
   - The app is primarily used on laptop (webcam), so desktop-first is fine

### Error handling:

1. Webcam errors
   - Permission denied → "Camera access is required. Click the camera icon in your browser's address bar to enable it."
   - No camera found → "No webcam detected. Please connect a webcam."
   - Camera in use → "Your camera is being used by another app. Close it and try again."

2. MediaPipe loading failure
   - Show retry button
   - If CDN fails, show "Check your internet connection"

3. Bedrock API failure
   - Save session without report
   - On report page, show "Report couldn't be generated" with retry button
   - Retry button calls /api/report again with the stored session data

4. Polly API failure
   - Silent fail — just don't play audio
   - Text overlay still appears
   - Log error to console

5. localStorage full
   - If setItem throws, delete oldest session and retry
   - Show toast: "Older sessions removed to free up space"

### Accessibility:

1. All interactive elements keyboard-navigable
2. Camera feed has aria-label="Live camera feed with pose detection overlay"
3. Form feedback announcements via aria-live="polite" region
4. High contrast mode: form feedback overlays have solid backgrounds, not translucent
5. "End Session" button is large and easily clickable even if user is in push-up position (at least 48px tall)

### Performance:

1. MediaPipe should run at target 24-30fps
   - If frame rate drops below 15fps, reduce modelComplexity to 0
   - Show fps counter in dev mode only

2. Frame capture (toDataURL) is expensive
   - Only capture when a NEW violation is detected, not every frame
   - Limit to 1 capture per 2 seconds minimum
   - Use 'image/jpeg' at 0.6 quality to keep base64 strings small

3. Audio
   - Preload all audio files on session page mount
   - Use AudioContext for better performance than HTMLAudioElement if supported
```

---

## Environment Variables (.env.local)

```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

---

## Package Dependencies

```json
{
  "@mediapipe/pose": "^0.5.1675469404",
  "@mediapipe/camera_utils": "^0.3.1675466862",
  "@mediapipe/drawing_utils": "^0.3.1675466124",
  "@aws-sdk/client-bedrock-runtime": "^3.x",
  "@aws-sdk/client-polly": "^3.x",
  "uuid": "^9.0.0"
}
```
