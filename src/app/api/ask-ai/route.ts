// src/app/api/ask-ai/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { subject, chapter, language, question } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY on server' },
        { status: 500 }
      );
    }
    if (!subject || !chapter || !language || !question) {
      return NextResponse.json(
        { error: 'subject, chapter, language, and question are required' },
        { status: 400 }
      );
    }

    const prompt = [
      `You are a helpful teacher for Indian school students.`,
      `Subject: ${subject}`,
      `Chapter/Topic: ${chapter}`,
      `Question: ${question}`,
      `Language: ${language}`,
      ``,
      `Please answer in ${language}.`,
      `Keep it concise, age-appropriate, and step-by-step.`,
      `Use simple bullet points or short paragraphs.`,
      `If there are formulas or definitions, format them clearly.`,
    ].join('\n');

    // Call Gemini (no client library required)
    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent' +
        `?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // You can tune temperature / max tokens below
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: `Gemini error: ${resp.status} ${text}` },
        { status: 500 }
      );
    }

    const data = await resp.json();
    // Safely read text from candidates
    const candidate = data?.candidates?.[0];
    const gemText =
      candidate?.content?.parts?.map((p: any) => p?.text).join('')?.trim() ||
      candidate?.content?.parts?.[0]?.text ||
      'Sorry, I could not generate an answer.';

    return NextResponse.json({ answer: gemText });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}
