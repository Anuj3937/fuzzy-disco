'use client';

// Keep existing imports
import React, { useState, useEffect, Suspense } from 'react'; // Import Suspense
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookText, Loader2 } from 'lucide-react'; // Import Loader2
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchQuizByLanguage, normalizeLang } from '@/lib/translateQuizLite';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { T } from '@/components/T'; // Assuming T component exists for translation

/* ---- Types ---- */
type Option = { label: string; value: string };
type Question = { id: string; text: string; options: Option[]; correctIndex: number };
type Level = 'Easy';
type Grade = '7' | '8' | '9';

/* ---- Helper Functions ---- */
// pickGradeFromString and resolveUserGrade remain the same
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


/* ---- Inner Client Component to access searchParams ---- */
function QuizContent() {
  const router = useRouter();
  const params = useSearchParams(); // Safe to use here now
  const { user } = useAuth();

  // Extract params logic remains the same
  const rawSubject = params.get('subject') || '';
  const rawChapter = params.get('chapter') || '';
  const level: Level = (params.get('level') as Level) || 'Easy';
  const chosenLangLabel = params.get('language') || user?.language || 'English';
  const selectedLang = normalizeLang(chosenLangLabel);
  const userGrade: Grade = resolveUserGrade(user, params);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(true); // Added loading state

  // useEffect for loading quiz remains the same, but sets loading state
  useEffect(() => {
    async function loadQuiz() {
      setIsLoadingQuiz(true); // Start loading
      setLoadingError(null);
      try {
        const q = await fetchQuizByLanguage(selectedLang, userGrade, rawSubject, rawChapter, level);
        if (q.length === 0) {
            setLoadingError(`No '${level}' questions found for ${rawSubject} > ${rawChapter} in ${chosenLangLabel}. Try checking the subject/chapter name or selecting 'Easy' level.`);
        }
        setQuestions(q);
      } catch (e: any) {
        setLoadingError(e?.message || 'Failed to load quiz data.');
      } finally {
          setIsLoadingQuiz(false); // Finish loading
      }
    }
    loadQuiz();
  }, [selectedLang, userGrade, rawSubject, rawChapter, level, chosenLangLabel]); // Added chosenLangLabel dependency

  /* ---- UI State ---- */
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // useEffect for answers initialization remains the same
   useEffect(() => {
    if (questions.length > 0) setAnswers(Array(questions.length).fill(-1));
  }, [questions]);


  // Calculation logic (total, onSelect, progressPct, score, scoreTitle) remains the same
   const total = questions.length;
  const onSelect = (optIdx: number) => {
    const next = [...answers];
    next[index] = optIdx;
    setAnswers(next);
  };

  const progressPct = finished ? 100 : started && total > 0 ? ((index + 1) / Math.max(total, 1)) * 100 : 0; // Corrected progress
  const score = answers.reduce(
    (acc, a, i) => acc + (a === (questions[i]?.correctIndex ?? -1) ? 1 : 0),
    0
  );
  const scoreTitle = score === total ? 'Excellent' : score >= Math.ceil(total * 0.6) ? 'Nice work' : 'Could do better'; // Adjusted threshold


  // handleFinish function remains the same
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
        level: level, // Added level
        score,
        totalQuestions: total, // Added total
        language: chosenLangLabel, // Store label
        timestamp: serverTimestamp(),
      });
    } catch (e: any) {
      console.error("Error saving quiz attempt:", e); // Log error
      setSaveError(e?.message || 'Failed to save your attempt.');
    } finally {
      setSaving(false);
    }
  }


  /* ---- UI ---- */
  const pageBg = 'bg-gradient-to-br from-[#E8D8FF] via-[#F1E9FF] to-[#D8C6FF]';
  const cardBg = 'bg-white/85 backdrop-blur-xl border border-white/60 shadow-2xl';

   // Handle loading state
   if (isLoadingQuiz) {
     return <LoadingQuiz />; // Use the Suspense fallback component
   }

   // Handle error state
   if (loadingError && !questions.length) {
       return (
         <div className={`relative min-h-screen ${pageBg} text-gray-800 overflow-hidden flex items-center justify-center`}>
            <div className={`rounded-3xl ${cardBg} p-8 max-w-lg text-center`}>
                <h2 className="text-2xl font-bold text-rose-700 mb-2">Error Loading Quiz</h2>
                <p className="text-rose-600 mb-6">{loadingError}</p>
                <Button
                    onClick={() => router.back()} // Go back to previous page
                    className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] hover:brightness-110 text-white px-6 py-3 rounded-xl shadow-md"
                >
                    Go Back
                </Button>
            </div>
         </div>
       );
   }

   // Original JSX (ensure T component wraps text)
   return (
    <div className={`relative min-h-screen ${pageBg} text-gray-800 overflow-hidden`}>
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <div className={`rounded-3xl ${cardBg} p-6 mb-6`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold text-[#6B5BBE]"><T>Personalised Quiz</T></h1>
              <p className="text-sm text-[#5A4DA8]/90 mt-1">
                <T>Subject:</T> <span className="font-semibold">{rawSubject}</span> • <T>Chapter</T>{' '}
                <span className="font-semibold">{rawChapter}</span> • <T>Level</T>{' '}
                <span className="font-semibold">{level}</span>
              </p>
              {/* Removed loadingError display here as it's handled above */}
            </div>
            <div className="hidden md:flex items-center gap-2 text-[#6B5BBE]">
              <BookText className="h-6 w-6" />
              <span className="font-medium"><T>Question-by-question view</T></span>
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
              <h2 className="text-2xl font-bold text-[#6B5BBE] mb-2"><T>Ready to begin?</T></h2>
              <p className="text-[#5A4DA8]/90 mb-6">
                <T>You’ll see one question at a time. Use <i>Next</i> / <i>Previous</i> to navigate.</T>
              </p>
              <Button
                className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] hover:brightness-110 text-white px-6 py-3 rounded-xl shadow-md"
                onClick={() => setStarted(true)}
                disabled={!questions.length} // Disable if questions array is empty
              >
                <T>Start</T>
              </Button>
            </div>
          )}

          {/* Added check for questions.length before rendering */}
          {started && !finished && questions.length > 0 && index < questions.length && (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[#5A4DA8]/90">
                  <T>Question</T> <b>{index + 1}</b> <T>of</T> <b>{questions.length}</b>
                </span>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-[#F4EEFF] to-[#ECE2FF] p-6 border border-[#E1D3FF] relative overflow-hidden min-h-[200px]"> {/* Added min-height */}
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
                    index === 0 ? 'opacity-0 pointer-events-none' : '' // Keep invisible if first question
                  }`}
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0} // Also disable functionally
                >
                  <T>Previous</T>
                </Button>

                {index < questions.length - 1 ? (
                  <Button
                    className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] hover:brightness-110 text-white rounded-xl"
                    onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                  >
                    <T>Next</T>
                  </Button>
                ) : (
                  <Button
                    className="bg-gradient-to-r from-[#B179F1] to-[#FF8BD6] hover:brightness-110 text-white rounded-xl"
                    onClick={handleFinish}
                    disabled={saving}
                  >
                    {saving ? <T>Saving…</T> : <T>Finish</T>}
                  </Button>
                )}
              </div>
            </>
          )}

          {finished && (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-[#6B5BBE] mb-3">{scoreTitle} 🎉</h2>
              <p className="text-[#5A4DA8]/90 mb-6">
                <T>Your score:</T> <b>{score}</b> / {questions.length}
              </p>
              {saving && <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#6B5BBE] mb-4" />}
              {saveError && (
                <p className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 inline-block">
                  {saveError}
                </p>
              )}

              {/* --- Review Section (questions + chosen + correct) --- */}
              <div className="mt-8 text-left">
                <h3 className="text-xl font-semibold text-[#4E3FA3] mb-4"><T>Review</T></h3>
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
                            {isCorrect ? <T>Correct</T> : <T>Incorrect</T>}
                          </span>
                        </div>

                        <div className="grid gap-2">
                          <div className="text-sm">
                            <span className="font-semibold text-[#6B5BBE]"><T>Your answer:</T> </span>
                            <span className={`${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}> {/* Indicate wrong answer */}
                              {chosenOpt ? chosenOpt.label : <T>Not answered</T>}
                            </span>
                          </div>
                           {/* Show correct answer only if incorrect */}
                          {!isCorrect && (
                             <div className="text-sm">
                                <span className="font-semibold text-[#6B5BBE]"><T>Correct answer:</T> </span>
                                <span className="text-emerald-700"> {/* Always green */}
                                  {correctOpt?.label}
                                </span>
                             </div>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                 {/* Back to Dashboard Button */}
                <div className="mt-8 text-center">
                    <Button
                      onClick={() => router.push('/student')} // Navigate to student dashboard
                      className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] hover:brightness-110 text-white px-6 py-3 rounded-xl shadow-md"
                    >
                      <T>Back to Dashboard</T>
                    </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ---- Main Page Export with Suspense ---- */
export default function QuizPage() {
  // We wrap the component that uses useSearchParams in Suspense
  return (
    <Suspense fallback={<LoadingQuiz />}>
      <QuizContent />
    </Suspense>
  );
}

// Simple loading component for the Suspense fallback
function LoadingQuiz() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#E8D8FF] via-[#F1E9FF] to-[#D8C6FF]">
      <Loader2 className="h-12 w-12 animate-spin text-[#6B5BBE]" />
      <p className="ml-4 text-lg font-medium text-[#5A4DA8]"><T>Loading Quiz...</T></p>
    </div>
  );
}