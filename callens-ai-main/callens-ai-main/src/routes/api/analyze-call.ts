import { createFileRoute } from "@tanstack/react-router";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
]);

function friendlyGatewayError(status: number) {
  if (status === 402) return "AI credits are exhausted. Please add credits and try again.";
  if (status === 429) return "The service is busy right now. Please wait a moment and retry.";
  return "We could not analyze this audio. Please check the recording and try again.";
}

export const Route = createFileRoute("/api/analyze-call")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData();
        const audio = formData.get("audio");

        if (!(audio instanceof File)) {
          return Response.json({ error: "Please select an audio file." }, { status: 400 });
        }
        if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
          return Response.json({ error: "Audio must be between 1 byte and 20 MB." }, { status: 400 });
        }
        if (!ALLOWED_AUDIO_TYPES.has(audio.type)) {
          return Response.json(
            { error: "Use an MP3, WAV, M4A, WEBM, or OGG audio file." },
            { status: 400 },
          );
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Audio analysis is not configured." }, { status: 500 });
        }

        const bytes = new Uint8Array(await audio.arrayBuffer());
        let binary = "";
        const chunkSize = 32_768;
        for (let index = 0; index < bytes.length; index += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
        }
        const audioData = btoa(binary);

        const gatewayResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are an exact call-centre QA analyst. Transcribe the recording into English, translating Hindi or Hinglish naturally while preserving meaning. Never invent details. Return valid JSON only.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this call and return exactly this JSON shape:\n{\n  "transcript": [{"speaker":"Agent|Customer|Unknown", "text":"English speech", "timestamp":"MM:SS"}],\n  "summary": "A concise English summary of the conversation and outcome. Explicitly state whether the customer said yes, okay, or was comfortable for each of Budget, Possession, Configuration, and Location.",\n  "bpcl": {\n    "budget":{"status":"yes|no|unclear|not_asked", "value":"stated budget or Not stated", "customerResponse":"exact response such as Yes, Okay, Comfortable, No, Unclear, or Not stated", "evidence":"short English quote or explanation"},\n    "possession":{"status":"yes|no|unclear|not_asked", "value":"timeline or Not stated", "customerResponse":"exact response such as Yes, Okay, Comfortable, No, Unclear, or Not stated", "evidence":"short English quote or explanation"},\n    "configuration":{"status":"yes|no|unclear|not_asked", "value":"property configuration or Not stated", "customerResponse":"exact response such as Yes, Okay, Comfortable, No, Unclear, or Not stated", "evidence":"short English quote or explanation"},\n    "location":{"status":"yes|no|unclear|not_asked", "value":"location or Not stated", "customerResponse":"exact response such as Yes, Okay, Comfortable, No, Unclear, or Not stated", "evidence":"short English quote or explanation"}\n  },\n  "customerComfort":"comfortable|not_comfortable|unclear",\n  "customerComfortEvidence":"brief evidence",\n  "outcome":"one-line call outcome"\n}\nBPCL means Budget, Possession, Configuration, Location. For every BPCL item, judge only the customer's own reply—not merely whether the agent asked it. Set status yes only when the customer positively confirms with words such as yes, okay, comfortable, agreed, or an equivalent response. Set status no for rejection or discomfort, not_asked when absent, and unclear when discussed without clear customer confirmation. Never invent a positive response.`,
                  },
                  {
                    type: "input_audio",
                    input_audio: {
                      data: audioData,
                      format: audio.type.includes("wav")
                        ? "wav"
                        : audio.type.includes("mpeg") || audio.type.includes("mp3")
                          ? "mp3"
                          : audio.type.includes("mp4") || audio.type.includes("m4a")
                            ? "m4a"
                            : audio.type.includes("ogg")
                              ? "ogg"
                              : "webm",
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!gatewayResponse.ok) {
          console.error("Audio analysis failed", gatewayResponse.status, await gatewayResponse.text());
          return Response.json(
            { error: friendlyGatewayError(gatewayResponse.status) },
            { status: gatewayResponse.status },
          );
        }

        const result = (await gatewayResponse.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = result.choices?.[0]?.message?.content;
        if (!content) {
          return Response.json({ error: "The recording did not contain readable speech." }, { status: 422 });
        }

        try {
          return Response.json(JSON.parse(content));
        } catch {
          console.error("Audio analysis returned invalid JSON");
          return Response.json({ error: "The analysis was incomplete. Please retry." }, { status: 502 });
        }
      },
    },
  },
});