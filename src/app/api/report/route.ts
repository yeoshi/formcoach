import { NextRequest, NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { BedrockReport } from "@/lib/pose/types";
import type { SessionDataForReport } from "@/lib/types";

const SYSTEM_PROMPT = `You are a friendly, encouraging fitness coach analyzing a push-up session.
You receive structured data about the user's reps and form violations.
The payload includes successfulReps (counted good reps) and totalReps (all attempts including failed).
Critical violations (hip_sag, depth, pike) invalidate a rep — those reps have successful: false.
Non-critical violations (head_crane, lockout) still count as successful but should be mentioned.

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
      "status": "good",
      "note": "Optional very short note (5 words max)"
    }
  ]
}

Score calculation:
- Base score: 100
- Per FAILED rep (critical violation, successful: false): -5 points
- Per unique violation type that appeared: -3 points
- Bonus: +2 for every 3 consecutive good reps (no violations)
- Floor: 30 (never go below 30)
- Round to nearest 5
- A session with 8 good reps out of 18 total should score around 50-60, not 20.

Rules for topIssues:
- Max 3 issues, sorted by count descending
- frameIndex should reference which flagged frame best shows this issue (0-indexed)
- If there are no violations at all, return empty topIssues array and formScore of 95-100

CRITICAL: Each issue MUST have a unique, specific fix tailored to that exact violation. Never repeat the same tip across issues.
Good examples (use these as inspiration, not verbatim):
- hip_sag: "Squeeze your glutes and brace your core before each rep. Imagine balancing a cup of water on your lower back."
- pike: "Think about pushing your belly button toward the floor. Your hips should be at the same height as your shoulders."
- depth: "Aim to touch your chest to a tennis ball on the floor. Your elbows need to reach 90 degrees or below."
- head_crane: "Pick a spot on the floor about 30cm ahead of your hands and keep your eyes fixed on it throughout."
- lockout: "At the top of each rep, push the ground away until your arms are fully straight — think 'lock and press'."
If you give the same tip for two different issues, you have FAILED the task.

Tone: Like a supportive gym buddy. Use "you" not "the user". Short sentences. No jargon.`;

const FALLBACK_FIXES: Record<string, string> = {
  hip_sag: "Squeeze your glutes and brace your core before each rep. Imagine balancing a cup of water on your lower back.",
  pike: "Push your belly button toward the floor. Your hips should stay at the same height as your shoulders throughout.",
  depth: "Aim to touch your chest to a tennis ball on the floor. Your elbows need to reach 90 degrees or below.",
  head_crane: "Pick a spot on the floor about 30cm ahead of your hands and keep your eyes fixed on it throughout.",
  lockout: "At the top of each rep, push the ground away until your arms are fully straight — think 'lock and press'.",
};

const FALLBACK_EXPLANATIONS: Record<string, string> = {
  hip_sag: "Your hips were dropping below shoulder level, causing a sag in the middle of your body.",
  pike: "Your hips were rising too high, forming an upside-down V instead of a straight line.",
  depth: "Your elbows weren't bending far enough — aim for at least 90 degrees to count the rep.",
  head_crane: "Your head was lifting or tilting forward, breaking the straight line from head to heel.",
  lockout: "Your arms weren't fully extending at the top — you need to lock out completely between reps.",
};

function fallbackReport(data: SessionDataForReport): BedrockReport {
  const failedReps = data.repData.filter((r) => !r.successful).length;
  const uniqueViolationTypes = new Set(data.violations.map((v) => v.rule)).size;

  let consecutiveGood = 0;
  let streakBonus = 0;
  for (const rep of data.repData) {
    if (rep.successful && rep.violations.length === 0) {
      consecutiveGood++;
      if (consecutiveGood % 3 === 0) streakBonus += 2;
    } else {
      consecutiveGood = 0;
    }
  }

  const raw = 100 - failedReps * 5 - uniqueViolationTypes * 3 + streakBonus;
  const score = Math.round(Math.max(30, Math.min(100, raw)) / 5) * 5;

  const ruleCounts: Record<string, number> = {};
  data.violations.forEach((v) => {
    ruleCounts[v.rule] = (ruleCounts[v.rule] ?? 0) + 1;
  });

  const topIssues = Object.entries(ruleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([rule, count], i) => ({
      rule: rule as BedrockReport["topIssues"][0]["rule"],
      count,
      explanation: FALLBACK_EXPLANATIONS[rule] ?? `You had ${count} instances of ${rule.replace("_", " ")}.`,
      fix: FALLBACK_FIXES[rule] ?? "Focus on maintaining a straight body line throughout each rep.",
      frameIndex: i,
    }));

  return {
    summary: `You completed ${data.successfulReps} good reps out of ${data.totalReps} total. ${data.successfulReps > 0 ? "Good effort — keep working on your form." : "Keep at it, form comes with practice."}`,
    formScore: score,
    topIssues,
    nextSessionFocus: topIssues[0]
      ? `Focus on fixing your ${topIssues[0].rule.replace("_", " ")} — it's your most common issue.`
      : "Focus on keeping your hips level throughout each rep.",
    repBreakdown: data.repData.map((r) => {
      if (!r.successful) {
        return {
          repNumber: r.repNumber,
          status: "needs_work" as const,
          note: "Did not count",
        };
      }
      if (r.violations.length === 0) {
        return { repNumber: r.repNumber, status: "good" as const };
      }
      return {
        repNumber: r.repNumber,
        status: "minor_issues" as const,
        note: r.violations[0]?.replace("_", " "),
      };
    }),
  };
}

function parseReport(text: string): BedrockReport | null {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as BedrockReport;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let sessionData: SessionDataForReport | undefined;
  try {
    const payload = (await request.json()) as {
      sessionData: SessionDataForReport;
    };
    sessionData = payload.sessionData;

    if (!sessionData) {
      return NextResponse.json(
        { error: "sessionData is required" },
        { status: 400 }
      );
    }

    const hasAws =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

    if (!hasAws) {
      return NextResponse.json(fallbackReport(sessionData));
    }

    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const modelBody = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify(sessionData),
        },
      ],
    });

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-sonnet-4-20250514-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: new TextEncoder().encode(modelBody),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    );
    const text =
      responseBody.content?.[0]?.text ?? responseBody.completion ?? "";

    const report = parseReport(text);
    if (!report) {
      return NextResponse.json(fallbackReport(sessionData));
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("Bedrock error:", err);
    if (sessionData) {
      return NextResponse.json(fallbackReport(sessionData));
    }
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 }
    );
  }
}
