# FormCoach — Real-Time Exercise Form Analyzer PRD

## SuperAI NEXT Hackathon 2026 | Practice Build | Team: Yeo Shi + Rose

> **One-liner:** A web app that uses your laptop webcam to analyze push-up form in real time, coaches you with voice + on-screen cues, and generates a post-session report with annotated frame-by-frame tips.

---

## 1. Problem

Most people who work out at home or in the gym without a personal trainer have no way to know if their form is correct. Bad form leads to injuries (especially lower back strain from push-ups) and reduced effectiveness. Watching a YouTube tutorial before exercising doesn't help because you can't see yourself while doing the movement.

Existing solutions are either expensive (personal trainers, $100+/month coaching apps) or passive (pre-recorded video tutorials that can't react to what you're actually doing). There's no tool that watches you exercise and tells you what to fix *while you're doing it*.

## 2. Target User

- **Primary:** Home workout enthusiasts (20–35) who exercise with bodyweight or minimal equipment and don't have a trainer
- **Secondary:** Gym beginners who want form validation before loading heavy weights
- **Demo context:** Single exercise (push-ups) from side view, laptop on a stable surface ~1.5m away

## 3. Success Metrics (for judging)

| Metric | Target |
|--------|--------|
| Time from page load to first real-time feedback | < 10 seconds |
| Form correction latency (detection → voice cue) | < 2 seconds |
| Post-session report generation | < 15 seconds after session ends |
| Demo "wow moment" | Judge sees live correction happen on stage |

## 4. Core User Flow

```
PHASE 1: SETUP (5 seconds)
1. User opens FormCoach in Chrome on laptop
2. Clicks "Start Session" → browser requests webcam permission
3. User positions laptop to the side (side-view angle) and steps into frame
4. MediaPipe Pose detects the user's body → skeleton overlay appears on video
5. On-screen prompt: "Get into push-up position — I'll start tracking when ready"

PHASE 2: REAL-TIME COACHING (duration of exercise)
6. User begins push-ups
7. System detects push-up motion via elbow angle changes (rep counting starts)
8. On each rep, the rule engine evaluates form against 5 checkpoints:
   a. Body alignment (shoulder → hip → ankle should be ~straight)
   b. Depth (elbow angle should reach ≤ 90° at bottom)
   c. Hip sag (hip dropping below the shoulder-ankle line)
   d. Head position (neck neutral, not craning up/down)
   e. Lockout (full arm extension at top)
9. If deviation detected:
   a. On-screen text overlay appears (e.g., "⚠️ Raise your hips")
   b. Amazon Polly TTS plays voice cue (e.g., "Try to keep your hips up")
   c. Frame is flagged + captured for post-session review
10. Rep counter increments on screen
11. User clicks "End Session" or closes the exercise

PHASE 3: POST-SESSION REPORT (15 seconds to generate)
12. All flagged frames + form data sent to AWS Bedrock (Claude Sonnet)
13. Bedrock generates:
    a. Session summary (total reps, form score out of 100, time)
    b. Top 3 issues ranked by frequency
    c. Per-issue breakdown with:
       - Extracted frame showing the mistake (annotated with skeleton overlay)
       - What went wrong (plain English)
       - How to fix it (with a description of correct positioning)
    d. "Next session focus" — one specific thing to work on
14. Report renders as a scrollable card layout below the video
15. Session saved to localStorage (no auth)
```

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                      │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │  Webcam   │───▶│  MediaPipe   │───▶│  Rule Engine      │  │
│  │  Stream   │    │  Pose        │    │  (angle checks)   │  │
│  └──────────┘    │  (WASM)      │    │                   │  │
│                  └──────────────┘    └──────┬────────────┘  │
│                                             │               │
│                          ┌──────────────────┤               │
│                          │                  │               │
│                          ▼                  ▼               │
│                  ┌──────────────┐   ┌──────────────┐       │
│                  │  Text Overlay │   │  Frame        │       │
│                  │  on Canvas    │   │  Capture      │       │
│                  └──────────────┘   │  (flagged)    │       │
│                                     └──────┬───────┘       │
│                                            │                │
└────────────────────────────────────────────┼────────────────┘
                                             │
                    ┌────────────────────────┐│
                    │      AWS SERVICES       ││
                    │                         ▼│
                    │  ┌─────────────────────┐ │
                    │  │  API Gateway +      │ │
                    │  │  Lambda             │ │
                    │  └────────┬────────────┘ │
                    │           │              │
                    │     ┌─────┴─────┐       │
                    │     ▼           ▼       │
                    │  ┌────────┐ ┌────────┐  │
                    │  │Bedrock │ │ Polly  │  │
                    │  │(Claude)│ │ (TTS)  │  │
                    │  └────────┘ └────────┘  │
                    │                         │
                    │  ┌────────┐             │
                    │  │  S3    │ (frames)    │
                    │  └────────┘             │
                    └─────────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Pose estimation | **MediaPipe Pose (in-browser, WASM)** | Zero latency — runs at 30fps locally. No server round-trip. Free. |
| Form rule engine | **Client-side JS** | Simple angle math on keypoints. No ML needed for threshold checks. |
| Real-time voice | **Amazon Polly** (via API Gateway + Lambda) | AWS sponsor requirement. Pre-generate common cues and cache as audio files to avoid latency. |
| Post-session analysis | **AWS Bedrock (Claude Sonnet)** | Generates natural language coaching report from structured form data. AWS sponsor requirement. |
| Frame storage | **S3** (or base64 in localStorage for MVP) | Store flagged frames for post-session report. |
| Frontend | **Next.js 14 + Tailwind CSS** | Consistent with hackathon stack. SSR not needed — mostly client-side. |
| Deployment | **Vercel** | Sponsor. One-click deploy. |

### Why MediaPipe over AWS Rekognition for pose estimation

AWS Rekognition *does* have pose estimation, but it's image-based (not streaming) and requires sending frames to AWS → adds 200-500ms latency per frame. For real-time coaching at 30fps, that's unusable. MediaPipe runs entirely in-browser at near-native speed. We still hit the AWS requirement hard with Polly + Bedrock + S3.

## 6. Push-Up Form Rules (Side View)

These are the client-side angle/position checks run on every frame. MediaPipe Pose returns 33 keypoints — we use a subset.

### Key Landmarks (MediaPipe indices)

| Landmark | Index | Used for |
|----------|-------|----------|
| Ear | 7/8 | Head position |
| Shoulder | 11/12 | Body line, depth |
| Elbow | 13/14 | Depth check, lockout |
| Wrist | 15/16 | Base reference |
| Hip | 23/24 | Body alignment, sag |
| Ankle | 27/28 | Body line endpoint |

### Rule Definitions

| # | Rule | Detection Logic | Threshold | Cue Text | Polly Voice Cue |
|---|------|----------------|-----------|----------|-----------------|
| 1 | **Hip Sag** | Angle at hip in shoulder→hip→ankle chain. If hip drops below the straight line. | Hip y-position > 15% below shoulder-ankle line | "⚠️ Raise your hips" | "Try to keep your hips in line with your shoulders" |
| 2 | **Insufficient Depth** | Elbow angle at bottom of rep. Should reach ≤ 90°. | Elbow angle > 110° at rep bottom | "⬇️ Go deeper" | "Try to lower your chest closer to the ground" |
| 3 | **Pike / Hips Too High** | Hip rises significantly above shoulder-ankle line | Hip y-position > 15% above line | "⬇️ Lower your hips" | "Your hips are too high — flatten out your body" |
| 4 | **Head Crane** | Angle between ear→shoulder and shoulder→hip. Neck should be neutral. | Ear-shoulder angle deviates > 25° from shoulder-hip angle | "🔄 Neutral neck" | "Look at the ground just ahead of your hands" |
| 5 | **Incomplete Lockout** | Elbow angle at top of rep. Should be ~170°+. | Elbow angle < 160° at rep top | "⬆️ Fully extend" | "Push all the way up and lock your arms out" |

### Rep Detection Logic

```
State machine:
  IDLE → (elbow angle decreasing past 140°) → DESCENDING
  DESCENDING → (elbow angle reaches minimum, starts increasing) → ASCENDING
  ASCENDING → (elbow angle exceeds 160°) → REP_COMPLETE → IDLE

  Rep count increments on REP_COMPLETE.
  Form checks execute at:
    - Bottom of rep (DESCENDING → ASCENDING transition): depth, hip sag, pike, head
    - Top of rep (REP_COMPLETE): lockout
```

### Feedback Throttling

- Same cue cannot repeat within 4 seconds (avoid spam)
- Maximum 1 Polly voice cue at a time (queue, don't overlap)
- On-screen text overlay persists for 3 seconds then fades
- If form is consistently bad for 3+ consecutive reps on the same rule, escalate: "You've had hip sag for the last few reps — try pausing and resetting your position"

## 7. Post-Session Report

### Data Sent to Bedrock

```json
{
  "exercise": "push-up",
  "total_reps": 12,
  "session_duration_seconds": 87,
  "form_violations": [
    {
      "rule": "hip_sag",
      "rep_number": 3,
      "severity": 0.72,
      "timestamp": 23.4,
      "frame_base64": "...",
      "keypoints": { ... }
    },
    ...
  ],
  "rep_data": [
    {
      "rep_number": 1,
      "min_elbow_angle": 85,
      "hip_deviation": 0.03,
      "duration_seconds": 3.2,
      "violations": []
    },
    ...
  ]
}
```

### Bedrock Prompt (system)

```
You are a friendly, encouraging fitness coach analyzing a push-up session.
You receive structured data about the user's reps and form violations.

Generate a JSON report with:
1. "summary": 2-3 sentences on how the session went overall. Be encouraging but honest.
2. "form_score": integer 0-100 based on violation frequency and severity.
3. "top_issues": array of top 3 issues, each with:
   - "rule": the rule name
   - "count": how many reps it occurred
   - "explanation": plain English what's happening (1 sentence)
   - "fix": specific, actionable tip to correct it (1-2 sentences)
   - "frame_index": which flagged frame best illustrates this issue
4. "next_session_focus": one specific thing to work on next time (1 sentence)

Tone: like a supportive gym buddy, not a drill sergeant. Use "you" not "the user".
Keep it concise — this is a mobile-friendly card layout.
Respond ONLY with valid JSON, no markdown fences.
```

### Report UI Layout

```
┌─────────────────────────────────────────┐
│  SESSION COMPLETE ✅                     │
│                                          │
│  12 reps · 1m 27s · Form Score: 74/100  │
│  ████████████████░░░░░░  74%            │
│                                          │
├─────────────────────────────────────────┤
│  TOP ISSUES                              │
│                                          │
│  1. Hip Sag (4 reps)                     │
│  ┌─────────────────────────────────────┐ │
│  │  [Extracted frame with skeleton     ] │
│  │  [overlay + red highlight on hips   ] │
│  └─────────────────────────────────────┘ │
│  Your hips dropped below your body       │
│  line on 4 out of 12 reps.              │
│                                          │
│  💡 Fix: Squeeze your glutes and         │
│  imagine balancing a cup of water on     │
│  your lower back throughout the rep.     │
│                                          │
│  2. Insufficient Depth (3 reps)          │
│  ┌─────────────────────────────────────┐ │
│  │  [Extracted frame showing shallow   ] │
│  │  [rep with angle annotation         ] │
│  └─────────────────────────────────────┘ │
│  ...                                     │
│                                          │
├─────────────────────────────────────────┤
│  🎯 NEXT SESSION FOCUS                   │
│  Focus on hip position — do 3 slow reps  │
│  before your set to lock in the feeling. │
│                                          │
├─────────────────────────────────────────┤
│  📊 REP-BY-REP BREAKDOWN                │
│  Rep 1: ✅ Good form                     │
│  Rep 2: ✅ Good form                     │
│  Rep 3: ⚠️ Hip sag (severity: 72%)      │
│  Rep 4: ✅ Good form                     │
│  ...                                     │
└─────────────────────────────────────────┘
```

## 8. Polly Voice Strategy

### The Latency Problem

Calling Polly in real-time (detection → API call → audio) adds 500ms-1s. For a coaching app, that's too slow — the user is already mid-next-rep.

### Solution: Pre-generate + Cache

1. **At build time:** Pre-generate all 10-15 voice cues as MP3 files using Polly API
2. **Store in S3** (or bundle as static assets in `/public`)
3. **At runtime:** Rule engine triggers → play cached MP3 instantly (< 50ms)
4. **Escalation cues** (dynamic, e.g., "You've had hip sag for 3 reps"): Generate via Polly on-demand during the brief pause between reps — acceptable latency since it's not mid-movement

### Pre-generated Cue Library

| Cue ID | Text | Polly Voice |
|--------|------|-------------|
| `hip_sag` | "Try to keep your hips in line with your shoulders" | Joanna (Neural) |
| `go_deeper` | "Try to lower your chest closer to the ground" | Joanna (Neural) |
| `hips_high` | "Your hips are too high — flatten out your body" | Joanna (Neural) |
| `neutral_neck` | "Look at the ground just ahead of your hands" | Joanna (Neural) |
| `full_lockout` | "Push all the way up and lock your arms out" | Joanna (Neural) |
| `great_form` | "Nice rep! That form looked great" | Joanna (Neural) |
| `session_start` | "Looking good — start whenever you're ready" | Joanna (Neural) |
| `session_end` | "Great session! Let me analyze your form" | Joanna (Neural) |

## 9. Pages & Navigation

This is a single-page app with 3 view states:

| View | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Hero + "Start Session" CTA. Shows past session cards if any exist in localStorage. |
| **Live Session** | `/session` | Webcam feed with skeleton overlay, rep counter, real-time cues. "End Session" button. |
| **Report** | `/report/[id]` | Post-session analysis with frames, tips, rep breakdown. "Start New Session" CTA. |

## 10. Data Model (localStorage)

```typescript
interface Session {
  id: string;                    // uuid
  date: string;                  // ISO timestamp
  exercise: "push-up";
  totalReps: number;
  durationSeconds: number;
  formScore: number;             // 0-100
  violations: Violation[];
  repData: RepData[];
  report: BedrockReport | null;  // null until generated
  flaggedFrames: FlaggedFrame[];
}

interface Violation {
  rule: "hip_sag" | "depth" | "pike" | "head_crane" | "lockout";
  repNumber: number;
  severity: number;              // 0-1
  timestamp: number;             // seconds into session
  frameIndex: number;            // index into flaggedFrames
}

interface RepData {
  repNumber: number;
  minElbowAngle: number;
  hipDeviation: number;          // deviation from straight line, signed
  durationSeconds: number;
  violations: string[];          // rule names
}

interface FlaggedFrame {
  imageBase64: string;           // canvas snapshot with skeleton overlay
  timestamp: number;
  associatedViolation: string;
}

interface BedrockReport {
  summary: string;
  formScore: number;
  topIssues: {
    rule: string;
    count: number;
    explanation: string;
    fix: string;
    frameIndex: number;
  }[];
  nextSessionFocus: string;
}
```

## 11. AWS Services Used (Sponsor Alignment)

| Service | Usage | Justification for Judges |
|---------|-------|-------------------------|
| **Amazon Bedrock** (Claude Sonnet) | Post-session form analysis and coaching report generation | Core AI — transforms raw form data into actionable, personalized coaching advice |
| **Amazon Polly** | Text-to-speech voice cues during exercise | Real-time accessibility — user can't read screen while doing push-ups |
| **Amazon S3** | Store pre-generated Polly audio cues; optionally store flagged frames | Static asset hosting + data persistence |
| **API Gateway + Lambda** | Serverless endpoints for Bedrock and Polly calls | Secure API layer between client and AWS services |
| **CloudFront** (stretch) | CDN for Polly audio files | Low-latency audio delivery |

## 12. Build Plan (36-Hour Hackathon Template)

### Role Split

| | **Yeo Shi (PM + Prompt Driver)** | **Rose (Tech Lead + QA)** |
|---|---|---|
| Tools | Cursor (frontend prompts), v0 (mockups) | Cursor (backend prompts), AWS Console |
| Owns | PRD, UI/UX, Bedrock prompts, pitch deck | AWS infra, MediaPipe integration, deployment |

### Hour-by-Hour

| Hours | Phase | Yeo Shi | Rose |
|-------|-------|---------|------|
| 0–1 | Setup | Finalize PRD in Cursor, init Next.js repo | Set up AWS account, create S3 bucket, test Bedrock access |
| 1–3 | Core: Webcam | Cursor prompt: webcam feed + canvas overlay UI | Cursor prompt: MediaPipe Pose integration, keypoint extraction |
| 3–5 | Core: Rules | Cursor prompt: form rule engine (angle math) | Wire MediaPipe output → rule engine, test with own webcam |
| 5–7 | Core: Feedback | Cursor prompt: on-screen text overlay component | Set up API Gateway + Lambda for Polly, pre-generate audio cues |
| 7–8 | Integration | Merge branches, test full real-time loop end-to-end | Debug latency issues, tune thresholds |
| 8–10 | Polish: Live | UI polish on session view (rep counter, skeleton colors) | Audio playback integration, cue throttling logic |
| 10–12 | Post-Session | Cursor prompt: post-session report UI (card layout, frames) | Lambda endpoint for Bedrock, test prompt engineering |
| 12–14 | Deploy v1 | Test full flow: start → exercise → report | **Deploy to Vercel** ← hard deadline |
| 14–16 | Iterate | Fix UX issues found in testing, improve report layout | Tune form thresholds (too sensitive? not sensitive enough?) |
| 16–18 | Home Page | Build home page with session history cards | Frame extraction quality improvements, S3 integration |
| 18–20 | Edge Cases | Test: bad lighting, partial body in frame, very fast reps | Error handling: webcam denied, Polly timeout, Bedrock failure |
| 20–22 | **Feature Freeze** | Final UI polish, responsive tweaks | Final bug fixes, load testing |
| 22–24 | Pitch | Draft pitch deck (5 slides), write script | Record backup demo video |
| 24–26 | Rehearse | Rehearse pitch 3x, time it | Ensure live demo works on presentation laptop |
| 26–36 | Buffer | Sleep, final tweaks, present | Sleep, final tweaks, run live demo |

## 13. Pitch Structure (5 slides, 5 minutes)

| Slide | Content | Time |
|-------|---------|------|
| 1. **Hook** | "87% of gym injuries come from bad form. Most people can't afford a trainer." | 30s |
| 2. **Demo** | LIVE on stage: Yeo Shi does 5 push-ups, audience sees real-time corrections | 2min |
| 3. **How It Works** | Architecture diagram: MediaPipe → Rules → Polly + Bedrock | 45s |
| 4. **Post-Session Report** | Show the generated report with annotated frames | 45s |
| 5. **What's Next** | Bench press, deadlifts, squats. Gym mirror integration. PT marketplace. | 30s |

**The live demo IS the pitch.** Judges see a real correction happen on a real person in real time. That's the "wow moment" — same playbook as DripSeek (live browser extension demo on Prime Video).

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MediaPipe fails in bad lighting on stage | Medium | Critical | Test in presentation room beforehand. Fallback: pre-recorded demo video at hour 26. |
| Polly latency too high for real-time | Low | Medium | Pre-generate all cues as static MP3s. Only dynamic cues use live Polly. |
| Form thresholds too sensitive (false positives) | High | Medium | Add calibration step: "Do 2 good reps so I can learn your range." Use those as baseline. |
| Bedrock report generation slow (>15s) | Medium | Low | Show loading skeleton with fun copy. Pre-fetch while user reviews session stats. |
| Webcam angle not ideal (not true side view) | Medium | Medium | Add on-screen guide: "Position your laptop to your side, about 1.5m away." Show a reference image. |
| Side-view ambiguity (left vs right side) | Low | Low | MediaPipe handles both sides. Use whichever shoulder/elbow/hip has higher confidence. |

## 15. Future Scope (Not for MVP)

- **More exercises:** Bench press (side view), deadlift (side view), squat (front/side)
- **Calibration phase:** "Do 3 good reps" to personalize thresholds to user's body proportions
- **Progress over time:** Session history charts (form score trending up, common issues decreasing)
- **Social sharing:** Export report as image for Instagram/TikTok
- **Multi-angle support:** Front-facing camera for exercises like squats
- **Trainer mode:** PT reviews client's session reports remotely
- **Wearable integration:** Apple Watch / Fitbit heart rate overlay during session

---

## Appendix A: Cursor Prompt for MediaPipe Integration

```
Set up MediaPipe Pose in a Next.js 14 app for real-time push-up form analysis.

1. Install @mediapipe/pose and @mediapipe/camera_utils
   (or use the CDN bundle from https://cdn.jsdelivr.net/npm/@mediapipe/pose)

2. Create a component `PoseDetector.tsx`:
   - Request webcam access via navigator.mediaDevices.getUserMedia
   - Render a <video> element (hidden) and a <canvas> element (visible, same dimensions)
   - Initialize MediaPipe Pose with:
     - modelComplexity: 1 (balanced speed/accuracy)
     - smoothLandmarks: true
     - minDetectionConfidence: 0.7
     - minTrackingConfidence: 0.5
   - On each frame, draw the video frame to canvas
   - Overlay the detected landmarks and connectors using drawConnectors/drawLandmarks
   - Pass the landmarks array to a callback prop: onPoseDetected(landmarks)

3. Skeleton overlay styling:
   - Connectors: 2px solid, rgba(0, 255, 128, 0.7)
   - Landmarks: 4px circles, white fill, green stroke
   - Highlight shoulder, hip, ankle, elbow in yellow if they're key to form checks

4. Canvas should be responsive, maintain 16:9 aspect ratio, mirror the video horizontally
```

## Appendix B: Cursor Prompt for Rule Engine

```
Create a push-up form analysis engine in TypeScript.

Input: MediaPipe Pose landmarks array (33 keypoints, each with x, y, z, visibility)
Output: Array of form violations for the current frame

Implement these functions:

1. calculateAngle(a: Landmark, b: Landmark, c: Landmark): number
   - Returns angle in degrees at point b

2. getBodyAlignment(landmarks): { hipDeviation: number, isAligned: boolean }
   - Calculate the shoulder→hip→ankle line
   - hipDeviation = perpendicular distance of hip from shoulder-ankle line
   - isAligned = |hipDeviation| < threshold

3. checkPushUpForm(landmarks, repState): FormCheckResult
   - Check all 5 rules (hip_sag, depth, pike, head_crane, lockout)
   - Only check depth + lockout at appropriate rep phase
   - Return: { violations: Violation[], repState: RepState }

4. RepState machine:
   type RepPhase = 'idle' | 'descending' | 'ascending' | 'complete'
   Track elbow angle changes to detect rep phases
   Increment rep count on 'complete'

5. Feedback throttle:
   - Same violation cannot fire within 4000ms
   - Store lastFiredAt per rule
   - Escalation: if same rule fires 3+ consecutive reps, return escalated=true

Use the VISIBLE side (higher landmark visibility score) for all calculations,
since the camera is positioned to the side.
```
