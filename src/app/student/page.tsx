'use client';

import { T } from '@/components/T'; // Added Import
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookText, MessageCircle, Eye } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';

type Activity = {
  type: 'quiz';
  subject: string;
  chapter: string;
  score: number;
  timestamp?: Timestamp | null;
};

// timeAgoFromTimestamp function remains the same

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [recentActivity, setRecentActivity] = useState<Activity[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const q = query(
      collection(db, 'quizAttempts'),
      where('studentID', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(4)
    );

    const unsub = onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
        setErrorMsg(null);
        console.log('[Recent Quizzes] docs:', snap.docs.map(d => ({ id: d.id, ...d.data() }))); // Debug log

        const quizzes: Activity[] = snap.docs.map((d) => {
          const data = d.data() as {
            subject?: string;
            chapter?: string;
            score?: number;
            timestamp?: Timestamp | null;
          };
          return {
            type: 'quiz',
            subject: data.subject ?? '—',
            chapter: data.chapter ?? '—',
            score: typeof data.score === 'number' ? data.score : 0,
            timestamp: data.timestamp ?? null,
          };
        });
        setRecentActivity(quizzes);
      },
      (err) => {
        console.error('[Recent Quizzes] onSnapshot error:', err);
        setErrorMsg(err?.message || 'Failed to load recent quizzes.');
        setRecentActivity([]); // Graceful fallback
      }
    );

    return () => unsub();
  }, [user, loading, router]);

  const quizActivities = useMemo(() => recentActivity ?? [], [recentActivity]);

  if (loading || !user) {
    return <p className="text-center mt-20"><T>Loading...</T></p>; // Wrapped Loading
  }

  // timeAgoFromTimestamp function (kept here for brevity)
  function timeAgoFromTimestamp(ts?: Timestamp | null): string {
    if (!ts) return 'just now';
    const date = ts.toDate();
    const diffMs = Date.now() - date.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return date.toLocaleString();
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#ECE7FF] via-[#F6F3FF] to-[#E3F1FF] text-gray-800 overflow-hidden">
      {/* Decorative blobs & Doodles remain the same */}
      <div className="pointer-events-none absolute -top-24 -left-20 w-96 h-96 bg-[#F1EBFF] rounded-full blur-3xl opacity-60 animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[#DFF3FF] rounded-full blur-3xl opacity-60 animate-pulse delay-700" />
      <svg className="pointer-events-none absolute top-10 left-10 w-40 h-40 opacity-70" viewBox="0 0 200 200" fill="none">
        <path d="M40 100 q40 -20 80 0 q-40 20 -80 0" stroke="#B9C8FF" strokeWidth="4" fill="none" />
        <circle cx="150" cy="70" r="10" fill="#FFD7E5" />
      </svg>
      <svg className="pointer-events-none absolute bottom-20 right-20 w-52 h-52 opacity-70" viewBox="0 0 200 200" fill="none">
        <rect x="100" y="50" width="60" height="12" rx="3" fill="#FBE2A8" />
        <path d="M100 56 h60" stroke="#F6CC70" strokeWidth="2" />
        <circle cx="70" cy="130" r="14" fill="#CFE7FF" />
      </svg>

      {/* Main Content */}
      <div className="relative z-10 p-6 max-w-5xl mx-auto w-full">
        {/* Back Button */}
        <div className="flex justify-start mb-6">
          <Button
            className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110"
            onClick={() => router.back()}
          >
            <T>Back</T>
          </Button>
        </div>

        {/* Welcome */}
        <h1 className="text-3x2 sm:text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-[#6B5BBE] via-[#7C6BF2] to-[#A1B5FF] drop-shadow-sm mb-12">
          <T>Welcome,</T> {user.name || user.displayName || <T>Student</T>}!
        </h1>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div
            className="relative bg-gradient-to-br from-[#CFE7FF] to-[#E5F0FF] p-8 rounded-3xl shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1.5 hover:scale-[1.02] cursor-pointer"
            onClick={() => router.push('/student/lesson')}
          >
            <BookText className="h-12 w-12 text-[#3E2F9A] mb-4" />
            <h2 className="text-2xl font-semibold text-[#3E2F9A] mb-2"><T>Start a New Lesson</T></h2>
            <p className="text-[#4E3FA3]/80"><T>Jump into your next chapter with our AI Tutor.</T></p>
            <Button className="mt-6 bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110">
              <T>Go to section</T>
            </Button>
          </div>

          <Link href="/student/ask_question">
            <div className="relative bg-gradient-to-br from-[#D9F4EC] to-[#E9FFF8] p-8 rounded-3xl shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1.5 hover:scale-[1.02] cursor-pointer">
              <MessageCircle className="h-12 w-12 text-[#2F7A63] mb-4" />
              <h2 className="text-2xl font-semibold text-[#2F7A63] mb-2"><T>Ask a Question</T></h2>
              <p className="text-[#2F7A63]/80"><T>Stuck on a concept? Get instant help.</T></p>
              <Button className="mt-6 bg-gradient-to-r from-[#34A284] to-[#2F7A63] text-white rounded-xl hover:brightness-110">
                <T>Go to section</T>
              </Button>
            </div>
          </Link>

          <Link href="/student/community">
            <div className="relative bg-gradient-to-br from-[#FFE3ED] to-[#FFF1F6] p-8 rounded-3xl shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1.5 hover:scale-[1.02] cursor-pointer">
              <Eye className="h-12 w-12 text-[#A13C65] mb-4" />
              <h2 className="text-2xl font-semibold text-[#A13C65] mb-2"><T>Join the Community</T></h2>
              <p className="text-[#A13C65]/80"><T>Collaborate and learn with your peers.</T></p>
              <Button className="mt-6 bg-gradient-to-r from-[#F57CA0] to-[#C94F75] text-white rounded-xl hover:brightness-110">
                <T>Go to section</T>
              </Button>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center text-[#5A4DA8]"><T>Recent Activity</T></h2>

          {errorMsg && (
            <div className="mx-auto mb-6 max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm">
              {errorMsg} {/* Error messages are usually not translated */}
            </div>
          )}

          {recentActivity === null ? (
            <p className="text-center text-gray-600"><T>Loading activities...</T></p>
          ) : quizActivities.length === 0 ? (
            <p className="text-center text-gray-600"><T>No recent quizzes yet</T></p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizActivities.map((act, index) => (
                <li
                  key={index}
                  className="relative p-6 rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden bg-gradient-to-br from-[#E5DBFF] to-[#F0E9FF]"
                >
                  <BookText className="h-10 w-10 text-[#6B5BBE] mb-3" />
                  <p className="font-semibold text-[#6B5BBE]">
                    <T>Completed quiz for</T> '{act.subject}: {act.chapter}' {/* Dynamic parts not wrapped */}
                  </p>
                  <p className="text-[#7C6BF2]"><T>Score:</T> {act.score}</p>
                  <p className="text-sm text-[#9B87F5]">{timeAgoFromTimestamp(act.timestamp)}</p> {/* Dynamic time not wrapped */}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}