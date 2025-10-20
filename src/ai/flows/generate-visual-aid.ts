
'use server';
/**
 * @fileOverview Generates a visual aid image based on a given topic.
 *
 * - generateVisualAid - A function that generates an image.
 * - GenerateVisualAidInput - The input type for the generateVisualAid function.
 * - GenerateVisualAidOutput - The return type for the generateVisualAid function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {type ChatMessageUI} from '@/lib/types';


const GenerateVisualAidInputSchema = z.object({
  topic: z
    .string()
    .describe('The topic for which to generate a visual aid.'),
  history: z.array(z.any()).optional().describe("The conversation history."),
});
export type GenerateVisualAidInput = z.infer<typeof GenerateVisualAidInputSchema>;

export type GenerateVisualAidOutput = {
  imageDataUri: string;
  prompt: string;
};


const generateVisualAidFlow = ai.defineFlow(
  {
    name: 'generateVisualAidFlow',
    inputSchema: GenerateVisualAidInputSchema,
    // No output schema needed here for image generation
  },
  async (input) => {
    const history = (input.history || []).map((msg: ChatMessageUI) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      content: [{text: msg.content as string}],
    }));
    
    // Construct a new prompt that includes context
    const finalPrompt = `Considering the previous conversation, generate a simple, clear, and educational visual aid or diagram for a student learning about the following topic. The image should be illustrative and easy to understand.

Topic: ${input.topic}`;

    const llmResponse = await ai.generate({
      prompt: finalPrompt,
      model: 'googleai/imagen-4.0-fast-generate-001',
      history: history
    });
    
    const imagePart = llmResponse.media;

    if (!imagePart || !imagePart.url) {
      throw new Error('Image generation failed or returned no media.');
    }

    return {
      imageDataUri: imagePart.url,
      prompt: `A visual aid for: ${input.topic}`,
    };
  }
);


export async function generateVisualAid(
  input: GenerateVisualAidInput
): Promise<GenerateVisualAidOutput> {
  return generateVisualAidFlow(input);
}
