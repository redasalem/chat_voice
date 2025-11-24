'use server';

/**
 * @fileOverview This file defines a Genkit flow for transcribing user speech from audio data to text.
 *
 * - transcribeUserSpeech - A function that takes audio data and transcribes it.
 * - TranscribeUserSpeechInput - The input type for the transcribeUserSpeech function.
 * - TranscribeUserSpeechOutput - The return type for the transcribeUserSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeUserSpeechInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio data URI of the user speech that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeUserSpeechInput = z.infer<typeof TranscribeUserSpeechInputSchema>;

const TranscribeUserSpeechOutputSchema = z.object({
  transcription: z.string().describe("The transcribed text from the user's speech."),
});
export type TranscribeUserSpeechOutput = z.infer<typeof TranscribeUserSpeechOutputSchema>;

export async function transcribeUserSpeech(
  input: TranscribeUserSpeechInput
): Promise<TranscribeUserSpeechOutput> {
  return transcribeUserSpeechFlow(input);
}

const transcribeUserSpeechPrompt = ai.definePrompt({
  name: 'transcribeUserSpeechPrompt',
  input: {schema: TranscribeUserSpeechInputSchema},
  output: {schema: TranscribeUserSpeechOutputSchema},
  prompt: `Transcribe the following user speech to text. If there is only silence, output an empty string for the transcription. \n\n{{media url=audioDataUri}}`,
  model: 'googleai/gemini-2.5-flash',
});

const transcribeUserSpeechFlow = ai.defineFlow(
  {
    name: 'transcribeUserSpeechFlow',
    inputSchema: TranscribeUserSpeechInputSchema,
    outputSchema: TranscribeUserSpeechOutputSchema,
  },
  async input => {
    const {output} = await transcribeUserSpeechPrompt(input);
    return output!;
  }
);
