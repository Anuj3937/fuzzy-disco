// src/app/student/community/watch_videos/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";

const LANGS = [
  "Hindi",
  "Marathi",
  "Bengali",
  "Tamil",
  "English",
  "Punjabi",
  "Assamese",
] as const;
type LangLabel = (typeof LANGS)[number];

type VideoDoc = {
  id: string;
  title: string;
  description?: string;
  language: LangLabel | string;
  videoURL: string;
  uploaderName?: string;
  createdAt?: any;
};

function getClassNumber(cn?: string | null) {
  if (!cn) return "9";
  const s = String(cn).trim().toLowerCase();
  const m = s.match(/(?:class|std|standard)?\s*(\d{1,2})/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if ([7, 8, 9].includes(n)) return String(n);
  }
  if (/7th/.test(s) || /\bvii\b/.test(s) || /\bseven|saat\b/.test(s)) return "7";
  if (/8th/.test(s) || /\bviii\b/.test(s) || /\beight|aath\b/.test(s)) return "8";
  if (/9th/.test(s) || /\bix\b/.test(s) || /\bnine|nau\b/.test(s)) return "9";
  return "9";
}

export default function WatchVideosPage() {
  const { user } = useAuth();

  const [language, setLanguage] = useState<LangLabel | "">("");
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const studentClass = user?.role === "student" ? (user.className as string | undefined) : undefined;
  const classNormalized = getClassNumber(studentClass);

  const fetchVideos = async (lang: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "videos"), where("language", "==", lang));
      const snap = await getDocs(q);
      const out: VideoDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        out.push({
          id: d.id,
          title: data.title || "Untitled",
          description: data.description || "",
          language: data.language || "",
          videoURL: data.videoURL || "",
          uploaderName: data.uploaderName || "Teacher",
          createdAt: data.createdAt || null,
        });
      });
      setVideos(out);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to fetch videos.");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const onChangeLanguage = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as LangLabel;
    setLanguage(lang);
    if (lang) {
      await fetchVideos(lang);
    } else {
      setVideos([]);
    }
  };

  const logView = async (video: VideoDoc) => {
    if (!user?.uid) return;
    try {
      // Global collection
      await addDoc(collection(db, "videoViews"), {
        videoId: video.id,
        studentID: user.uid,
        class: classNormalized,
        language: video.language || language || "",
        title: video.title,
        timestamp: serverTimestamp(),
      });

      // Per-video subcollection
      await addDoc(collection(db, "videos", video.id, "views"), {
        studentID: user.uid,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to log view", e);
    }
  };

  const handlePlay = async (v: VideoDoc) => {
    setPlayingId(v.id);
    await logView(v);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F7FF] via-white to-[#E8F7FF]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-sky-700">Watch a Video</h1>
        <p className="text-sky-900/70 mt-1">
          Choose your language to see matching videos uploaded by teachers.
        </p>

        <div className="mt-6 rounded-2xl bg-white/85 backdrop-blur border border-sky-100 shadow-xl p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-sky-900/80 mb-1">Language</label>
              <select
                className="w-full p-3 border rounded-lg bg-white"
                value={language}
                onChange={onChangeLanguage}
              >
                <option value="">Select Language</option>
                {LANGS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && <p className="mt-4 text-sky-800">Loading videos…</p>}
          {error && (
            <p className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 inline-block">
              {error}
            </p>
          )}

          {!loading && !error && language && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.length === 0 && (
                <p className="text-sky-800">No videos found for <b>{language}</b> yet.</p>
              )}

              {videos.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-sky-100 bg-white/90 shadow-lg overflow-hidden"
                >
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-sky-800">{v.title}</h3>
                    {v.description && (
                      <p className="text-sm text-sky-900/70 mt-1">{v.description}</p>
                    )}
                    <p className="text-xs text-sky-900/60 mt-2">
                      Language: <b>{String(v.language)}</b> • Uploaded by {v.uploaderName || "Teacher"}
                    </p>
                  </div>

                  <div className="p-4 pt-0">
                    {playingId === v.id ? (
                      <video
                        controls
                        className="w-full rounded-xl border"
                        src={v.videoURL}
                        onPlay={() => logView(v)}
                      />
                    ) : (
                      <button
                        onClick={() => handlePlay(v)}
                        className="w-full px-5 py-3 rounded-xl text-white bg-gradient-to-r from-sky-600 to-sky-700 hover:brightness-110"
                      >
                        ▶️ Play Video
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!language && (
            <p className="mt-4 text-sky-800">Select a language to see available videos.</p>
          )}
        </div>
      </div>
    </div>
  );
}
