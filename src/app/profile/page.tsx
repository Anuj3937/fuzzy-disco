'use client';

import { T } from '@/components/T'; // Added Import
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import AppHeader from '@/components/AppHeader';
import withAuth from '@/components/auth/withAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Download, Loader2, Edit3, BookOpen, Pencil, Lightbulb, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Firestore
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isEditingClass, setIsEditingClass] = useState(false);
  const [studentClass, setStudentClass] = useState('9th');
  const [newClass, setNewClass] = useState(studentClass);
  const classes = ['7th', '8th', '9th'];

  const [isSavingClass, setIsSavingClass] = useState(false);
  const [isClassLoading, setIsClassLoading] = useState(true);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/profile');
    }
  }, [loading, user, router]);

  useEffect(() => {
    const loadClass = async () => {
      if (!user?.uid) return;
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        const cls = snap.exists() ? (snap.data() as any)?.className : null;
        const current = cls || studentClass;
        setStudentClass(current);
        setNewClass(current);
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Could not load class',
          description: err?.message || 'Please try again.',
        });
      } finally {
        setIsClassLoading(false);
      }
    };

    if (!loading && user) {
      loadClass();
    }
  }, [loading, user, toast, studentClass]); // Added studentClass default dependency

  useEffect(() => {
    const standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      // @ts-ignore (iOS Safari)
      (typeof navigator !== 'undefined' && (navigator as any).standalone === true);
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      toast({ title: 'Installed', description: 'Shiksha Setu was installed successfully.' });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome !== 'accepted') {
        toast({ title: 'Install dismissed', description: 'You can install the app later from this page.' });
      }
      setInstallPrompt(null);
      return;
    }

    if (isStandalone) {
      toast({ title: 'Already installed', description: 'You are already using the installed app.' });
    } else {
      toast({
        title: 'Install not available yet',
        description:
          'Make sure you opened this site over HTTPS with a valid manifest and service worker. Try visiting this page in Chrome on Android or desktop.',
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password is too short',
        description: 'Password should be at least 6 characters long.',
      });
      return;
    }

    setIsLoading(true);
    if (auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, newPassword);
        toast({ title: 'Success', description: 'Your password has been updated.' });
        setNewPassword('');
        setConfirmPassword('');
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error updating password',
          description: error?.message || 'Please try again after re-authenticating.',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in again.' });
    }
  };

  const handleClassUpdate = async () => {
    if (!user?.uid) {
      toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in again.' });
      return;
    }

    const prev = studentClass;
    setStudentClass(newClass);
    setIsSavingClass(true);

    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(
        ref,
        {
          className: newClass,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setIsEditingClass(false);
      toast({ title: 'Class updated', description: `Your class is now ${newClass}` });
    } catch (err: any) {
      setStudentClass(prev);
      toast({
        variant: 'destructive',
        title: 'Error updating class',
        description: err?.message || 'Please try again.',
      });
    } finally {
      setIsSavingClass(false);
    }
  };

  if (loading) return null;
  if (!user) return null; // Already handled by useEffect redirect, but good practice

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="relative z-10 flex flex-col min-h-screen">
        <AppHeader title="Your Profile" /> {/* Title likely handled by AppHeader, or wrap here if static */}

        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
          {/* Back button */}
          <div className="mb-4">
            <Button variant="outline" onClick={() => router.push('/home')}>
              <T>← Back</T>
            </Button>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">

            {/* Account Info Card */}
            <Card className="bg-gradient-to-r from-pink-200 via-yellow-200 to-green-200 relative overflow-hidden">
              <BookOpen className="absolute top-2 left-2 w-6 h-6 text-pink-300 opacity-50" />
              <Pencil className="absolute bottom-2 right-2 w-6 h-6 text-yellow-300 opacity-50" />
              <CardHeader>
                <CardTitle><T>Account Information</T></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label><T>Email</T></Label>
                  <p className="text-lg font-semibold">{user.email}</p>
                </div>
                <div>
                  <Label><T>Role</T></Label>
                  <p className="text-lg font-semibold capitalize">{user.role}</p>
                </div>
              </CardContent>
            </Card>

            {/* Change Class Card */}
            <Card className="bg-gradient-to-r from-green-200 via-teal-200 to-blue-200 relative overflow-hidden">
              <Lightbulb className="absolute top-2 right-2 w-6 h-6 text-yellow-400 opacity-50" />
              <CardHeader>
                <CardTitle><T>Change Class</T></CardTitle>
                <CardDescription><T>Update your current class from the dropdown below.</T></CardDescription>
              </CardHeader>
              <CardContent>
                {isClassLoading ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-600">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> <T>Loading your class...</T>
                  </div>
                ) : isEditingClass ? (
                  <div className="space-y-3">
                    <select
                      value={newClass}
                      onChange={(e) => setNewClass(e.target.value)}
                      className="border p-2 rounded w-full"
                      disabled={isSavingClass}
                    >
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option> // Class names are usually standard
                      ))}
                    </select>
                    <div className="flex justify-center gap-3">
                      <Button onClick={handleClassUpdate} className="bg-blue-600 hover:bg-blue-700" disabled={isSavingClass}>
                        {isSavingClass && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <T>Save</T>
                      </Button>
                      <Button onClick={() => setIsEditingClass(false)} variant="outline" disabled={isSavingClass}>
                        <T>Cancel</T>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      onClick={() => setIsEditingClass(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" /> <T>Change Class</T>
                    </Button>
                    <p className="text-gray-600">
                      <T>Current Class:</T> <span className="font-medium">{studentClass}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Install App Card */}
            <Card className="bg-gradient-to-r from-purple-200 via-pink-200 to-orange-200 relative overflow-hidden">
              <Download className="absolute top-2 left-2 w-6 h-6 text-purple-300 opacity-50" />
              <CardHeader>
                <CardTitle><T>Download App</T></CardTitle>
                <CardDescription>
                  <T>Install Shiksha Setu on your device for a better experience, including offline access.</T>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleInstallClick}>
                  <Download className="mr-2 h-4 w-4" /> <T>Install App</T>
                </Button>
                {isStandalone && (
                  <p className="text-xs text-gray-600 mt-2">
                    <T>App already installed — you can launch it from your home screen or apps list.</T>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="bg-gradient-to-r from-yellow-200 via-pink-200 to-red-200 relative overflow-hidden">
              <Pencil className="absolute top-2 right-2 w-6 h-6 text-pink-300 opacity-50" />
              <CardHeader>
                <CardTitle><T>Change Password</T></CardTitle>
                <CardDescription>
                  <T>Enter a new password below to change your current password.</T>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password"><T>New Password</T></Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password" // Placeholder
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password"><T>Confirm New Password</T></Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password" // Placeholder
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <T>Change Password</T>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Logout Card */}
            <Card className="bg-gradient-to-r from-red-200 via-pink-200 to-orange-200 relative overflow-hidden">
              <LogOut className="absolute top-2 right-2 w-6 h-6 text-red-400 opacity-50" />
              <CardHeader>
                <CardTitle><T>Log Out</T></CardTitle>
                <CardDescription><T>Sign out of your account securely.</T></CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button
                  onClick={async () => {
                    try {
                      await auth.signOut();
                      toast({ title: 'Logged Out', description: 'You’ve been logged out successfully.' });
                      router.push('/login');
                    } catch (error: any) {
                      toast({
                        variant: 'destructive',
                        title: 'Error logging out',
                        description: error?.message || 'Please try again.',
                      });
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                >
                  <LogOut className="mr-2 h-4 w-4" /> <T>Log Out</T>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

// Ensure withAuth HOC is applied if needed, assuming profile is protected
export default withAuth(ProfilePage); // Changed to use withAuth HOC