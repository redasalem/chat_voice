import { config } from 'dotenv';
config();

import '@/ai/flows/transcribe-user-speech.ts';
import '@/ai/flows/generate-ai-response.ts';
import '@/ai/flows/convert-text-to-speech.ts';