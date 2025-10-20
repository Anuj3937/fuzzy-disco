'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import withAuth from '@/components/auth/withAuth';
import { Button } from '@/components/ui/button';
import { CalendarClock, FileUp, Video, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';

/** ✅ Firebase (no changes to your firebase.ts) */
import { storage, db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/** ─────────────────────────────────────────────────────────
 * Language options (same family as elsewhere in your app)
 * codes are simple 2-letter keys we’ll store alongside label
 * ───────────────────────────────────────────────────────── */
const LANGUAGE_OPTIONS = [
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'en', label: 'English' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'as', label: 'Assamese' },
] as const;

function TeacherCommunity() {
  const { user } = useAuth();
  const router = useRouter();

  /** ─────────────────────────────────────────────
   * Existing cards (unchanged visually)
   * ───────────────────────────────────────────── */
  const tabs = [
    {
      title: 'Schedule a Workshop',
      desc: 'Plan and organize interactive workshops for your students.',
      icon: CalendarClock,
      color: 'from-[#E5DBFF] to-[#F0E9FF]',
      link: '/teacher/community/schedule_workshop',
      onClick: 'route' as const,
    },
    {
      title: 'Create a Test',
      desc: 'Create and share assessments with your class easily.',
      icon: FileUp,
      color: 'from-[#D9F4EC] to-[#E9FFF8]',
      link: '/teacher/community/upload_tests',
      onClick: 'route' as const,
    },
    {
      title: 'Upload Videos',
      desc: 'Share recorded lessons and helpful video resources.',
      icon: Video,
      color: 'from-[#FFE3ED] to-[#FFF1F6]',
      link: '#',                    // we intercept this click to open the modal
      onClick: 'open-upload' as const,
    },
    {
      title: 'View Submissions',
      desc: 'Check student test submissions and their scores.',
      icon: Users,
      color: 'from-[#FDE7C9] to-[#FFF3E2]',
      link: '/teacher/community/view_submission',
      onClick: 'route' as const,
    },
  ];

  /** ─────────────────────────────────────────────
   * Local state for Upload modal/form
   * ───────────────────────────────────────────── */
  const [showUpload, setShowUpload] = useState(false);
  const [language, setLanguage] = useState<(typeof LANGUAGE_OPTIONS)[number]['code']>('hi');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const selectedLangLabel = useMemo(
    () => LANGUAGE_OPTIONS.find(l => l.code === language)?.label ?? 'Hindi',
    [language]
  );

  /** Small helpers */
  const sanitize = (s: string) =>
    s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  function handleCardClick(tab: typeof tabs[number]) {
    if (tab.onClick === 'open-upload') {
      setShowUpload(true);
      return;
    }
    if (tab.onClick === 'route') {
      router.push(tab.link);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setDoneMsg(null);
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.type.startsWith('video/')) {
      setError('Please choose a valid video file (mp4, webm, mov…).');
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDoneMsg(null);

    if (!user?.uid) {
      setError('You must be signed in as a teacher to upload.');
      return;
    }
    if (!file) {
      setError('Please pick a video file.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const safeTitle = sanitize(title);
      const ts = Date.now();

      // Where the video will be stored in Firebase Storage:
      // videos/<teacherUid>/<timestamp>_<title>.<ext>
      const path = `videos/${user.uid}/${ts}_${safeTitle}.${ext}`;
      const ref = storageRef(storage, path);

      const task = uploadBytesResumable(ref, file, { contentType: file.type || 'video/mp4' });

      task.on('state_changed', (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        setProgress(pct);
      });

      await task;
      const downloadURL = await getDownloadURL(ref);

      // Save the metadata in Firestore
      await addDoc(collection(db, 'videos'), {
        teacherID: user.uid,
        title: title.trim(),
        description: desc.trim(),
        languageCode: language,          // e.g. 'hi', 'mr'
        languageLabel: selectedLangLabel, // e.g. 'Hindi', 'Marathi'
        storagePath: path,
        downloadURL,
        size: file.size,
        contentType: file.type || 'video/mp4',
        createdAt: serverTimestamp(),
      });

      setDoneMsg('Video uploaded successfully!');
      setTitle('');
      setDesc('');
      setFile(null);
      setProgress(0);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#ECE7FF] via-[#F6F3FF] to-[#E3F1FF] text-gray-800 overflow-hidden">
      {/* ✏️ Decorative doodles */}
      <svg
        className="pointer-events-none absolute -top-16 -left-10 w-72 h-72 opacity-70"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path d="M30 100 q40 -20 70 0 q-30 -20 -70 0" stroke="#B9C8FF" strokeWidth="4" fill="none" />
        <path d="M100 100 q40 -20 70 0 q-30 -20 -70 0" stroke="#C9B8FF" strokeWidth="4" fill="none" />
        <rect x="120" y="20" width="50" height="14" rx="3" fill="#E7DFFF" />
        <path d="M125 24 h40" stroke="#CFC2FF" strokeWidth="2" />
        <path d="M130 24 v10 M140 24 v10 M150 24 v10 M160 24 v10" stroke="#CFC2FF" strokeWidth="2" />
      </svg>

      <svg
        className="pointer-events-none absolute bottom-0 right-0 w-[24rem] h-[24rem] opacity-70"
        viewBox="0 0 300 300"
        fill="none"
      >
        <path d="M40 80 q60 30 140 -20 q40 -20 90 0" stroke="#B6E3D2" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="210" y="220" width="26" height="8" rx="3" fill="#FFDAD5" />
        <path d="M210 220 l-10 10 l36 0 l-10 -10 z" fill="#FFC7BE" />
        <circle cx="220" cy="200" r="10" fill="#FBE2A8" />
      </svg>

      {/* Background glow */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 bg-[#F1EBFF] rounded-full blur-3xl opacity-60 animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[#DFF3FF] rounded-full blur-3xl opacity-60 animate-pulse delay-700" />

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-gradient-to-r from-white/60 via-white/50 to-white/60 border-b border-white/40 shadow-md">
        <div className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-center">
          <Button
            variant="outline"
            className="absolute left-6 bg-white/70 hover:bg-[#9B87F5] hover:text-white text-[#6B5BBE] font-medium border border-[#9B87F5] rounded-xl transition-all duration-200"
            onClick={() => router.push('/teacher')}
          >
            ← Back
          </Button>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#6B5BBE] via-[#7C6BF2] to-[#A1B5FF] drop-shadow-sm text-center">
            Teacher Community
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto p-6">
        <div className="relative mb-12 text-center">
          <h2 className="text-2xl font-semibold text-[#5A4DA8]">
            Create • Guide • Inspire
          </h2>
          <p className="text-[#5A4DA8]/80 text-base mt-1 max-w-2xl mx-auto">
            Manage your teaching content — schedule workshops, upload tests, share videos, and view submission.
          </p>
          <svg className="absolute -top-6 right-1/3 w-16 h-16 opacity-70" viewBox="0 0 120 120" fill="none">
            <path d="M20 80 L60 50 L100 80" stroke="#A6C7FF" strokeWidth="5" strokeLinecap="round" />
            <circle cx="60" cy="40" r="7" fill="#FFD7E5" />
          </svg>
        </div>

        {/* Tabs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const handle = () => handleCardClick(tab);
            return (
              <div
                key={idx}
                onClick={handle}
                className={`cursor-pointer relative overflow-hidden rounded-3xl bg-gradient-to-br ${tab.color} p-8 shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1.5 hover:scale-[1.02] backdrop-blur-md`}
              >
                <svg
                  className="pointer-events-none absolute -top-5 -right-5 w-24 h-24 opacity-40"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <path d="M10 50 Q 25 30, 40 50 T 70 50" stroke="#C9B8FF" strokeWidth="3" fill="none" />
                  <circle cx="80" cy="22" r="6" fill="#BFE7D8" />
                </svg>

                <Icon className="h-12 w-12 text-[#4E3FA3] mb-4" />
                <h2 className="text-2xl font-semibold text-[#3E2F9A] mb-2">
                  {tab.title}
                </h2>
                <p className="text-[#4E3FA3]/80 text-sm">{tab.desc}</p>

                <Button className="mt-6 bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110">
                  {tab.onClick === 'open-upload' ? 'Upload' : 'Open'}
                </Button>
              </div>
            );
          })}
        </div>
      </main>

      {/* ─────────────────────────────────────────────
          Upload Modal (inline, no new page)
          ───────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white/90 backdrop-blur-lg border border-white/60 shadow-2xl p-6 relative">
            <button
              className="absolute top-4 right-4 text-[#6B5BBE] hover:text-[#4E3FA3]"
              onClick={() => {
                if (!uploading) {
                  setShowUpload(false);
                  setError(null);
                  setDoneMsg(null);
                }
              }}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-extrabold text-[#6B5BBE] mb-1">
              Upload a Video
            </h3>
            <p className="text-sm text-[#5A4DA8]/80 mb-6">
              Only video files are allowed. The video is stored in Firebase Storage, and details go to Firestore.
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-[#4E3FA3] mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as typeof language)}
                  className="w-full p-3 rounded-xl border border-[#E1D3FF] bg-white focus:outline-none focus:ring-2 focus:ring-[#B39DFF]"
                  disabled={uploading}
                >
                  {LANGUAGE_OPTIONS.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[#4E3FA3] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Motion – Class 9 (Marathi)"
                  className="w-full p-3 rounded-xl border border-[#E1D3FF] bg-white focus:outline-none focus:ring-2 focus:ring-[#B39DFF]"
                  disabled={uploading}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#4E3FA3] mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  placeholder="Short summary of the video content…"
                  className="w-full p-3 rounded-xl border border-[#E1D3FF] bg-white focus:outline-none focus:ring-2 focus:ring-[#B39DFF]"
                  disabled={uploading}
                />
              </div>

              {/* File */}
              <div>
                <label className="block text-sm font-medium text-[#4E3FA3] mb-1">
                  Video file
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={onPickFile}
                  className="w-full p-2 rounded-xl border border-[#E1D3FF] bg-white"
                  disabled={uploading}
                />
                <p className="text-xs text-[#5A4DA8]/70 mt-1">
                  Accepted: MP4, WebM, MOV, etc. (browser-supported)
                </p>
              </div>

              {/* Progress */}
              {uploading && (
                <div className="w-full bg-[#E2D9FF] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-[#A689FF] to-[#7E61FF] rounded-full transition-all"
                    style={{ width: `${Math.round(progress)}%` }}
                  />
                </div>
              )}

              {/* Status */}
              {error && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              {doneMsg && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  {doneMsg}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  className="border border-[#E1D3FF] text-[#6B5BBE] bg-white rounded-xl hover:bg-[#F7F3FF]"
                  onClick={() => {
                    if (!uploading) {
                      setShowUpload(false);
                      setError(null);
                      setDoneMsg(null);
                    }
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={uploading}
                  className={`rounded-xl text-white ${uploading
                    ? 'bg-[#B6A5FF] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] hover:brightness-110'
                    }`}
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(TeacherCommunity, ['teacher']);
