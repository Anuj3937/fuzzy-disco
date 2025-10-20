'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  orderBy
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Phone } from 'lucide-react';

export default function DoubtSolverPage() {
  const { user, loading } = useAuth();
  const [doubts, setDoubts] = useState<any[]>([]);
  const [selectedDoubt, setSelectedDoubt] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // For example, assume teacher’s subject is stored in user.subject (you can adapt if different)
  const teacherSubject = user?.subject || 'Science';

  // --- Load doubts related to teacher's subject
  useEffect(() => {
    if (!loading && user) {
      const q = query(collection(db, 'doubts'), where('subject', '==', teacherSubject));
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDoubts(data);
      });
      return () => unsub();
    }
  }, [user, loading, teacherSubject]);

  // --- Load chat messages when a doubt is opened
  useEffect(() => {
    if (!selectedDoubt) return;
    const msgRef = collection(db, 'doubts', selectedDoubt.id, 'messages');
    const q = query(msgRef, orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => d.data()));
    });
    return () => unsub();
  }, [selectedDoubt]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedDoubt) return;
    await addDoc(collection(db, 'doubts', selectedDoubt.id, 'messages'), {
      senderId: user.uid,
      senderName: user.displayName || 'Teacher',
      text: newMessage.trim(),
      timestamp: serverTimestamp(),
    });
    setNewMessage('');
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
                <h2 className="text-lg font-semibold text-purple-700 mb-1">{doubt.subject}</h2>
                <p className="text-gray-800 font-medium">{doubt.text}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Chapter: {doubt.chapter}
                </p>
                <p className="text-sm text-gray-500">Status: {doubt.status || 'Pending'}</p>
              </CardContent>
            </Card>
          ))}
          {doubts.length === 0 && (
            <p className="text-center text-gray-600 col-span-full mt-20">
              No new doubts yet for {teacherSubject}.
            </p>
          )}
        </div>
      )}

      {/* Chat Interface */}
      {selectedDoubt && (
        <div className="relative max-w-3xl mx-auto bg-white/90 backdrop-blur-md border border-purple-200 rounded-2xl shadow-2xl p-6">
          <Button
            variant="outline"
            onClick={() => setSelectedDoubt(null)}
            className="mb-4 border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            ← Back to Doubts
          </Button>

          <h2 className="text-2xl font-bold text-purple-800 mb-2">
            {selectedDoubt.chapter} ({selectedDoubt.subject})
          </h2>
          <p className="text-gray-700 mb-4">Student Doubt: {selectedDoubt.text}</p>

          {/* Chat Messages */}
          <div className="h-80 overflow-y-auto border border-purple-100 rounded-xl p-4 bg-purple-50/50 mb-4">
            {messages.length === 0 && (
              <p className="text-center text-gray-500">No messages yet. Start the discussion!</p>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`my-2 flex ${
                  msg.senderId === user.uid ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-xs ${
                    msg.senderId === user.uid
                      ? 'bg-purple-300 text-white'
                      : 'bg-white border border-purple-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 border border-purple-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <Button onClick={sendMessage} className="bg-purple-600 hover:bg-purple-700 text-white">
              <MessageCircle className="h-4 w-4 mr-2" /> Send
            </Button>
            <Button
              onClick={() => alert('Call feature coming soon 📞')}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Phone className="h-4 w-4 mr-2" /> Call
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
