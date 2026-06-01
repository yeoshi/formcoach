import { NextRequest, NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { BedrockReport } from "@/lib/pose/types";
import type { SessionDataForReport } from "@/lib/types";

const SYSTEM_PROMPT = `You are a friendly, encouraging fitness coach analyzing a push-up session.
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
      "status": "good",
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
- Minimum score: 20
- Round to nearest 5

Rules for topIssues:
- Max 3 issues, sorted by count descending
- frameIndex should reference which flagged frame best shows this issue (0-indexed)
- If there are no violations at all, return empty topIssues array and formScore of 95-100

Tone: Like a supportive gym buddy. Use "you" not "the user". Short sentences. No jargon.`;

function fallbackReport(data: SessionDataForReport): BedrockReport {
  const violationCount = data.violations.length;
  const score = Math.max(
    20,
    Math.round((100 - violationCount * 5) / 5) * 5
  );
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
      explanation: `You had ${count} instances of ${rule.replace("_", " ")}.`,
      fix: "Focus on maintaining a straight body line throughout each rep.",
      frameIndex: i,
    }));

  return {
    summary: `You completed ${data.totalReps} reps in ${data.durationSeconds} seconds. Keep practicing to improve your form.`,
    formScore: score,
    topIssues,
    nextSessionFocus: "Focus on keeping your hips level throughout each rep.",
    repBreakdown: data.repData.map((r) => ({
      repNumber: r.repNumber,
      status: r.violations.length === 0 ? "good" : "minor_issues",
      note: r.violations[0]?.replace("_", " "),
    })),
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

    const provider = process.env.BEDROCK_PROVIDER ?? "anthropic";
    const modelId =
      process.env.BEDROCK_MODEL_ID ??
      "anthropic.claude-sonnet-4-20250514-v1:0";

    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Anthropic and Amazon Nova use different request/response formats
    let modelBody: string;
    if (provider === "amazon") {
      modelBody = JSON.stringify({
        messages: [
          {
            role: "user",
            content: [{ text: JSON.stringify(sessionData) }],
          },
        ],
        system: [{ text: SYSTEM_PROMPT }],
        inferenceConfig: { maxTokens: 1024, temperature: 0.3 },
      });
    } else {
      modelBody = JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(sessionData) }],
      });
    }

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: new TextEncoder().encode(modelBody),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text from whichever response shape was returned
    const text =
      provider === "amazon"
        ? (responseBody.output?.message?.content?.[0]?.text ?? "")
        : (responseBody.content?.[0]?.text ?? responseBody.completion ?? "");

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
