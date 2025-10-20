'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createDoubtSubmission, addStudentMessage } from '@/lib/db';
import { db } from '@/lib/firebase';
import {
  collection,
  query as fq,
  where,
  orderBy,
  onSnapshot,
  doc,
} from 'firebase/firestore';

const chapters = {
  Science: ['Is matter around us pure?', 'Motion', 'Cell: Fundamental unit of life'],
  Maths: ['Chapter 1: Numbers', 'Chapter 2: Algebra', 'Chapter 3: Geometry'],
  SSC: ['Chapter 1: History', 'Chapter 2: Geography', 'Chapter 3: Civics'],
};

type Submission = {
  id: string;
  question: string;
  subject: string;
  chapter: string;
  status: 'Answered' | 'Pending' | 'Active';
  language?: string;
  createdAt?: any;
};

export default function AskTeacherPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherChapter, setTeacherChapter] = useState('');
  const [teacherQuestion, setTeacherQuestion] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const [submittedQuestions, setSubmittedQuestions] = useState<Submission[]>([]);
  const [saving, setSaving] = useState(false);

  const [selectedDoubt, setSelectedDoubt] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newFollowup, setNewFollowup] = useState('');

  useEffect(() => {
    if (!teacherSubject) setTeacherChapter('');
  }, [teacherSubject]);

  if (loading || !user) return <p className="text-center mt-20">Loading...</p>;

  // Live subscribe to this student's doubts, with fallback while index builds
  useEffect(() => {
    if (!user) return;

    const base = collection(db, 'doubts');
    const qWithSort = fq(base,
      where('studentId', '==', user.uid),          // <-- ensure your index uses studentId (same casing)
      orderBy('createdAt', 'desc')
    );

    // Primary subscription (needs composite index)
    const unsub = onSnapshot(
      qWithSort,
      (snap) => {
        const items: Submission[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            question: data.text_original || data.text_en || '',
            subject: data.subject || '',
            chapter: data.chapter || '',
            status: (data.status as any) || 'Pending',
            language: data.language || 'en',
            createdAt: data.createdAt,
          };
        });
        setSubmittedQuestions(items);
      },
      (err) => {
        // Fallback during "index building" (failed-precondition)
        if (err?.code === 'failed-precondition') {
          const qNoSort = fq(base, where('studentId', '==', user.uid));
          const unsubFallback = onSnapshot(qNoSort, (snap2) => {
            const items = snap2.docs.map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                question: data.text_original || data.text_en || '',
                subject: data.subject || '',
                chapter: data.chapter || '',
                status: (data.status as any) || 'Pending',
                language: data.language || 'en',
                createdAt: data.createdAt,
              };
            }).sort((a, b) => {
              const sa = a.createdAt?.seconds ?? 0;
              const sb = b.createdAt?.seconds ?? 0;
              return sb - sa;
            });
            setSubmittedQuestions(items);
          });
          // replace cleanup
          return () => unsubFallback();
        } else {
          console.error('onSnapshot(doubts) error:', err);
        }
      }
    );

    return () => unsub();
  }, [user]);

  // Subscribe to messages for the selected doubt
  useEffect(() => {
    if (!selectedDoubt) return;
    const ref = collection(db, 'doubts', selectedDoubt.id, 'messages');
    const q = fq(ref, orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, (err) => {
      console.error('onSnapshot(messages) error:', err);
    });
    return () => unsub();
  }, [selectedDoubt]);

  const handleSubmitToTeacher = async () => {
    if (!teacherSubject || !teacherChapter || !teacherQuestion.trim()) {
      alert('Please fill all fields.');
      return;
    }
    try {
      setSaving(true);
      await createDoubtSubmission({
        userId: user!.uid,
        subject: teacherSubject,
        classGrade: (user as any).classGrade || '9',
        chapter: teacherChapter,
        text: teacherQuestion.trim(),
        language: selectedLanguage,
      });
      setTeacherQuestion('');
      alert('Your question has been submitted to the teacher.');
    } catch (e: any) {
      alert(e?.message || 'Failed to submit your question.');
    } finally {
      setSaving(false);
    }
  };

  const openDoubtDetails = (d: Submission) => {
    setSelectedDoubt(d);
    setNewFollowup('');
  };

  const handleSendFollowup = async () => {
    if (!selectedDoubt || !newFollowup.trim()) return;
    try {
      await addStudentMessage({
        doubtId: selectedDoubt.id,
        studentId: user!.uid,
        text: newFollowup.trim(),
        language: selectedDoubt.language || selectedLanguage || 'en',
      });
      setNewFollowup('');
    } catch (e: any) {
      alert(e?.message || 'Failed to send your message.');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-gray-800">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F0EBFF] via-[#FFF0F6] to-[#E6F7F3]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#D9D1FF] blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-[26rem] w-[26rem] rounded-full bg-[#FFD6C4] blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-1/3 left-10 h-40 w-40 rounded-full bg-[#CFF3E8] blur-3xl opacity-60" />

      {/* Doodles */}
      <svg className="pointer-events-none absolute top-8 left-8 w-28 h-28 opacity-90" viewBox="0 0 160 160" fill="none">
        <rect x="30" y="30" width="72" height="12" rx="6" fill="#E1D4FF" />
        <path d="M102 30 L130 20 L123 46 Z" fill="#FFD3E2" />
        <rect x="30" y="52" width="94" height="8" rx="4" fill="#DFF0FF" />
        <rect x="30" y="68" width="64" height="8" rx="4" fill="#E0F4F1" />
      </svg>

      {/* Header + Back */}
      <header className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-4">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (selectedDoubt) {
                setSelectedDoubt(null);
              } else {
                router.push('/student/ask_question');
              }
            }}
            className="border-[#D5CEFF] bg-white/80 text-[#4C409F] backdrop-blur"
          >
            ← Back
          </Button>
          <div className="w-[84px]" />
        </div>
        <h1 className="text-center text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#6F5AE8] via-[#9B87F5] to-[#59BBD0]">
          Ask Teacher
        </h1>
        <p className="mt-3 text-center text-[#4C409F]/90">Send your doubt to a teacher for a detailed explanation.</p>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-16">
        {!selectedDoubt && (
          <Card className="border-white/70 bg-white/90 backdrop-blur shadow-2xl">
            <CardHeader>
              <CardTitle className="text-[#3F338C]">Submit Your Question</CardTitle>
              <CardDescription>Select your subject and chapter, then describe your doubt clearly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selects */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={teacherSubject} onValueChange={setTeacherSubject}>
                  <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(chapters).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={teacherChapter} onValueChange={setTeacherChapter} disabled={!teacherSubject}>
                  <SelectTrigger><SelectValue placeholder="Select Chapter" /></SelectTrigger>
                  <SelectContent>
                    {teacherSubject && (chapters as any)[teacherSubject].map((c: string) =>
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Language Selector */}
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger><SelectValue placeholder="Select Language" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="bn">Bengali</SelectItem>
                  <SelectItem value="pa">Punjabi</SelectItem>
                  <SelectItem value="ta">Tamil</SelectItem>
                  <SelectItem value="as">Assamese</SelectItem>
                  <SelectItem value="mr">Marathi</SelectItem>
                </SelectContent>
              </Select>

              {/* Textarea */}
              <Textarea
                rows={4}
                placeholder="Type your question for the teacher…"
                value={teacherQuestion}
                onChange={(e) => setTeacherQuestion(e.target.value)}
              />

              {/* Submit */}
              <Button
                onClick={handleSubmitToTeacher}
                disabled={saving}
                className="bg-gradient-to-r from-[#6F5AE8] via-[#7EC8E3] to-[#F7AFC1] text-white hover:brightness-110"
              >
                {saving ? 'Submitting…' : 'Submit to Teacher'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Previous Questions */}
        {!selectedDoubt && (
          <section className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-[#3F338C]">Previous Questions</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {submittedQuestions.map((q) => (
                <Card key={q.id} className="border-white/70 bg-white/90 backdrop-blur shadow-lg">
                  <CardContent className="p-4">
                    <p className="font-semibold text-[#3F338C]">{q.question}</p>
                    <p className="mt-1 text-sm text-[#5A4DA8]/80">
                      Subject: {q.subject} • Chapter: {q.chapter} • Status: {q.status}
                    </p>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        className="border-[#D5CEFF] text-[#4C409F]"
                        onClick={() => openDoubtDetails(q)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {submittedQuestions.length === 0 && (
                <Card className="border-dashed border-[#D5CEFF] bg-white/80">
                  <CardContent className="p-6 text-center text-[#4C409F]/70">
                    No questions yet — submit your first doubt above.
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* Doubt Details / Conversation */}
        {selectedDoubt && (
          <div className="relative max-w-3xl mx-auto bg-white/90 backdrop-blur-md border border-purple-200 rounded-2xl shadow-2xl p-6 mt-6">
            <Button
              variant="outline"
              onClick={() => setSelectedDoubt(null)}
              className="mb-4 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              ← Back to Questions
            </Button>

            <h2 className="text-2xl font-bold text-purple-800 mb-2">
              {selectedDoubt.chapter} ({selectedDoubt.subject})
            </h2>
            <p className="text-gray-700 mb-4">Your Doubt: {selectedDoubt.question}</p>

            {/* Conversation */}
            <div className="h-80 overflow-y-auto border border-purple-100 rounded-xl p-4 bg-purple-50/50 mb-4">
              {messages.length === 0 && (
                <p className="text-center text-gray-500">No messages yet. Start the discussion!</p>
              )}
              {messages.map((msg) => {
                const isStudent = msg.senderRole === 'student';
                const mainText = msg.text_original || msg.text_en || msg.text || ''; // <- include legacy 'text'
                const showEnglish = !!msg.text_en && !isStudent;
                return (
                  <div
                    key={msg.id}
                    className={`my-2 flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl max-w-xs ${
                        isStudent
                          ? 'bg-purple-300 text-white'
                          : 'bg-white border border-purple-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{mainText}</p>
                      {showEnglish && (
                        <p className="text-[11px] mt-1 opacity-70">EN: {msg.text_en}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Follow-up input */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newFollowup}
                onChange={(e) => setNewFollowup(e.target.value)}
                placeholder="Type your message…"
                className="flex-1 border border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <Button
                onClick={handleSendFollowup}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
