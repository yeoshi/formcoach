/**
 * Run once: npm run generate-audio
 * Loads credentials from .env.local automatically.
 */
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

// Load .env.local so credentials don't need to be exported manually
try {
  const envFile = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
  for (const line of envFile.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
} catch {
  // No .env.local found — fall back to existing environment variables
}
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { CUE_TEXT, POSITIVE_CUES } from "../src/lib/constants";

const OUTPUT_DIR = join(process.cwd(), "public", "audio");

async function synthesize(
  client: PollyClient,
  text: string,
  filename: string
) {
  const command = new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: "mp3",
    VoiceId: "Joanna",
    Engine: "neural",
  });
  const response = await client.send(command);
  const stream = response.AudioStream;
  if (!stream) throw new Error(`No audio for ${filename}`);

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const path = join(OUTPUT_DIR, filename);
  writeFileSync(path, buffer);
  console.log(`Created ${path}`);
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const client = new PollyClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });

  for (const [rule, cue] of Object.entries(CUE_TEXT)) {
    await synthesize(client, cue.voice, `${rule}.mp3`);
    await synthesize(client, cue.escalation, `${rule}_escalation.mp3`);
  }

  for (const [id, text] of Object.entries(POSITIVE_CUES)) {
    await synthesize(client, text, `${id}.mp3`);
  }

  console.log("All audio cues generated.");
}

main().catch(console.error);
