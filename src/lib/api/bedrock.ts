import type { BedrockReport } from "@/lib/pose/types";
import type { SessionDataForReport } from "@/lib/types";

export async function generateReport(
  sessionData: SessionDataForReport
): Promise<BedrockReport> {
  const response = await fetch("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionData }),
  });

  if (!response.ok) {
    throw new Error(`Report generation failed: ${response.status}`);
  }

  return response.json();
}
