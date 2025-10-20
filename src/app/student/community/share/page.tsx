'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type CommunityPost = {
  id: string;
  title: string;
  description: string;
  createdAt: string; // ISO
};

function uid() {
  return (
    'id-' +
    Math.random().toString(36).slice(2, 8) +
    '-' +
    Date.now().toString(36)
  );
}

const POSTS_KEY = 'communityPosts';

export default function ShareSomething() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const onPost = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPosted(false);

    const t = title.trim();
    const d = description.trim();
    if (!t || !d) {
      setError('Please add a title and description before posting.');
      return;
    }

    setPosting(true);
    try {
      const existing: CommunityPost[] = JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
      const newPost: CommunityPost = {
        id: uid(),
        title: t,
        description: d,
        createdAt: new Date().toISOString(),
      };
      const updated = [newPost, ...existing];
      localStorage.setItem(POSTS_KEY, JSON.stringify(updated));

      setTitle('');
      setDescription('');
      setPosted(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while saving your post.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-gray-800">
      {/* Layered pastel background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F4F1FF] via-[#FFF6F9] to-[#F0FAF8]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#EDE9FE] blur-3xl opacity-55 animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#FFE7D1] blur-3xl opacity-60 animate-pulse delay-700" />
      <div className="pointer-events-none absolute top-1/3 right-10 h-40 w-40 rounded-full bg-[#DFF5F0] blur-3xl opacity-50" />
      <div className="pointer-events-none absolute bottom-20 left-1/4 h-32 w-32 rounded-full bg-[#E7F0FF] blur-3xl opacity-50" />

      {/* Pencil + stationery doodles */}
      <svg
        className="pointer-events-none absolute top-6 left-6 w-28 h-28 opacity-90"
        viewBox="0 0 160 160"
        fill="none"
        aria-hidden="true"
      >
        <rect x="28" y="28" width="72" height="12" rx="6" fill="#E1D4FF" />
        <path d="M100 28 L128 18 L121 46 Z" fill="#FFD3E2" />
        <rect x="28" y="50" width="94" height="8" rx="4" fill="#DFF0FF" />
        <rect x="28" y="66" width="64" height="8" rx="4" fill="#E0F4F1" />
      </svg>

      <svg
        className="pointer-events-none absolute top-28 right-6 w-24 h-24 opacity-70"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="36" cy="36" r="10" fill="#FFE7D1" />
        <rect x="54" y="26" width="44" height="8" rx="4" fill="#E7F0FF" />
        <path d="M12 90 q30 -20 70 0" stroke="#B8E2D6" strokeWidth="4" strokeLinecap="round" />
      </svg>

      {/* Header with Back button */}
      <header className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-4">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => router.push('/student/community')}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D5CEFF] bg-white/80 px-4 py-2 text-sm font-semibold text-[#4C409F] shadow hover:shadow-md backdrop-blur hover:bg-white"
              aria-label="Back to Community"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="-ml-0.5">
                <path d="M15 18l-6-6 6-6" fill="none" stroke="#6F5AE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            {/* Spacer to keep title centered on wide screens */}
            <div className="w-[84px]" />
          </div>

          <h1 className="text-center text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#7C6BF2] via-[#9B87F5] to-[#7EC8E3] drop-shadow-sm">
            Share Something
          </h1>
          <p className="mt-2 text-center text-[#5F55B0]">
            Post your ideas, projects, or thoughts for everyone to see.
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-20">
        {/* Info strip */}
        <div className="mx-auto mb-6 flex w-full items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EDE9FE] via-[#FFF0F5] to-[#DFF5F0] px-4 py-2 text-xs font-medium text-[#4E3FA3] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#9B87F5]" />
            Inspire others with your voice
          </div>
        </div>

        <form
          onSubmit={onPost}
          className="relative rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl backdrop-blur"
        >
          {/* Soft corner ribbons */}
          <div className="pointer-events-none absolute -top-6 -left-8 h-24 w-40 -rotate-6 bg-gradient-to-r from-[#EDE9FE] via-[#FFE7D1] to-[#DFF5F0] opacity-40 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-40 rotate-6 bg-gradient-to-r from-[#FDE7C9] via-[#E9F3FF] to-[#FCE7F3] opacity-40 blur-2xl" />

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#4E3FA3] mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a short, catchy title…"
              className="w-full rounded-xl border border-[#E7E3FF] bg-white/95 px-4 py-3 outline-none focus:ring-2 focus:ring-[#C7B7FF]"
              maxLength={120}
              required
            />
            <div className="mt-2 text-xs text-[#5A4DA8]/70">Max 120 characters</div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#4E3FA3] mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write your thoughts here. You can share ideas, questions, project updates, or reflections…"
              className="min-h-[160px] w-full rounded-xl border border-[#E7E3FF] bg-white/95 px-4 py-3 text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-[#C7B7FF]"
              required
            />
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 rounded-xl bg-[#FFF1F0] px-4 py-3 text-sm text-[#8A3B3B] border border-[#FFD6D3]">
              {error}
            </div>
          )}
          {posted && (
            <div className="mb-4 rounded-xl bg-[#E7FFF7] px-4 py-3 text-sm text-[#2A7B6F] border border-[#C6F2E7]">
              Posted! Your post will appear in <b>“See What Others Have Shared”</b>.
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EDE9FE] via-[#FFF0F5] to-[#E7F0FF] px-3 py-1.5 text-xs font-medium text-[#4E3FA3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7EC8E3]" />
              Be kind & respectful
              <span className="h-1.5 w-1.5 rounded-full bg-[#F9B8C6]" />
            </div>

            <button
              type="submit"
              disabled={posting}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow transition
                ${
                  posting
                    ? 'bg-[#EEE9FF] text-[#8A82B8] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#9B87F5] via-[#7EC8E3] to-[#F9B8C6] text-white hover:brightness-110'
                }`}
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>

        {/* Bottom corner doodle cluster */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute -bottom-6 right-8 w-32 h-32 opacity-70"
            viewBox="0 0 120 120"
            fill="none"
            aria-hidden="true"
          >
            <path d="M10 80 q30 -20 70 0 q20 10 30 20" stroke="#B8E2D6" strokeWidth="4" strokeLinecap="round" />
            <rect x="70" y="18" width="32" height="10" rx="5" fill="#FFD3E2" />
            <circle cx="28" cy="26" r="8" fill="#E1D4FF" />
          </svg>
        </div>
      </main>
    </div>
  );
}
