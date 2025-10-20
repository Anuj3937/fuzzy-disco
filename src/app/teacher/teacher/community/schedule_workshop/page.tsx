'use client';
import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ScheduleWorkshop() {
  const router = useRouter();

  const [Title, setTitle] = useState('');
  const [Description, setDescription] = useState('');
  const [ClassName, setClassName] = useState('');
  const [Date, setDate] = useState('');
  const [Time, setTime] = useState('');
  const [Duration, setDuration] = useState('');
  const [Language, setLanguage] = useState('');
  const [MeetingLink, setMeetingLink] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Title || !Date || !Time || !ClassName || !Language || !MeetingLink) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "community_workshops"), {
        Title,
        Description,
        Class: ClassName,
        Date,
        Time,
        Duration,
        Language,
        MeetingLink,            // ✅ Google Meet link stored
        createdAt: serverTimestamp(),
      });
      alert("Workshop scheduled successfully!");
      router.refresh();        // optional: refresh page or redirect
      setTitle('');
      setDescription('');
      setClassName('');
      setDate('');
      setTime('');
      setDuration('');
      setLanguage('');
      setMeetingLink('');
    } catch (err) {
      console.error(err);
      alert("Error scheduling workshop.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white/80 rounded-3xl shadow-lg backdrop-blur-lg mt-10">
      <h1 className="text-3xl font-bold text-[#5A4DA8] mb-6">Schedule Workshop</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">

        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#4E3FA3]">Title *</label>
          <Input value={Title} onChange={(e) => setTitle(e.target.value)} placeholder="Workshop title" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#4E3FA3]">Description</label>
          <Textarea value={Description} onChange={(e) => setDescription(e.target.value)} placeholder="Workshop details" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#4E3FA3]">Class *</label>
          <select value={ClassName} onChange={(e) => setClassName(e.target.value)} className="rounded-xl border p-3">
            <option value="">Select Class</option>
            <option>7th</option>
            <option>8th</option>
            <option>9th</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#4E3FA3]">Language *</label>
          <select value={Language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border p-3">
            <option value="">Select Language</option>
            <option>Hindi</option>
            <option>English</option>
            <option>Punjabi</option>
            <option>Tamil</option>
            <option>Assamese</option>
            <option>Bengali</option>
            <option>Marathi</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[#4E3FA3]">Date *</label>
            <Input type="date" value={Date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-medium text-[#4E3FA3]">Time *</label>
            <Input type="time" value={Time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#4E3FA3]">Duration (e.g., 60 mins)</label>
          <Input value={Duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-[#4E3FA3]">Google Meet Link *</label>
          <Input type="url" placeholder="https://meet.google.com/abc-defg-hij" value={MeetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
        </div>

        <Button type="submit" disabled={loading} className="mt-4 bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white">
          {loading ? 'Scheduling...' : 'Schedule Workshop'}
        </Button>
      </form>
    </div>
  );
}
