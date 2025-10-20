'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import withAuth from '@/components/auth/withAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Languages } from 'lucide-react';

/** Language helpers (same 7 as elsewhere) */
const LANGS = ['Hindi', 'Marathi', 'Bengali', 'Tamil', 'English', 'Punjabi', 'Assamese'] as const;
type LangLabel = typeof LANGS[number];

type VideoDoc = {
  id: string;
  title: string;
  description?: string;
  language: LangLabel | string; // stored as label (e.g., "Marathi")
  videoURL: string;             // path like /videos/<uid>/<file>
  storagePath?: string;         // optional: 'videos/teacherUid/filename.mp4'
  createdAt?: any;              // Firestore timestamp
  uploadedBy?: string;
  uploaderName?: string;
};

function StudentVideosPage() {
  const router = useRouter();
  const { user } = useAuth();

  // UI selections
  const [langLabel, setLangLabel] = useState<LangLabel>('Hindi');

  // Data
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Session view guard so we don’t spam writes if user re-clicks quickly
  const viewedThisSession = useRef<Set<string>>(new Set());

  // Fetch videos when language changes
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const col = collection(db, 'videos');
        // store language as label in the videos doc (what the teacher page writes)
        const q = query(col, where('language', '==', langLabel), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: VideoDoc[] = snap.docs.map(d => {
          const data = d.data() as any;
          return ({
            id: d.id,
            title: data.title || 'Untitled',
            description: data.description || '',
            language: data.language,
            videoURL: data.videoURL,
            storagePath: data.storagePath,
            createdAt: data.createdAt || null,
            uploadedBy: data.uploadedBy,
            uploaderName: data.uploaderName || 'Teacher',
          });
        });
        if (!cancelled) setVideos(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load videos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [langLabel]);

  async function logViewOnce(video: VideoDoc) {
    if (!user?.uid) return;
    if (viewedThisSession.current.has(video.id)) return;
    viewedThisSession.current.add(video.id);

    try {
      // Global log
      await addDoc(collection(db, 'videoViews'), {
        studentId: user.uid,
        videoId: video.id,
        language: video.language,
        title: video.title,
        viewedAt: serverTimestamp(),
      });

      // Per-video subcollection
      await addDoc(collection(db, 'videos', video.id, 'views'), {
        studentId: user.uid,
        viewedAt: serverTimestamp(),
      });
    } catch (e) {
      // Silently ignore logging failures
      console.warn('Failed to log video view', e);
    }
  }

  const pageBg = 'bg-gradient-to-br from-[#ECE7FF] via-[#F6F3FF] to-[#E3F1FF]';
  const cardBg = 'bg-white/85 backdrop-blur-xl border border-white/60 shadow-2xl';

  return (
    <div className={`relative min-h-screen ${pageBg} text-gray-800 overflow-hidden`}>
      {/* Decorative bits to match your style */}
      <svg className="pointer-events-none absolute -top-16 -left-10 w-72 h-72 opacity-70" viewBox="0 0 200 200" fill="none">
        <path d="M30 100 q40 -20 70 0 q-30 -20 -70 0" stroke="#B9C8FF" strokeWidth="4" fill="none" />
        <path d="M100 100 q40 -20 70 0 q-30 -20 -70 0" stroke="#C9B8FF" strokeWidth="4" fill="none" />
        <rect x="120" y="20" width="50" height="14" rx="3" fill="#E7DFFF" />
        <path d="M125 24 h40" stroke="#CFC2FF" strokeWidth="2" />
        <path d="M130 24 v10 M140 24 v10 M150 24 v10 M160 24 v10" stroke="#CFC2FF" strokeWidth="2" />
      </svg>
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 bg-[#F1EBFF] rounded-full blur-3xl opacity-60 animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[#DFF3FF] rounded-full blur-3xl opacity-60 animate-pulse delay-700" />

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-gradient-to-r from-white/60 via-white/50 to-white/60 border-b border-white/40 shadow-md">
        <div className="relative max-w-6xl mx-auto px-6 py-5">
          <Button
            className="absolute left-6 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110"
            onClick={() => router.push('/student/community')}
          >
            Back
          </Button>
          <h1 className="text-center text-4xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#6B5BBE] via-[#7C6BF2] to-[#A1B5FF] drop-shadow-sm">
            Watch Videos
          </h1>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Filter card */}
        <div className={`rounded-3xl ${cardBg} p-6 mb-8`}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#5A4DA8] flex items-center gap-2">
                <Languages className="h-6 w-6 text-[#6B5BBE]" />
                Choose Language
              </h2>
              <p className="text-[#5A4DA8]/80 text-sm">Only videos uploaded in the selected language are shown.</p>
            </div>
            <div className="w-full sm:w-64">
              <label className="block text-sm font-medium text-[#5A4DA8] mb-1">Language</label>
              <select
                className="w-full p-3 border rounded-lg bg-white"
                value={langLabel}
                onChange={(e) => setLangLabel(e.target.value as LangLabel)}
              >
                {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading && (
            <div className={`rounded-3xl ${cardBg} p-6 text-[#5A4DA8]`}>Loading videos…</div>
          )}

          {error && (
            <div className={`rounded-3xl ${cardBg} p-6 text-rose-700`}>{error}</div>
          )}

          {!loading && !error && videos.length === 0 && (
            <div className={`rounded-3xl ${cardBg} p-6 text-[#5A4DA8]`}>
              No videos found for <b>{langLabel}</b>.
            </div>
          )}

          {!loading && !error && videos.map(v => (
            <article key={v.id} className={`rounded-3xl ${cardBg} overflow-hidden`}>
              <div className="p-5">
                <h3 className="text-xl font-semibold text-[#4E3FA3]">{v.title}</h3>
                {v.description && (
                  <p className="text-[#4E3FA3]/80 text-sm mt-1">{v.description}</p>
                )}
                <p className="text-xs text-[#5A4DA8]/70 mt-1">Language: <b>{String(v.language)}</b></p>
                {v.uploaderName && (
                  <p className="text-xs text-[#5A4DA8]/70 mt-1">Uploaded by: <b>{v.uploaderName}</b></p>
                )}
              </div>

              <div className="bg-black/5">
                {/* As soon as the user starts playback we log the view */}
                <video
                  controls
                  preload="metadata"
                  className="w-full h-auto"
                  onPlay={() => logViewOnce(v)}
                  src={v.videoURL}
                />
              </div>

              <div className="p-4 flex items-center justify-end">
                <Button
                  className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110"
                  onClick={() => {
                    window.open(v.videoURL, '_blank', 'noopener,noreferrer');
                    logViewOnce(v);
                  }}
                >
                  Open in new tab
                </Button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

export default withAuth(StudentVideosPage, ['student', 'teacher']);
