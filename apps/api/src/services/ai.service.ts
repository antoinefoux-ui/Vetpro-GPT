export interface AiTranscriptionRequest {
  encounterId: string;
  audioUrl: string;
  language?: "sk" | "en";
}

export interface AiExtractionResult {
  diagnosis?: string;
  vitals?: Record<string, string | number>;
  treatments?: string[];
  medications?: Array<{ name: string; dosage: string; duration?: string }>;
  summary: string;
}

export async function transcribeEncounter(_request: AiTranscriptionRequest): Promise<string> {
  // Integration point for Whisper / Speech-to-Text provider.
  return "[stub] Real-time transcript would appear here.";
}

export async function extractStructuredClinicalData(transcript: string): Promise<AiExtractionResult> {
  // Integration point for LLM extraction workflow.
  return {
    diagnosis: "Otitis externa",
    treatments: ["Ear cleaning", "Topical medication"],
    medications: [{ name: "Otomax", dosage: "3 drops BID", duration: "10 days" }],
    summary: `Structured extraction generated from transcript: ${transcript.slice(0, 120)}`
  };
}
