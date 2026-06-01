export async function synthesizeSpeech(text: string): Promise<Blob> {
  const response = await fetch("/api/polly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Polly synthesis failed: ${response.status}`);
  }

  return response.blob();
}
