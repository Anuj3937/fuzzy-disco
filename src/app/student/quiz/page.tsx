'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookText } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchQuizByLanguage, normalizeLang } from '@/lib/translateQuizLite';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/* ---- Types ---- */
type Option = { label: string; value: string };
type Question = { id: string; text: string; options: Option[]; correctIndex: number };
type Level = 'Easy';
type Grade = '7' | '8' | '9';

/* ---- Helper Functions ---- */
function pickGradeFromString(raw: any): Grade | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase();
  const m = s.match(/(?:class|grade|std|standard)?\s*(7|8|9)\b/);
  if (m) return m[1] as Grade;
  if (/7th|\bvii\b|seven|saat/.test(s)) return '7';
  if (/8th|\bviii\b|eight|aath/.test(s)) return '8';
  if (/9th|\bix\b|nine|nau/.test(s)) return '9';
  return null;
}

function resolveUserGrade(user: any, params: URLSearchParams): Grade {
  const qp =
    pickGradeFromString(params.get('class')) ||
    pickGradeFromString(params.get('grade')) ||
    pickGradeFromString(params.get('standard'));
  if (qp) return qp;
  const fromUser =
    pickGradeFromString(user?.className) ||
    pickGradeFromString(user?.class) ||
    pickGradeFromString(user?.grade) ||
    pickGradeFromString(user?.standard) ||
    pickGradeFromString(user?.studentClass);
  return fromUser || '9';
}

/* ---- Quiz Page ---- */
export default function QuizPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();

  const rawSubject = params.get('subject') || '';
  const rawChapter = params.get('chapter') || '';
  const level: Level = (params.get('level') as Level) || 'Easy';
  const chosenLangLabel = params.get('language') || user?.language || 'English';
  const selectedLang = normalizeLang(chosenLangLabel);
  const userGrade: Grade = resolveUserGrade(user, params);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const q = await fetchQuizByLanguage(selectedLang, userGrade, rawSubject, rawChapter, level);
        setQuestions(q);
      } catch (e: any) {
        setLoadingError(e?.message || 'Failed to load quiz data.');
      }
    }
    loadQuiz();
  }, [selectedLang, userGrade, rawSubject, rawChapter, level]);

  /* ---- UI State ---- */
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (questions.length > 0) setAnswers(Array(questions.length).fill(-1));
  }, [questions]);

  const total = questions.length;
  const onSelect = (optIdx: number) => {
    const next = [...answers];
    next[index] = optIdx;
    setAnswers(next);
  };

  const progressPct = finished ? 100 : started && total > 0 ? (index / Math.max(total, 1)) * 100 : 0;
  const score = answers.reduce(
    (acc, a, i) => acc + (a === (questions[i]?.correctIndex ?? -1) ? 1 : 0),
    0
  );
  const scoreTitle = score === 5 ? 'Excellent' : score >= 3 ? 'Nice work' : 'Could do better';

  async function handleFinish() {
    setFinished(true);
    if (!user?.uid || questions.length === 0) return;
    try {
      setSaving(true);
      setSaveError(null);
      await addDoc(collection(db, 'quizAttempts'), {
        studentID: user.uid,
        class: userGrade,
        subject: rawSubject,
        chapter: rawChapter,
        score,
        language: selectedLang,
        timestamp: serverTimestamp(),
      });
    } catch (e: any) {
      setSaveError(e?.message || 'Failed to save your attempt.');
    } finally {
      setSaving(false);
    }
  }

  /* ---- UI ---- */
  const pageBg = 'bg-gradient-to-br from-[#E8D8FF] via-[#F1E9FF] to-[#D8C6FF]';
  const cardBg = 'bg-white/85 backdrop-blur-xl border border-white/60 shadow-2xl';

  return (
    <div className={`relative min-h-screen ${pageBg} text-gray-800 overflow-hidden`}>
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <div className={`rounded-3xl ${cardBg} p-6 mb-6`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold text-[#6B5BBE]">Personalised Quiz</h1>
              <p className="text-sm text-[#5A4DA8]/90 mt-1">
                Subject: <span className="font-semibold">{rawSubject}</span> • Chapter{' '}
                <span className="font-semibold">{rawChapter}</span> • Level{' '}
                <span className="font-semibold">{level}</span>
              </p>
              {loadingError && <p className="text-xs text-rose-700 mt-1">{loadingError}</p>}
            </div>
            <div className="hidden md:flex items-center gap-2 text-[#6B5BBE]">
              <BookText className="h-6 w-6" />
              <span className="font-medium">Question-by-question view</span>
            </div>
          </div>

          <div className="w-full h-2 bg-[#E2D9FF] rounded-full mt-4 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-[#A689FF] to-[#7E61FF] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Quiz Card */}
        <div className={`rounded-3xl ${cardBg} p-8`}>
          {!started && !finished && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#6B5BBE] mb-2">Ready to begin?</h2>
              <p className="text-[#5A4DA8]/90 mb-6">
                You’ll see one question at a time. Start with <b>Easy</b>. Use <i>Next</i> / <i>Previous</i> to navigate.
              </p>
              <Button
                className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] hover:brightness-110 text-white px-6 py-3 rounded-xl shadow-md"
                onClick={() => setStarted(true)}
                disabled={!questions.length}
              >
                Start
              </Button>
            </div>
          )}

          {started && !finished && questions.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[#5A4DA8]/90">
                  Question <b>{index + 1}</b> of <b>{questions.length}</b>
                </span>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-[#F4EEFF] to-[#ECE2FF] p-6 border border-[#E1D3FF] relative overflow-hidden">
                <h3 className="text-xl font-semibold text-[#4E3FA3] mb-4">{questions[index].text}</h3>
                <ul className="space-y-3">
                  {questions[index].options.map((opt, i) => {
                    const selected = answers[index] === i;
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => onSelect(i)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition transform
                          ${
                            selected
                              ? 'border-[#9B87F5] ring-2 ring-[#B39DFF] bg-gradient-to-r from-white to-[#F3ECFF] shadow-md scale-[1.01]'
                              : 'border-[#E1D3FF] hover:border-[#C7B2FF] hover:bg-white/90 bg-white/80'
                          }`}
                        >
                          <span className={`font-medium ${selected ? 'text-[#6B5BBE]' : 'text-[#4E3FA3]/90'}`}>
                            {opt.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Button
                  className={`bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl ${
                    index === 0 ? 'opacity-0 pointer-events-none' : ''
                  }`}
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                >
                  Previous
                </Button>

                {index < questions.length - 1 ? (
                  <Button
                    className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] hover:brightness-110 text-white rounded-xl"
                    onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    className="bg-gradient-to-r from-[#B179F1] to-[#FF8BD6] hover:brightness-110 text-white rounded-xl"
                    onClick={handleFinish}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Finish'}
                  </Button>
                )}
              </div>
            </>
          )}

          {finished && (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-[#6B5BBE] mb-3">{scoreTitle} 🎉</h2>
              <p className="text-[#5A4DA8]/90 mb-6">
                Your score: <b>{score}</b> / {questions.length}
              </p>
              {saveError && (
                <p className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 inline-block">
                  {saveError}
                </p>
              )}

              {/* --- Review Section (questions + chosen + correct) --- */}
              <div className="mt-8 text-left">
                <h3 className="text-xl font-semibold text-[#4E3FA3] mb-4">Review</h3>
                <div className="space-y-4">
                  {questions.map((q, i) => {
                    const chosenIdx = answers[i];
                    const chosenOpt = q.options[chosenIdx];
                    const correctOpt = q.options[q.correctIndex];
                    const isCorrect = chosenIdx === q.correctIndex;

                    return (
                      <div
                        key={q.id || i}
                        className="rounded-2xl bg-gradient-to-br from-[#F4EEFF] to-[#ECE2FF] p-6 border border-[#E1D3FF] relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h4 className="text-base md:text-lg font-semibold text-[#4E3FA3]">
                            Q{i + 1}. {q.text}
                          </h4>
                          <span
                            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border
                              ${
                                isCorrect
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-rose-700 bg-rose-50 border-rose-200'
                              }`}
                          >
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        <div className="grid gap-2">
                          <div className="text-sm">
                            <span className="font-semibold text-[#6B5BBE]">Your answer: </span>
                            <span className={`${isCorrect ? 'text-emerald-700' : 'text-[#4E3FA3]/90'}`}>
                              {chosenOpt ? chosenOpt.label : 'Not answered'}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-[#6B5BBE]">Correct answer: </span>
                            <span className="text-[#4E3FA3]">
                              {correctOpt?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
