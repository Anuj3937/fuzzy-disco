// src/app/call/[channelName]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
// Removed direct import of AgoraUIKit
import { useAuth } from '@/components/auth/AuthProvider';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic'; // Import dynamic

// Dynamically import AgoraUIKit, disabling SSR
const AgoraUIKit = dynamic(
  () => import('agora-react-uikit'),
  {
    ssr: false,
    // Optional: Add a loading component specifically for AgoraUIKit
    loading: () => (
        <div className="flex h-full w-full items-center justify-center bg-gray-200">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-gray-600">Loading Video Interface...</p>
        </div>
    )
  }
);

export default function CallPage() {
  const [videoCall, setVideoCall] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const router = useRouter();
  const { channelName: routeChannelName } = useParams();
  const { user, loading: authLoading } = useAuth(); // Get auth loading state

  // Ensure channelName is a string
  const channelName = Array.isArray(routeChannelName) ? routeChannelName[0] : routeChannelName;

  useEffect(() => {
    // Don't fetch token if auth is still loading
    if (authLoading) return;

    const fetchToken = async () => {
      // Ensure user and channelName are available before fetching
      if (user && channelName) {
        setIsLoadingToken(true);
        try {
          const response = await fetch('/api/agora-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelName: channelName, uid: user.uid }),
          });
          const data = await response.json();
          if (response.ok && data.token) {
            setToken(data.token);
          } else {
            console.error('Failed to fetch token:', data.error || `Status: ${response.status}`);
            alert(`Could not get call token. ${data.error || 'Please try again.'}`);
            router.push('/chat');
          }
        } catch (error) {
          console.error('Error fetching token:', error);
          alert('Could not join call due to a network error. Please try again.');
          router.push('/chat');
        } finally {
          setIsLoadingToken(false);
        }
      } else if (!user) {
        // Auth finished loading, but user is null (logged out?)
        console.error("User not authenticated for call.");
        alert('You must be logged in to join a call.');
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname)); // Redirect to login
      } else if (!channelName) {
        console.error("Channel name is missing from route.");
        alert('Invalid call link.');
        router.push('/chat');
      }
    };

    fetchToken();
  }, [channelName, user, authLoading, router]); // Added authLoading dependency

  // Effect to handle redirection when videoCall becomes false
  useEffect(() => {
    if (!videoCall) {
      console.log("videoCall is false, redirecting to /chat");
      router.push('/chat');
    }
  }, [videoCall, router]);

  // Combined Loading States
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg font-medium text-gray-700">Authenticating...</p>
      </div>
    );
  }

  if (isLoadingToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg font-medium text-gray-700">Joining call...</p>
      </div>
    );
  }

  // If loading is finished but conditions aren't met (e.g., no token, no user)
  // Render minimal UI or handle potential redirect edge cases if needed.
  // However, the useEffects should handle redirects in most failure cases.
   if (!token || !user) {
       // This state might briefly occur if redirects haven't happened yet.
       return (
          <div className="flex h-screen items-center justify-center bg-gray-100">
             <Loader2 className="h-16 w-16 animate-spin text-primary" />
             <p className="ml-4 text-lg font-medium text-gray-700">Preparing call...</p>
          </div>
       );
   }


  // Main render logic using AgoraUIKit
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* Conditionally render AgoraUIKit only when videoCall is true and required props are ready */}
      {videoCall && token && user && channelName ? (
        <AgoraUIKit
          rtcProps={{
            appId: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            channel: channelName,
            token: token,
            uid: user.uid, // Agora recommends number UID if possible, but string works too
            role: 'publisher', // Explicitly set role if needed, default is often publisher
          }}
          callbacks={{
            EndCall: () => {
              console.log("EndCall callback triggered"); // Debug log
              setVideoCall(false); // Set state to trigger redirect effect
            },
            // Add other callbacks as needed, e.g., UserJoined, UserLeft
          }}
           styleProps={{
             UIKitContainer: { height: '100%', width: '100%' },
             // Customize other elements if desired
          }}
        />
      ) : (
        // This part is shown briefly if videoCall becomes false before redirect effect runs
        <div className="flex h-screen items-center justify-center bg-gray-100">
           <p className="text-lg font-medium text-gray-700">Call ended. Redirecting...</p>
        </div>
      )}
    </div>
  );
}