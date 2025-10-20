'use server';
/**
 * @fileOverview Generates subjective test questions based on a given topic or document.
 *
 * - generateSubjectiveTest - A function that generates subjective test questions.
 * - GenerateSubjectiveTestInput - The input type for the generateSubjectiveTest function.
 * - GenerateSubjectiveTestOutput - The return type for the generateSubjectiveTest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {type ChatMessageUI} from '@/lib/types';

const GenerateSubjectiveTestInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate subjective questions.'),
  documentDataUri: z
    .string()
    .optional()
    .describe(
      'A document related to the topic, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  history: z.array(z.any()).optional().describe("The conversation history."),
});
export type GenerateSubjectiveTestInput = z.infer<typeof GenerateSubjectiveTestInputSchema>;

const GenerateSubjectiveTestOutputSchema = z.object({
  questions: z.array(z.string()).describe('An array of subjective questions.'),
});
export type GenerateSubjectiveTestOutput = z.infer<typeof GenerateSubjectiveTestOutputSchema>;

export async function generateSubjectiveTest(
  input: GenerateSubjectiveTestInput
): Promise<GenerateSubjectiveTestOutput> {
  return generateSubjectiveTestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSubjectiveTestPrompt',
  input: {schema: GenerateSubjectiveTestInputSchema},
  output: {schema: GenerateSubjectiveTestOutputSchema},
  prompt: `You are an expert in generating subjective test questions for UPSC aspirants.

  Use the conversation history and the provided topic/document to generate the questions.

  Generate a set of subjective questions based on the following:
  Topic: {{topic}}

  {{#if documentDataUri}}
  Consider the content of the following document when generating questions: {{media url=documentDataUri}}
  {{/if}}

  The questions should be challenging and require detailed, analytical answers.
  Return the questions as a JSON array of strings.
  `,
});

const generateSubjectiveTestFlow = ai.defineFlow(
  {
    name: 'generateSubjectiveTestFlow',
    inputSchema: GenerateSubjectiveTestInputSchema,
    outputSchema: GenerateSubjectiveTestOutputSchema,
  },
  async input => {
    const history = (input.history || []).map((msg: ChatMessageUI) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      content: [{text: msg.content as string}],
    }));

    const {output} = await prompt(input, {history});
    return output!;
  }
);
