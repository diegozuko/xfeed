import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/server";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface TTSOptions {
  voice?: TTSVoice;
  speed?: number;
  model?: "tts-1" | "tts-1-hd";
}

/**
 * Generate audio from text using OpenAI TTS.
 * Designed to be easily swappable with other TTS providers.
 */
export async function generateAudio(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const { voice = "nova", speed = 1.0, model = "tts-1-hd" } = options;

  const response = await getOpenAI().audio.speech.create({
    model,
    voice,
    input: text,
    speed,
    response_format: "mp3",
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate audio and upload to Supabase Storage.
 * Returns the public URL of the audio file.
 */
export async function generateAndStoreAudio(
  text: string,
  briefingId: string,
  format: "flash" | "podcast",
  options: TTSOptions = {}
): Promise<{ url: string; durationEstimate: number }> {
  const audioBuffer = await generateAudio(text, options);

  const supabase = createServiceClient();
  const fileName = `${briefingId}/${format}.mp3`;

  const { error } = await supabase.storage
    .from("audio")
    .upload(fileName, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (error) throw new Error(`Failed to upload audio: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("audio").getPublicUrl(fileName);

  // Rough estimate: ~150 words per minute for speech
  const wordCount = text.split(/\s+/).length;
  const durationEstimate = Math.round((wordCount / 150) * 60);

  return { url: publicUrl, durationEstimate };
}
