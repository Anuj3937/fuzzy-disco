'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

type AppUser = {
  uid: string;
  email: string | null;
  role: 'student' | 'teacher' | 'parent';
  name?: string | null;

  // ✅ Additional fields
  className?: string | null;
  subject?: string | null;
  language?: string | null;
  childUid?: string | null;
  studentIds?: string[];
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Step 1: Watch for Firebase auth changes
    const unsubAuth = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Step 2: Attach real-time Firestore listener for this user’s doc
      const ref = doc(db, 'users', fbUser.uid);
      const unsubUser = onSnapshot(
        ref,
        (snap) => {
          const data = snap.data() as any | undefined;
          const role = (data?.role?.toLowerCase?.() as AppUser['role']) || 'student';

          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            role,
            name: (data?.name ?? data?.fullName ?? fbUser.displayName ?? null) as string | null,
            className: (data?.className ?? data?.class ?? null) as string | null,
            subject: (data?.subject ?? null) as string | null,
            language: (data?.language ?? null) as string | null,
            childUid: (data?.childUid ?? null) as string | null,
            studentIds: Array.isArray(data?.studentIds) ? data.studentIds : [],
          });

          setLoading(false);
        },
        (error) => {
          console.error('Error loading user data:', error);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            role: 'student',
            name: fbUser.displayName ?? null,
            className: null,
            subject: null,
            language: null,
            childUid: null,
            studentIds: [],
          });
          setLoading(false);
        }
      );

      // Clean up Firestore listener when user logs out
      return () => unsubUser();
    });

    // Clean up auth listener
    return () => unsubAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
