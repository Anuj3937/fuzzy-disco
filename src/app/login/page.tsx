"use client";

import { T } from '@/components/T';
import React, { useState, Suspense } from "react"; // Import Suspense
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

/* ---- Inner Client Component to access searchParams ---- */
function LoginContent() {
  const router = useRouter();
  const params = useSearchParams(); // Safe to use here now
  const redirect = params.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  // handleLogin function remains the same
   const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      const snap = await getDoc(doc(db, "users", uid));

      if (!snap.exists()) {
          // Handle case where user exists in Auth but not Firestore (e.g., incomplete registration)
          alert("Login failed: User profile not found. Please contact support or try registering again.");
          await auth.signOut(); // Log them out from Auth as well
          setLoading(false);
          return;
      }

      // Ensure role type safety
      const role = (snap.data()?.role as "student" | "teacher" | "parent" | undefined) || "student";

      if (redirect) {
        router.replace(redirect);
        return;
      }

      // Updated role check to be case-insensitive just in case
      const lowerCaseRole = role.toLowerCase();
      if (lowerCaseRole === "parent") router.replace("/parent");
      else if (lowerCaseRole === "teacher") router.replace("/teacher");
      else router.replace("/student"); // Default or student goes to student dashboard

    } catch (err: any) {
      console.error("Login Error:", err.code, err.message); // Log error details
      // Specific error handling remains the same, added invalid-credential
      if (err.code === "auth/user-not-found" || err.code === 'auth/invalid-credential') {
        alert("Email ID not found or password incorrect. Please check or sign up first.");
      } else if (err.code === "auth/wrong-password") { // Keep for older Firebase versions
        alert("Password is incorrect. Please enter the correct password.");
      } else if (err.code === "auth/invalid-email") {
        alert("Invalid email address format.");
      } else {
        alert("Login failed: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };


  // handleForgotPassword function remains the same
  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Please check your inbox (and spam folder)."); // Added spam folder note
    } catch (err: any) {
      console.error("Password Reset Error:", err.code, err.message); // Log error details
      if (err.code === "auth/user-not-found" || err.code === 'auth/invalid-credential') { // Added invalid-credential
        alert("Email not found. Please check the address or register first.");
      } else if (err.code === "auth/invalid-email") {
         alert("Invalid email address format.");
      } else {
        alert("Failed to send reset email: " + err.message);
      }
    } finally {
      setResetting(false);
    }
  };


  // Return statement with JSX remains the same (ensure T component wraps text)
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-100 via-indigo-100 to-pink-100 p-4"> {/* Added padding */}
      {/* Soft doodle background shapes */}
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 600 600"
          className="absolute -top-20 -left-20 w-96 h-96 text-purple-300"
          fill="currentColor"
        >
          <path d="M300,521.05c90.66,0,170.14-61.38,197.38-147.45,27.9-88.74-2.2-193.62-87.61-245.45C330.47,83,255,80.23,190.89,121.73,126.74,163.25,93,238.08,104.21,309.37c11.32,73.21,51.52,141.86,115.15,180.59C255.41,508.9,277.59,521.05,300,521.05Z" />
        </svg>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 600 600"
          className="absolute bottom-0 right-0 w-[28rem] h-[28rem] text-indigo-200"
          fill="currentColor"
        >
          <path d="M300,521.05c90.66,0,170.14-61.38,197.38-147.45,27.9-88.74-2.2-193.62-87.61-245.45C330.47,83,255,80.23,190.89,121.73,126.74,163.25,93,238.08,104.21,309.37c11.32,73.21,51.52,141.86,115.15,180.59C255.41,508.9,277.59,521.05,300,521.05Z" />
        </svg>
      </div>

      {/* Main login card */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-2xl w-full max-w-md transition-transform transform hover:scale-[1.01]"> {/* Adjusted max-width and hover */}
        <h1 className="whitespace-nowrap text-3xl sm:text-4xl font-bold text-center text-purple-700 mb-2">
          <T>Login to Shiksha Setu</T>
        </h1>
        <p className="text-center text-gray-500 mb-8">
          <T>Welcome back! Please log in to continue your learning journey</T> 🎒
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="Email Address" // Placeholder translation might be inconsistent across browsers
            autoComplete="email" // Use standard autocomplete
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/90" // Slightly more opaque input
          />
          <input
            type="password"
            placeholder="Password" // Placeholder translation might be inconsistent across browsers
            autoComplete="current-password" // Use standard autocomplete
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/90" // Slightly more opaque input
          />

          {/* Forgot password link */}
          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting || loading} // Disable if logging in too
              className="text-sm text-purple-700 hover:underline disabled:opacity-60 disabled:cursor-not-allowed" // Added disabled cursor
            >
              {resetting ? <T>Sending reset link...</T> : <T>Forgot Password?</T>}
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-md font-semibold shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" // Added disabled cursor
            disabled={loading || resetting} // Disable if resetting too
          >
            {loading ? (
              <span className="flex justify-center items-center gap-2">
                <Loader2 className="animate-spin w-5 h-5" />
                <T>Logging in...</T>
              </span>
            ) : (
              <T>Login</T>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-700">
          <T>Don’t have an account?</T>{" "}
          <a
            href="/registration"
            className="text-purple-700 font-semibold underline hover:text-purple-800"
          >
            <T>Sign up</T>
          </a>
        </p>
      </div>
    </div>
  );
}

/* ---- Main Page Export with Suspense ---- */
export default function LoginPage() {
  // We wrap the component that uses useSearchParams in Suspense
  return (
    <Suspense fallback={<LoadingLogin />}>
      <LoginContent />
    </Suspense>
  );
}

// Simple loading component for the Suspense fallback
function LoadingLogin() {
   return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-100 via-indigo-100 to-pink-100">
         <Loader2 className="h-12 w-12 animate-spin text-purple-700" />
         {/* Optional: Add text */}
         {/* <p className="ml-4 text-lg font-medium text-purple-700"><T>Loading Login...</T></p> */}
    </div>
  );
}