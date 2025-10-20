// src/app/chat/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  getDocs,
  writeBatch,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import type { Chat, ChatMessage, UserProfile, Call } from '@/lib/types';
import withAuth from '@/components/auth/withAuth';
import AppHeader from '@/components/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, MessageSquarePlus, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { NewChatDialog } from '@/components/chat/NewChatDialog';
import { IncomingCallDialog } from '@/components/chat/IncomingCallDialog';

const getInitials = (email: string | undefined) => {
  if (!email) return 'U';
  return email.substring(0, 2).toUpperCase();
};

function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );
    
    const unsubscribe = onSnapshot(callsQuery, async (snapshot) => {
        if (!snapshot.empty) {
            const callDoc = snapshot.docs[0];
            const callData = { id: callDoc.id, ...callDoc.data() } as Call;

            // Fetch caller's profile
            const userQuery = query(collection(db, 'users'), where('uid', '==', callData.callerId));
            const userSnapshot = await getDocs(userQuery);
            if(!userSnapshot.empty) {
                callData.callerProfile = userSnapshot.docs[0].data() as UserProfile;
            }
            
            setIncomingCall(callData);
        } else {
            setIncomingCall(null);
        }
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to user's chats
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const chatsQuery = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(chatsQuery, async (querySnapshot) => {
      const chatsData: Chat[] = [];
      for (const doc of querySnapshot.docs) {
          const chat = { id: doc.id, ...doc.data() } as Chat;
          
          const otherParticipantId = chat.participants.find(p => p !== user.uid);
          if (otherParticipantId) {
            const userQuery = query(collection(db, 'users'), where('uid', '==', otherParticipantId));
            const userSnapshot = await getDocs(userQuery);
            if (!userSnapshot.empty) {
                chat.participantProfiles = [userSnapshot.docs[0].data() as UserProfile];
            }
          }
          chatsData.push(chat);
      }
      setChats(chatsData.sort((a, b) => (b.lastMessage?.timestamp?.toMillis() || 0) - (a.lastMessage?.timestamp?.toMillis() || 0)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to messages of the active chat
  useEffect(() => {
    if (!activeChatId) {
        setMessages([]);
        return;
    };

    const messagesQuery = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const messagesData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId || !user) return;

    setIsSending(true);
    const text = newMessage;
    setNewMessage('');

    try {
      const messageData = {
        chatId: activeChatId,
        senderId: user.uid,
        text,
        timestamp: serverTimestamp(),
      };

      const batch = writeBatch(db);
      const messageRef = doc(collection(db, 'chats', activeChatId, 'messages'));
      batch.set(messageRef, messageData);
      
      const chatRef = doc(db, 'chats', activeChatId);
      batch.update(chatRef, {
        lastMessage: {
          text,
          timestamp: serverTimestamp(),
          senderId: user.uid,
        },
      });

      await batch.commit();

    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateNewChat = async (selectedUser: UserProfile) => {
    if (!user) return;
    
    const existingChat = chats.find(chat => chat.participants.includes(selectedUser.uid));
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setIsNewChatDialogOpen(false);
      return;
    }

    try {
        const newChatRef = await addDoc(collection(db, 'chats'), {
            participants: [user.uid, selectedUser.uid],
            lastMessage: null,
        });
        setActiveChatId(newChatRef.id);
        setIsNewChatDialogOpen(false);
    } catch(error) {
        console.error("Error creating chat", error);
    }
  };

  const handleStartCall = async () => {
    if (!activeChatId || !user || !otherUser) return;
    
    try {
      await addDoc(collection(db, 'calls'), {
        channelName: activeChatId,
        callerId: user.uid,
        receiverId: otherUser.uid,
        status: 'ringing',
        createdAt: serverTimestamp(),
        participants: [user.uid, otherUser.uid],
      });
      router.push(`/call/${activeChatId}`);
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const handleAcceptCall = async (channelName: string) => {
    if (!incomingCall) return;
    const callRef = doc(db, 'calls', incomingCall.id);
    await updateDoc(callRef, { status: 'answered' });
    setIncomingCall(null);
    router.push(`/call/${channelName}`);
  };

  const handleDeclineCall = async (callId: string) => {
    const callRef = doc(db, 'calls', callId);
    await deleteDoc(callRef);
    setIncomingCall(null);
  };
  
  const activeChat = chats.find((c) => c.id === activeChatId);
  const otherUser = activeChat?.participantProfiles?.[0];

  return (
    <>
      <div className="flex h-screen flex-col bg-muted/40">
        <AppHeader title="Chats" backLink={user?.role === 'student' ? '/student' : '/teacher'} />
        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 overflow-hidden">
          {/* Chat List */}
          <aside className="col-span-1 flex flex-col border-r bg-background">
            <div className="p-4 border-b">
                <Button className="w-full" onClick={() => setIsNewChatDialogOpen(true)}>
                    <MessageSquarePlus className="mr-2"/>
                    New Chat
                </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center flex-grow">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <nav className="flex-grow overflow-y-auto">
                {chats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No conversations yet.</div>
                ) : (
                  chats.map((chat) => {
                    const other = chat.participantProfiles?.[0];
                    return (
                      <button
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className={cn(
                          'flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted',
                          activeChatId === chat.id && 'bg-muted'
                        )}
                      >
                        <Avatar>
                          <AvatarImage src="" alt={other?.email} />
                          <AvatarFallback>{getInitials(other?.email)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-semibold truncate">{other?.email}</p>
                          <p className="text-sm text-muted-foreground truncate">{chat.lastMessage?.text}</p>
                        </div>
                        {chat.lastMessage?.timestamp && (
                          <time className="text-xs text-muted-foreground">
                            {formatDistanceToNow(chat.lastMessage.timestamp.toDate(), { addSuffix: true })}
                          </time>
                        )}
                      </button>
                    );
                  })
                )}
              </nav>
            )}
          </aside>

          {/* Message View */}
          <main className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col">
            {activeChatId && activeChat ? (
              <>
                <header className="flex items-center justify-between gap-4 border-b bg-background p-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarImage src="" alt={otherUser?.email} />
                        <AvatarFallback>{getInitials(otherUser?.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{otherUser?.email}</p>
                        <p className="text-sm text-muted-foreground capitalize">{otherUser?.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleStartCall}
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn('flex gap-2', msg.senderId === user?.uid ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-xs rounded-lg px-4 py-2 break-words',
                          msg.senderId === user?.uid
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background'
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <footer className="border-t bg-background p-4">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      autoComplete="off"
                      disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
                      {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                  </form>
                </footer>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                Select a conversation or start a new one.
              </div>
            )}
          </main>
        </div>

        <NewChatDialog 
          isOpen={isNewChatDialogOpen}
          onClose={() => setIsNewChatDialogOpen(false)}
          currentUser={user}
          onStartChat={handleCreateNewChat}
        />
      </div>
      <IncomingCallDialog 
        call={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </>
  );
}

export default withAuth(ChatPage, ['teacher', 'student']);