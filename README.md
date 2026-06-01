# FormCoach

AI push-up coach with real-time form feedback via webcam, MediaPipe pose detection, AWS Polly voice cues, and Bedrock-powered session reports.

## Quick start

```bash
npm install
cp .env.local.example .env.local
# Add AWS credentials for Polly + Bedrock (optional — fallback reports work without AWS)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Generate voice cues (optional)

Requires AWS credentials:

```bash
npm run generate-audio
```

This writes MP3 files to `public/audio/`. Without them, text overlays still work; audio plays silently if files are missing.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- MediaPipe Pose (`@mediapipe/pose`)
- AWS Bedrock (Claude) for reports
- AWS Polly for TTS
- localStorage for session history

## Project structure

```
src/
  app/           — pages + API routes
  components/    — UI, session, report, home
  hooks/         — pose, form analysis, audio, recorder
  lib/           — pose engine, storage, AWS clients
```

## Environment

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
```

Without AWS keys, the report API returns a local fallback report so you can test the full flow.
