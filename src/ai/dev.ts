
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-mcq-test.ts';
import '@/ai/flows/summarize-document.ts';
import '@/ai/flows/evaluate-test-results.ts';
import '@/ai/flows/generate-subjective-test.ts';
import '@/ai/flows/generate-flash-cards.ts';
import '@/ai/flows/generate-visual-aid.ts';
