// src/ai/flows/evaluate-test-results.ts
'use server';

/**
 * @fileOverview Evaluates test results for UPSC aspirants, providing feedback on performance and explanations.
 *
 * - evaluateTestResults - A function that handles the evaluation of test results.
 * - EvaluateTestResultsInput - The input type for the evaluateTestResults function.
 * - EvaluateTestResultsOutput - The return type for the evaluateTestResults function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateTestResultsInputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The question text.'),
      type: z.enum(['mcq', 'subjective']).describe('The type of question.'),
      correctAnswer: z.string().optional().describe('The correct answer for MCQ questions.'),
      options: z.array(z.string()).optional().describe('The options for MCQ questions.'),
    })
  ).describe('An array of questions, including question text, type, correct answer, and options.'),
  answers: z.array(z.string()).describe('An array of user-provided answers corresponding to the questions.'),
  topic: z.string().describe('The topic of the test.'),
});

export type EvaluateTestResultsInput = z.infer<typeof EvaluateTestResultsInputSchema>;

const EvaluateTestResultsOutputSchema = z.object({
  results: z.array(
    z.object({
      question: z.string().describe('The question text.'),
      type: z.enum(['mcq', 'subjective']).describe('The type of question.'),
      userAnswer: z.string().describe('The user provided answer.'),
      isCorrect: z.boolean().describe('Whether the answer is correct.'),
      explanation: z.string().describe('Explanation of the correct answer and why the user was right or wrong.'),
    })
  ).describe('An array of results for each question, including whether the answer was correct and an explanation.'),
  overallFeedback: z.string().describe('Overall feedback on the test performance.'),
});

export type EvaluateTestResultsOutput = z.infer<typeof EvaluateTestResultsOutputSchema>;

export async function evaluateTestResults(input: EvaluateTestResultsInput): Promise<EvaluateTestResultsOutput> {
  // If all answers are empty, provide a specific feedback.
  if (input.answers.every(answer => !answer || answer.trim() === '')) {
    return {
      results: input.questions.map((q, index) => ({
        question: q.question,
        type: q.type,
        userAnswer: 'No answer provided.',
        isCorrect: false,
        explanation: 'No answer was provided for this question.',
      })),
      overallFeedback: `It looks like you didn't provide any answers for this set of questions. To get accurate feedback and improve your understanding, please try to answer each question to the best of your ability. Don't worry about making mistakes; the goal is to learn from them! Your effort in attempting the questions will help you grasp these important concepts from ${input.topic} more effectively. Keep up the good work and give it a try next time!`,
    };
  }
  return evaluateTestResultsFlow(input);
}

const evaluateTestResultsPrompt = ai.definePrompt({
  name: 'evaluateTestResultsPrompt',
  input: {schema: EvaluateTestResultsInputSchema},
  output: {schema: EvaluateTestResultsOutputSchema},
  prompt: `You are an expert UPSC evaluator. You will be provided with a set of questions, the user's answers, and the correct answers (if applicable). Your task is to evaluate the answers and provide feedback.

For each question, determine if the user's answer is correct. Provide a detailed explanation of why the answer is correct or incorrect. For subjective questions, provide constructive feedback on the user's response, focusing on clarity, accuracy, and completeness. If the user answer is blank for a question, state that and provide the explanation.

Here's the topic of the test: {{{topic}}}

Here are the questions and answers:
{{#each questions}}
Question: {{question}}
Type: {{type}}
User Answer: {{lookup ../answers @index}}
{{#if correctAnswer}}Correct Answer: {{correctAnswer}}{{/if}}
---
{{/each}}


Provide the results in JSON format. Also give overall feedback on the test performance. Be encouraging and helpful.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const evaluateTestResultsFlow = ai.defineFlow(
  {
    name: 'evaluateTestResultsFlow',
    inputSchema: EvaluateTestResultsInputSchema,
    outputSchema: EvaluateTestResultsOutputSchema,
  },
  async input => {
    const {output} = await evaluateTestResultsPrompt(input);
    return output!;
  }
);
