'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';

const LANGS = ['Hindi','Marathi','Bengali','Tamil','English','Punjabi','Assamese'] as const;
type Lang = typeof LANGS[number];

export default function UploadVideoPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [language, setLanguage] = useState<Lang>('Hindi');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setDoneMsg(null);
    const f = e.target.files?.[0] || null;
    if (f && !f.type.startsWith('video/')) {
      setError('Please select a video file (mp4, webm, mov...)');
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const onUpload = async () => {
    setError(null);
    setDoneMsg(null);

    if (!user?.uid) {
      setError('You must be logged in to upload.');
      return;
    }
    if (!file) {
      setError('Please choose a video file.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      // Store under videos/<teacherUid>/<timestamp>_<filename>
      const safeName = file.name.replace(/\s+/g, '_');
      const path = `videos/${user.uid}/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, path);

      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      task.on('state_changed', (snap) => {
        if (snap.totalBytes > 0) {
          setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          () => {},
          (err) => reject(err),
          () => resolve()
        );
      });

      const videoURL = await getDownloadURL(task.snapshot.ref);

      await addDoc(collection(db, 'videos'), {
        title: title.trim(),
        description: desc.trim(),
        language,            // human label (exactly as chosen)
        videoURL,            // public https URL
        storagePath: path,   // gs path for reference
        uploadedBy: user.uid,
        timestamp: serverTimestamp(),
      });

      setDoneMsg('Video uploaded successfully!');
      setTitle('');
      setDesc('');
      setFile(null);
      setProgress(0);
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ECE7FF] via-[#F6F3FF] to-[#E3F1FF] text-gray-800 p-6">
      <div className="max-w-2xl mx-auto bg-white/80 backdrop-blur-md border border-white/70 rounded-2xl p-6 shadow-xl">
        <h1 className="text-3xl font-extrabold text-[#6B5BBE] mb-4">Upload a Video</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select
              className="w-full p-3 border rounded-lg bg-white"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Lang)}
            >
              {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              className="w-full p-3 border rounded-lg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full p-3 border rounded-lg"
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Enter a short description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Video file</label>
            <input
              type="file"
              accept="video/*"
              onChange={onSelectFile}
              className="w-full"
            />
            {file && (
              <p className="text-xs text-gray-600 mt-1">
                Selected: <b>{file.name}</b> ({Math.round(file.size / 1024 / 1024)} MB)
              </p>
            )}
          </div>

          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && <p className="text-sm text-rose-700">{error}</p>}
          {doneMsg && <p className="text-sm text-emerald-700">{doneMsg}</p>}

          <div className="flex gap-3">
            <Button
              className="bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl"
              onClick={onUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>

            <Button
              className="bg-white border rounded-xl"
              onClick={() => router.back()}
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
