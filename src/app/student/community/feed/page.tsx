'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type CommunityPost = {
  id: string;
  title: string;
  description: string;
  createdAt: string; // ISO
};

type Comment = {
  id: string;
  postId: string;
  text: string;
  createdAt: string; // ISO
};

const POSTS_KEY = 'communityPosts';
const COMMENTS_KEY = 'communityComments';

function uid() {
  return (
    'id-' +
    Math.random().toString(36).slice(2, 8) +
    '-' +
    Date.now().toString(36)
  );
}

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso ?? '';
  }
}

export default function CommunityExploreFeed() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawPosts = localStorage.getItem(POSTS_KEY) || '[]';
      const rawComments = localStorage.getItem(COMMENTS_KEY) || '[]';
      setPosts(JSON.parse(rawPosts));
      setComments(JSON.parse(rawComments));
    } catch (e) {
      console.error(e);
      setPosts([]);
      setComments([]);
      setError('Could not load posts.');
    }
  }, []);

  const commentsByPost = useMemo(() => {
    const map: Record<string, Comment[]> = {};
    for (const c of comments) {
      (map[c.postId] ||= []).push(c);
    }
    Object.keys(map).forEach((k) =>
      map[k].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    );
    return map;
  }, [comments]);

  const onChangeDraft = (postId: string, val: string) =>
    setDrafts((d) => ({ ...d, [postId]: val }));

  const addComment = (postId: string) => {
    const text = (drafts[postId] || '').trim();
    if (!text) return;

    const newComment: Comment = {
      id: uid(),
      postId,
      text,
      createdAt: new Date().toISOString(),
    };

    const updated = [newComment, ...comments];
    setComments(updated);
    setDrafts((d) => ({ ...d, [postId]: '' }));
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(updated));
  };

  const deletePost = (postId: string) => {
    if (!posts) return;
    const ok = window.confirm('Delete this post? This will also remove its comments.');
    if (!ok) return;

    // Remove post
    const updatedPosts = posts.filter((p) => p.id !== postId);
    setPosts(updatedPosts);
    localStorage.setItem(POSTS_KEY, JSON.stringify(updatedPosts));

    // Remove associated comments
    const updatedComments = comments.filter((c) => c.postId !== postId);
    setComments(updatedComments);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(updatedComments));

    // Clean any draft
    setDrafts((d) => {
      const copy = { ...d };
      delete copy[postId];
      return copy;
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-gray-800">
      {/* Deeper pastel background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E9E4FF] via-[#FFEAF2] to-[#E2F7F1]" />
      {/* Stronger blurred blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#DAD2FF] blur-3xl opacity-70 animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#FFDCC7] blur-3xl opacity-70 animate-pulse delay-700" />
      <div className="pointer-events-none absolute top-1/3 left-10 h-36 w-36 rounded-full bg-[#CFF3E8] blur-3xl opacity-60" />

      {/* Header */}
      <header className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-4">
        <div className="flex items-center justify-between">
          {/* Back button */}
          <button
            onClick={() => router.push('/student/community')}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D5CEFF] bg-white/80 px-4 py-2 text-sm font-semibold text-[#4C409F] shadow hover:shadow-md backdrop-blur hover:bg-white"
          >
            {/* back chevron */}
            <svg width="16" height="16" viewBox="0 0 24 24" className="-ml-0.5">
              <path d="M15 18l-6-6 6-6" fill="none" stroke="#6F5AE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#DDD4FF] via-[#FFE0EA] to-[#CFEFF0] px-4 py-2 text-xs font-semibold text-[#3F338C] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#7C6BF2]" />
            Explore & Join the conversation
          </span>

          {/* Spacer to balance flex */}
          <div className="w-[84px]" />
        </div>

        <h1 className="mt-4 text-center text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#6F5AE8] via-[#9B87F5] to-[#59BBD0] drop-shadow">
          Explore Community Posts
        </h1>
        <p className="mt-3 text-center text-[#4C409F]/90">
          See what others have shared — add your thoughts in the comments.
        </p>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        {!posts ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-3xl bg-gradient-to-br from-[#DDD4FF] to-[#FFE0EA] opacity-80 shadow"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-[#FFD6DE] bg-[#FFF1F4] p-6 text-[#7C2A3A] shadow">
            {error}
          </div>
        ) : posts.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-[#D5CEFF] bg-white/85 p-10 text-center backdrop-blur shadow">
            <p className="text-lg font-semibold text-[#4C409F]">No posts yet.</p>
            <p className="mt-1 text-sm text-[#4C409F]/70">Be the first to share something!</p>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <article
                key={p.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#FFFFFF]/70 bg-white/90 p-6 shadow-2xl backdrop-blur transition-transform hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-10px_rgba(111,90,232,0.35)]"
              >
                {/* Corner accent */}
                <svg className="pointer-events-none absolute -top-3 -right-3 h-20 w-20 opacity-40" viewBox="0 0 100 100" fill="none">
                  <circle cx="70" cy="22" r="9" fill="#CFF3E8" />
                  <path d="M10 50 Q 25 30, 40 50 T 70 50" stroke="#C0B0FF" strokeWidth="3" />
                </svg>

                {/* Post header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-[#3F338C]">{p.title}</h3>

                    {/* Delete button */}
                    <button
                      onClick={() => deletePost(p.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#FFD6DE] bg-[#FFF1F4] px-2.5 py-1.5 text-xs font-semibold text-[#7C2A3A] hover:bg-white hover:shadow"
                      title="Delete post"
                    >
                      {/* trash icon */}
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <path d="M3 6h18" stroke="#C43D59" strokeWidth="2" strokeLinecap="round" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#C43D59" strokeWidth="2" strokeLinecap="round" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#C43D59" strokeWidth="2" strokeLinecap="round" />
                        <path d="M10 11v6M14 11v6" stroke="#C43D59" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Delete
                    </button>
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#EFE9FF] px-3 py-1 text-[12px] font-medium text-[#5A4DA8]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9B87F5]" />
                    {formatDate(p.createdAt)}
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-gray-800">{p.description}</p>
                </div>

                {/* Divider */}
                <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-[#DAD2FF] to-transparent" />

                {/* Comments list */}
                <div className="space-y-3 max-h-44 overflow-auto pr-1">
                  {(commentsByPost[p.id] || []).map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-[#E6DEFF] bg-gradient-to-br from-[#F6F3FF] to-[#FDF7FA] px-3 py-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[#4C409F]">Comment</span>
                        <span className="text-[11px] text-[#5A4DA8]/70">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-800">{c.text}</p>
                    </div>
                  ))}

                  {(!commentsByPost[p.id] || commentsByPost[p.id].length === 0) && (
                    <div className="rounded-2xl border border-dashed border-[#D5CEFF] bg-white/80 px-3 py-2 text-sm text-[#4C409F]/70">
                      No comments yet — be the first!
                    </div>
                  )}
                </div>

                {/* Comment composer */}
                <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#EFE9FF] via-[#FFE5ED] to-[#DFF6F0] p-3 border border-white/60">
                  <div className="flex items-start gap-3">
                    {/* Pencil doodle */}
                    <svg
                      className="mt-1 h-6 w-6 flex-shrink-0 opacity-90"
                      viewBox="0 0 64 64"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 48 L14 46 L46 14 C48 12 51 12 53 14 C55 16 55 19 53 21 L21 53 L18 58 L13 55 L8 52 Z"
                        fill="#FFC7D6"
                        stroke="#B6A6FF"
                        strokeWidth="2"
                      />
                      <path d="M43 17 L47 21" stroke="#6F5AE8" strokeWidth="2" />
                    </svg>

                    <div className="flex-1">
                      <textarea
                        value={drafts[p.id] || ''}
                        onChange={(e) => onChangeDraft(p.id, e.target.value)}
                        placeholder="Write a kind, constructive comment…"
                        className="min-h-[76px] w-full rounded-xl border border-[#D5CEFF] bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#BCAAFD]"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-[#4C409F]/70">Be nice • Stay helpful</span>
                        <button
                          onClick={() => addComment(p.id)}
                          className="rounded-xl bg-gradient-to-r from-[#6F5AE8] via-[#7EC8E3] to-[#F7AFC1] px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110 active:scale-[0.99]"
                          type="button"
                        >
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom ribbon */}
                <div className="pointer-events-none absolute -bottom-6 -left-10 h-24 w-56 rotate-6 bg-gradient-to-r from-[#DDD4FF] via-[#FFDCC7] to-[#CFF3E8] opacity-50 blur-2xl" />
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
