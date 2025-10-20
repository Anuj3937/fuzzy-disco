'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const chapters = {
  Science: ['Is matter around us pure?', 'Motion', 'Cell: Fundamental unit of life'],
  Maths: ['Number System', 'Polynomials', 'Co-ordinate Geometry'],
  SSC: ['French Revolution', 'India-size and location', 'What is democracy? Why democracy','The story of village Palampur'],
};
const languages = ['English', 'Hindi', 'Marathi', 'Tamil', 'Bengali', 'Assamese', 'Punjabi'];

export default function AskAIPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [language, setLanguage] = useState('English');
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!subject) setChapter('');
  }, [subject]);

  if (loading || !user) return <p className="text-center mt-20">Loading...</p>;

  const handleAskAI = async () => {
    if (!subject || !chapter || !question) {
      alert('Please select subject, chapter and type your question.');
      return;
    }
    setLoadingAI(true);
    setAiAnswer(null);
    setAiError(null);
    try {
      const resp = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, chapter, language, question }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to get answer');
      setAiAnswer(data.answer);
    } catch (e: any) {
      setAiError(e?.message || 'Something went wrong while asking AI.');
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-gray-800">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#EDE9FF] via-[#FFEAF2] to-[#E7F7F3]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#DDD4FF] blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-[26rem] w-[26rem] rounded-full bg-[#FFDCC7] blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-1/3 right-8 h-40 w-40 rounded-full bg-[#CFF3E8] blur-3xl opacity-60" />

      {/* Header with Back */}
      <header className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-4">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/student/ask_question')}
            className="border-[#D5CEFF] bg-white/80 text-[#4C409F] backdrop-blur"
          >
            ← Back
          </Button>
          <div className="w-[84px]" />
        </div>
        <h1 className="text-center text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#6F5AE8] via-[#9B87F5] to-[#59BBD0]">
          Ask AI
        </h1>
        <p className="mt-3 text-center text-[#4C409F]/90">Instant, friendly help in your language.</p>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-16">
        <Card className="border-white/70 bg-white/90 backdrop-blur shadow-2xl">
          <CardHeader>
            <CardTitle className="text-[#3F338C]">Ask AI</CardTitle>
            <CardDescription>Get AI-powered answers based on your selected chapter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(chapters).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={chapter} onValueChange={setChapter} disabled={!subject}>
                <SelectTrigger><SelectValue placeholder="Select Chapter" /></SelectTrigger>
                <SelectContent>
                  {subject && (chapters as any)[subject].map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue placeholder="Select Language" /></SelectTrigger>
                <SelectContent>
                  {['English','Hindi','Marathi','Tamil', 'Punjabi', 'Bengali', 'Assamese'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Question */}
            <Textarea
              rows={4}
              placeholder="Type your question... e.g., 'Explain states of matter with examples.'"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <Button onClick={handleAskAI} disabled={loadingAI} className="bg-gradient-to-r from-[#6F5AE8] via-[#7EC8E3] to-[#F7AFC1] text-white hover:brightness-110">
              {loadingAI ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Asking AI...</> : 'Ask AI'}
            </Button>

            {/* Output */}
            {aiError && (
              <Card className="mt-4 bg-red-50 p-4">
                <p className="text-red-700 text-sm">{aiError}</p>
              </Card>
            )}
            {aiAnswer && (
              <Card className="mt-4 bg-gray-100 p-4 whitespace-pre-wrap">
                <p>{aiAnswer}</p>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
