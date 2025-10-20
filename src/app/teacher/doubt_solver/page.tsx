'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import {
  collection,
  query as fq,
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Phone } from 'lucide-react';
import { addTeacherMessage } from '@/lib/db';
import { useRouter } from 'next/navigation';

export default function DoubtSolverPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [doubts, setDoubts] = useState<any[]>([]);
  const [selectedDoubt, setSelectedDoubt] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Teacher profile fields (adapt if your user profile stores differently)
  const teacherSubject = (user as any)?.subject || 'Science';
  const teacherClass = (user as any)?.classGrade || null;

  // --- Load doubts related to teacher's subject (+ class if available)
  useEffect(() => {
    if (loading || !user) return;

    const base = collection(db, 'doubts');

    // Build a Firestore query: subject == teacherSubject AND (optionally) classGrade == teacherClass
    // We avoid an orderBy here to prevent new composite-index requirements; we’ll sort client-side.
    let q = teacherClass
      ? fq(base, where('subject', '==', teacherSubject), where('classGrade', '==', teacherClass))
      : fq(base, where('subject', '==', teacherSubject));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          // Only show doubts that are unassigned or assigned to this teacher
          .filter((d: any) => !d.assignedTo || d.assignedTo === user.uid)
          // Sort by lastUpdatedAt desc (client side)
          .sort((a: any, b: any) => {
            const sa = a.lastUpdatedAt?.seconds ?? a.createdAt?.seconds ?? 0;
            const sb = b.lastUpdatedAt?.seconds ?? b.createdAt?.seconds ?? 0;
            return sb - sa;
          });
        setDoubts(data);
      },
      (err) => {
        console.error('onSnapshot(doubts) error:', err);
      }
    );

    return () => unsub();
  }, [user, loading, teacherSubject, teacherClass]);

  // --- Load chat messages when a doubt is opened
  useEffect(() => {
    if (!selectedDoubt) return;
    const msgRef = collection(db, 'doubts', selectedDoubt.id, 'messages');
    const q = fq(msgRef, orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => console.error('onSnapshot(messages) error:', err)
    );
    return () => unsub();
  }, [selectedDoubt]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedDoubt || !user) return;
    try {
      // Use the helper that claims the doubt (if needed) and stores both EN + translated text
      await addTeacherMessage({
        doubtId: selectedDoubt.id,
        teacher: { uid: user.uid, displayName: user.displayName || 'Teacher' },
        text_en: newMessage.trim(), // teacher composes in English
        studentLanguage: selectedDoubt.language || 'en',
      });
      setNewMessage('');
    } catch (e: any) {
      alert(e?.message || 'Failed to send your message.');
    }
  };

  if (loading) return <p className="text-center mt-20 text-gray-500">Loading...</p>;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#E8FFF8] via-[#FFF0F6] to-[#FFF9E7] p-8">
      <h1 className="text-4xl font-bold text-purple-700 mb-8 text-center">Doubt Solver 💬</h1>

      {/* Doubts List */}
      {!selectedDoubt && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doubts.map((doubt) => (
            <Card
              key={doubt.id}
              className="cursor-pointer bg-white/80 border border-purple-100 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition"
              onClick={() => setSelectedDoubt(doubt)}
            >
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold text-purple-700 mb-1">
                  {doubt.subject} {doubt.classGrade ? `• Class ${doubt.classGrade}` : ''}
                </h2>
                <p className="text-gray-800 font-medium">
                  {/* Show new schema fields, fallback to legacy text */}
                  {doubt.text_en || doubt.text_original || doubt.text || ''}
                </p>
                <p className="text-sm text-gray-500 mt-2">Chapter: {doubt.chapter}</p>
                <p className="text-sm text-gray-500">Status: {doubt.status || 'Pending'}</p>
              </CardContent>
            </Card>
          ))}
          {doubts.length === 0 && (
            <p className="text-center text-gray-600 col-span-full mt-20">
              No new doubts yet for {teacherSubject}
              {teacherClass ? ` (Class ${teacherClass})` : ''}.
            </p>
          )}
        </div>
      )}

      {/* Chat Interface */}
      {selectedDoubt && (
        <div className="relative max-w-3xl mx-auto bg-white/90 backdrop-blur-md border border-purple-200 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setSelectedDoubt(null)}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              ← Back to Doubts
            </Button>

            <Button
              onClick={() => router.push(`/call/${selectedDoubt.id}`)}
              className="bg-pink-500 hover:bg-pink-600 text-white"
              title="Start call with the student"
            >
              <Phone className="h-4 w-4 mr-2" /> Call
            </Button>
          </div>

          <h2 className="text-2xl font-bold text-purple-800 mb-2">
            {selectedDoubt.chapter} ({selectedDoubt.subject}
            {selectedDoubt.classGrade ? ` • Class ${selectedDoubt.classGrade}` : ''})
          </h2>
          <p className="text-gray-700 mb-4">
            Student Doubt:&nbsp;
            {selectedDoubt.text_en || selectedDoubt.text_original || selectedDoubt.text || ''}
          </p>

          {/* Chat Messages */}
          <div className="h-80 overflow-y-auto border border-purple-100 rounded-xl p-4 bg-purple-50/50 mb-4">
            {messages.length === 0 && (
              <p className="text-center text-gray-500">No messages yet. Start the discussion!</p>
            )}
            {messages.map((msg) => {
              const isTeacher = msg.senderRole === 'teacher' || msg.senderId === user?.uid;
              const mainText = msg.text_en || msg.text_original || msg.text || '';
              const showEnglishEcho = !!msg.text_en && !isTeacher; // show EN line for student-translated view if needed
              return (
                <div
                  key={msg.id}
                  className={`my-2 flex ${isTeacher ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`p-3 rounded-2xl max-w-xs ${
                      isTeacher
                        ? 'bg-purple-300 text-white'
                        : 'bg-white border border-purple-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{mainText}</p>
                    {/* Optional: show EN echo when student message had translation */}
                    {showEnglishEcho && (
                      <p className="text-[11px] mt-1 opacity-70">EN: {msg.text_en}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your reply in English…"
              className="flex-1 border border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <Button onClick={sendMessage} className="bg-purple-600 hover:bg-purple-700 text-white">
              <MessageCircle className="h-4 w-4 mr-2" /> Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
