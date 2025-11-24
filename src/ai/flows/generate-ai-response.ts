'use server';

/**
 * @fileOverview An AI agent that generates intelligent responses based on transcribed speech.
 *
 * - generateAIResponse - A function that handles the generation of AI responses.
 * - GenerateAIResponseInput - The input type for the generateAIResponse function.
 * - GenerateAIResponseOutput - The return type for the generateAIResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAIResponseInputSchema = z.object({
  transcription: z
    .string()
    .describe('The transcribed speech from the user.'),
});
export type GenerateAIResponseInput = z.infer<typeof GenerateAIResponseInputSchema>;

const GenerateAIResponseOutputSchema = z.object({
  response: z.string().describe('The AI-generated response.'),
});
export type GenerateAIResponseOutput = z.infer<typeof GenerateAIResponseOutputSchema>;

export async function generateAIResponse(input: GenerateAIResponseInput): Promise<GenerateAIResponseOutput> {
  return generateAIResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAIResponsePrompt',
  input: {schema: GenerateAIResponseInputSchema},
  output: {schema: GenerateAIResponseOutputSchema},
  prompt: `You are a helpful and informative AI assistant.

  Generate a response to the following transcribed speech:

  Transcription: {{{transcription}}}
  `,
  model: 'googleai/gemini-2.5-flash',
});

const generateAIResponseFlow = ai.defineFlow(
  {
    name: 'generateAIResponseFlow',
    inputSchema: GenerateAIResponseInputSchema,
    outputSchema: GenerateAIResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
