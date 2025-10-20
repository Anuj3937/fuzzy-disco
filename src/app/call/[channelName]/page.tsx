// src/app/call/[channelName]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AgoraUIKit from 'agora-react-uikit';
import { useAuth } from '@/components/auth/AuthProvider';
import { Loader2 } from 'lucide-react';

export default function CallPage() {
  const [videoCall, setVideoCall] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const { channelName } = useParams();
  const { user } = useAuth();

  useEffect(() => {
    const fetchToken = async () => {
      if (user && channelName) {
        try {
          const response = await fetch('/api/agora-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channelName: Array.isArray(channelName) ? channelName[0] : channelName,
              uid: user.uid,
            }),
          });
          const data = await response.json();
          if (data.token) {
            setToken(data.token);
          } else {
            // Handle error
            router.push('/chat');
          }
        } catch (error) {
          console.error('Failed to fetch token', error);
          router.push('/chat');
        }
      }
    };

    fetchToken();
  }, [channelName, user, router]);

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4">Joining call...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {videoCall ? (
        <AgoraUIKit
          rtcProps={{
            appId: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            channel: Array.isArray(channelName) ? channelName[0] : channelName,
            token: token,
            uid: user?.uid,
          }}
          callbacks={{
            EndCall: () => {
              setVideoCall(false);
              router.push('/chat');
            },
          }}
        />
      ) : (
        router.push('/chat')
      )}
    </div>
  );
}