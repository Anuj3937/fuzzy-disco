// src/app/call/[channelName]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
// Removed direct import of AgoraUIKit
// import AgoraUIKit from 'agora-react-uikit';
import { useAuth } from '@/components/auth/AuthProvider';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic'; // Import dynamic

// Dynamically import AgoraUIKit, disabling SSR
const AgoraUIKit = dynamic(
  () => import('agora-react-uikit'),
  { ssr: false }
);

export default function CallPage() {
  const [videoCall, setVideoCall] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true); // Added loading state
  const router = useRouter();
  const { channelName: routeChannelName } = useParams(); // Get raw param
  const { user } = useAuth();

  // Ensure channelName is a string
  const channelName = Array.isArray(routeChannelName) ? routeChannelName[0] : routeChannelName;

  useEffect(() => {
    const fetchToken = async () => {
      // Ensure user and channelName are available before fetching
      if (user && channelName) {
        setIsLoadingToken(true); // Start loading
        try {
          const response = await fetch('/api/agora-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channelName: channelName, // Use the string version
              uid: user.uid,
            }),
          });
          const data = await response.json();
          if (response.ok && data.token) {
            setToken(data.token);
          } else {
            console.error('Failed to fetch token:', data.error || 'Unknown error');
            // Handle error - maybe show a message before redirecting
            alert('Could not join call. Please try again.');
            router.push('/chat');
          }
        } catch (error) {
          console.error('Error fetching token:', error);
          alert('Could not join call. Please try again.');
          router.push('/chat');
        } finally {
            setIsLoadingToken(false); // Stop loading
        }
      } else if (!user) {
          // Handle case where user is not loaded yet or logged out
          console.log("User not available yet for token fetch.");
          // Optionally redirect if user is definitely null after auth check
      } else if (!channelName) {
           console.error("Channel name is missing.");
           alert('Invalid call link.');
           router.push('/chat');
      }
    };

    fetchToken();
  }, [channelName, user, router]); // Dependencies are correct

  // Combined Loading State
  if (isLoadingToken || !token) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg font-medium text-gray-700">Joining call...</p>
      </div>
    );
  }

  // Ensure user is available before rendering AgoraUIKit which might need uid
  if (!user) {
      return (
         <div className="flex h-screen items-center justify-center bg-gray-100">
             <Loader2 className="h-16 w-16 animate-spin text-primary" />
             <p className="ml-4 text-lg font-medium text-gray-700">Authenticating...</p>
         </div>
      );
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {videoCall ? (
        <AgoraUIKit
          rtcProps={{
            appId: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            channel: channelName, // Use the string version
            token: token,
            uid: user.uid, // Use the authenticated user's UID
          }}
          callbacks={{
            EndCall: () => {
              setVideoCall(false); // Set state to trigger redirect
              // Redirect happens in the effect below
            },
          }}
          styleProps={{
             // Optional: Add custom styles if needed
             UIKitContainer: { height: '100%', width: '100%' },
          }}
        />
      ) : null} {/* Render null immediately when videoCall is false */}
    </div>
  );
}

// Effect to handle redirect after EndCall callback sets videoCall to false
function useEndCallRedirect(videoCall: boolean, router: any) {
    useEffect(() => {
        if (!videoCall) {
            // Slight delay might be needed for cleanup, but usually direct push is fine
            router.push('/chat');
        }
    }, [videoCall, router]);
}

// Modified default export to use the new hook
export default function CallPageWrapper() {
    // Need to wrap the main component to use the hook conditionally based on state
    const [videoCall, setVideoCall] = useState(true);
    const router = useRouter();

    // Use the custom hook for redirection logic
    useEndCallRedirect(videoCall, router);

    // Render the main CallPage component, passing down state handlers if needed,
    // but in this case, AgoraUIKit's EndCall callback handles setting videoCall state.
    // Ensure CallPage itself doesn't cause the window error, dynamic import handles AgoraUIKit.
    // CallPage needs access to state/setters if EndCall logic is inside it. Let's adjust.

    // Re-integrate state management into the main component that renders AgoraUIKit
    return <CallPageInternal videoCall={videoCall} setVideoCall={setVideoCall} />;
}


// Renamed original component to avoid conflict and accept props
function CallPageInternal({ videoCall, setVideoCall }: { videoCall: boolean; setVideoCall: (value: boolean) => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const router = useRouter();
  const { channelName: routeChannelName } = useParams();
  const { user } = useAuth();

  const channelName = Array.isArray(routeChannelName) ? routeChannelName[0] : routeChannelName;

  // fetchToken useEffect remains the same as above...
    useEffect(() => {
    const fetchToken = async () => {
      if (user && channelName) {
        setIsLoadingToken(true);
        try {
          const response = await fetch('/api/agora-token', {
            method: 'POST', headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ channelName: channelName, uid: user.uid, }),
          });
          const data = await response.json();
          if (response.ok && data.token) { setToken(data.token); }
          else {
            console.error('Failed to fetch token:', data.error || 'Unknown error');
            alert('Could not join call. Please try again.'); router.push('/chat');
          }
        } catch (error) {
          console.error('Error fetching token:', error);
          alert('Could not join call. Please try again.'); router.push('/chat');
        } finally { setIsLoadingToken(false); }
      } else if (!user) { console.log("User not available yet for token fetch."); }
      else if (!channelName) { console.error("Channel name is missing."); alert('Invalid call link.'); router.push('/chat');}
    };
    fetchToken();
  }, [channelName, user, router]);


  // Combined Loading State remains the same...
    if (isLoadingToken || !token) {
        return ( /* Loading UI */
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="ml-4 text-lg font-medium text-gray-700">Joining call...</p>
            </div>
        );
    }
    if (!user) {
       return ( /* Authenticating UI */
             <div className="flex h-screen items-center justify-center bg-gray-100">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
                 <p className="ml-4 text-lg font-medium text-gray-700">Authenticating...</p>
             </div>
        );
    }

  // Main render logic using AgoraUIKit
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {videoCall && token && user ? ( // Ensure all required props are ready
        <AgoraUIKit
          rtcProps={{
            appId: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            channel: channelName,
            token: token,
            uid: user.uid, // Agora recommends number UID if possible, but string works
          }}
          callbacks={{
            EndCall: () => {
              console.log("EndCall callback triggered"); // Debug log
              setVideoCall(false); // Update state via prop
              router.push('/chat'); // Redirect immediately on end call
            },
          }}
           styleProps={{
             UIKitContainer: { height: '100%', width: '100%' },
          }}
        />
      ) : (
         // If videoCall becomes false, this part won't render, and the redirect effect handles it.
         // Or show a "Call ended" message briefly if preferred before redirect.
         <div className="flex h-screen items-center justify-center bg-gray-100">
            <p className="text-lg font-medium text-gray-700">Call ended. Redirecting...</p>
         </div>
      )}
    </div>
  );
}