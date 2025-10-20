'use client';

import { T } from '@/components/T'; // Added Import
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AskLanding() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden text-gray-800">
      {/* Pastel backdrop & Doodles remain the same */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F0EBFF] via-[#FFEAF2] to-[#E7F7F3]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#DDD4FF] blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-[26rem] w-[26rem] rounded-full bg-[#FFDCC7] blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-1/3 right-8 h-40 w-40 rounded-full bg-[#CFF3E8] blur-3xl opacity-60" />
      <svg className="pointer-events-none absolute top-6 left-6 w-28 h-28 opacity-80" viewBox="0 0 160 160" fill="none">
        <rect x="28" y="28" width="72" height="12" rx="6" fill="#E1D4FF" />
        <path d="M100 28 L128 18 L121 46 Z" fill="#FFD3E2" />
        <rect x="28" y="50" width="94" height="8" rx="4" fill="#DFF0FF" />
      </svg>
      <svg className="pointer-events-none absolute top-24 right-8 w-28 h-28 opacity-80" viewBox="0 0 120 120" fill="none">
        <rect x="18" y="54" width="84" height="30" rx="6" fill="#E7F0FF" />
        <rect x="28" y="32" width="64" height="24" rx="6" fill="#CFEFE9" />
        <rect x="22" y="86" width="76" height="6" rx="3" fill="#FFD9E6" />
      </svg>
      <svg className="pointer-events-none absolute bottom-6 left-10 w-24 h-24 opacity-80" viewBox="0 0 120 120" fill="none">
        <rect x="26" y="22" width="68" height="80" rx="8" fill="#FFF0F6" />
        <rect x="36" y="36" width="48" height="6" rx="3" fill="#E1D4FF" />
        <rect x="36" y="50" width="40" height="6" rx="3" fill="#DFF0FF" />
        <rect x="36" y="64" width="44" height="6" rx="3" fill="#E0F4F1" />
      </svg>

      {/* Header + Back */}
      <header className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-6">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => router.push('/student')}
            className="border-[#D5CEFF] bg-white/80 text-[#4C409F] backdrop-blur inline-flex items-center gap-2"
            aria-label="Back to Student"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" className="-ml-0.5">
              <path d="M15 18l-6-6 6-6" fill="none" stroke="#6F5AE8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <T>Back</T>
          </Button>
        </div>

        <h1 className="text-center text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#6F5AE8] via-[#9B87F5] to-[#59BBD0]">
          <T>Ask a Question</T>
        </h1>
        <p className="mt-3 text-center text-[#4C409F]/90">
          <T>Choose how you want to get help—AI or a real teacher.</T>
        </p>
      </header>

      {/* Cards */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-16">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="overflow-hidden border-white/70 bg-white/90 backdrop-blur shadow-2xl">
            <CardHeader>
              <CardTitle className="text-[#3F338C]"><T>Ask AI</T></CardTitle>
              <CardDescription><T>Instant answers in your chosen language, based on your chapter.</T></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#EFE9FF] px-3 py-1 text-xs font-semibold text-[#5A4DA8]">
                  <T>Fast & Friendly</T>
                </span>
                <Button
                  className="bg-gradient-to-r from-[#6F5AE8] via-[#7EC8E3] to-[#F7AFC1] text-white hover:brightness-110"
                  onClick={() => router.push('/student/ask_question/ai')}
                >
                  <T>Go to Ask AI</T>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/70 bg-white/90 backdrop-blur shadow-2xl">
            <CardHeader>
              <CardTitle className="text-[#3F338C]"><T>Ask Teacher</T></CardTitle>
              <CardDescription><T>Submit your doubt to a teacher for a detailed explanation.</T></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#E7F7F2] px-3 py-1 text-xs font-semibold text-[#2C6E63]">
                  <T>Human Guidance</T>
                </span>
                <Button
                  className="bg-gradient-to-r from-[#6F5AE8] via-[#7EC8E3] to-[#F7AFC1] text-white hover:brightness-110"
                  onClick={() => router.push('/student/ask_question/teacher')}
                >
                  <T>Go to Ask Teacher</T>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}