'use client';

import { T } from '@/components/T'; // Added Import
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import withAuth from '@/components/auth/withAuth';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  PenTool,
  Video,
  Send,
  Users,
} from 'lucide-react';

function CommunityHome() {
  const { user } = useAuth();
  const router = useRouter();

  const tabs = [
    {
      title: <T>Join a Workshop</T>,
      desc: <T>Attend live sessions and learn from experienced teachers.</T>,
      icon: GraduationCap,
      color: 'from-[#CFE7FF] to-[#E5F0FF]',
      link: '/student/community/workshop',
    },
    {
      title: <T>Take a Test</T>,
      desc: <T>Participate in teacher-led assessments and track your progress.</T>,
      icon: PenTool,
      color: 'from-[#D9F4EC] to-[#E9FFF8]',
      link: '/student/community/take_test',
    },
    {
      title: <T>View Videos</T>,
      desc: <T>Watch engaging lessons and visual explanations.</T>,
      icon: Video,
      color: 'from-[#FFE3ED] to-[#FFF1F6]',
      link: '/student/community/videos',
    },
    {
      title: <T>Share Something</T>,
      desc: <T>Post your ideas, projects, or thoughts with others.</T>,
      icon: Send,
      color: 'from-[#FDE7C9] to-[#FFF3E2]',
      link: '/student/community/share',
    },
    {
      title: <T>See What Others Shared</T>,
      desc: <T>Explore posts shared by students and teachers.</T>,
      icon: Users,
      color: 'from-[#E5DBFF] to-[#F0E9FF]',
      link: '/student/community/feed',
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#ECE7FF] via-[#F6F3FF] to-[#E3F1FF] text-gray-800 overflow-hidden">
      {/* Doodles & Blobs remain the same */}
      <svg className="pointer-events-none absolute -top-16 -left-10 w-72 h-72 opacity-70" viewBox="0 0 200 200" fill="none">
        <path d="M30 100 q40 -20 70 0 q-30 -20 -70 0" stroke="#B9C8FF" strokeWidth="4" fill="none" />
        <path d="M100 100 q40 -20 70 0 q-30 -20 -70 0" stroke="#C9B8FF" strokeWidth="4" fill="none" />
        <rect x="120" y="20" width="50" height="14" rx="3" fill="#E7DFFF" />
        <path d="M125 24 h40" stroke="#CFC2FF" strokeWidth="2" />
        <path d="M130 24 v10 M140 24 v10 M150 24 v10 M160 24 v10" stroke="#CFC2FF" strokeWidth="2" />
      </svg>
      <svg className="pointer-events-none absolute bottom-0 right-0 w-[24rem] h-[24rem] opacity-70" viewBox="0 0 300 300" fill="none">
        <path d="M40 80 q60 30 140 -20 q40 -20 90 0" stroke="#B6E3D2" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="210" y="220" width="26" height="8" rx="3" fill="#FFDAD5" />
        <path d="M210 220 l-10 10 l36 0 l-10 -10 z" fill="#FFC7BE" />
        <circle cx="220" cy="200" r="10" fill="#FBE2A8" />
      </svg>
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 bg-[#F1EBFF] rounded-full blur-3xl opacity-60 animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[#DFF3FF] rounded-full blur-3xl opacity-60 animate-pulse delay-700" />

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-gradient-to-r from-white/60 via-white/50 to-white/60 border-b border-white/40 shadow-md">
        <div className="relative max-w-6xl mx-auto px-6 py-5">
          <Button
            className="absolute left-6 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110"
            onClick={() => router.push(user?.role === 'student' ? '/student' : '/teacher')}
          >
            <T>Back</T>
          </Button>
          <h1 className="text-center text-4xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#6B5BBE] via-[#7C6BF2] to-[#A1B5FF] drop-shadow-sm">
            <T>Community Hub</T>
          </h1>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Intro block */}
        <div className="relative mb-12 text-center">
          <h2 className="text-2xl font-semibold text-[#5A4DA8]">
            <T>Connect • Collaborate • Create</T>
          </h2>
          <p className="text-[#5A4DA8]/80 text-base mt-1 max-w-2xl mx-auto">
            <T>Pick what you want to do today—join a workshop, take a test, watch videos, or share with the community.</T>
          </p>
          {/* Tiny doodle accent */}
          <svg className="absolute -top-6 right-1/3 w-16 h-16 opacity-70" viewBox="0 0 120 120" fill="none">
            <path d="M20 80 L60 50 L100 80" stroke="#A6C7FF" strokeWidth="5" strokeLinecap="round" />
            <circle cx="60" cy="40" r="7" fill="#FFD7E5" />
          </svg>
        </div>

        {/* Tabs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            return (
              <div
                key={idx}
                onClick={() => router.push(tab.link)}
                className={`cursor-pointer relative overflow-hidden rounded-3xl bg-gradient-to-br ${tab.color} p-8 shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1.5 hover:scale-[1.02] backdrop-blur-md`}
              >
                {/* Per-card doodle */}
                <svg className="pointer-events-none absolute -top-5 -right-5 w-24 h-24 opacity-40" viewBox="0 0 100 100" fill="none">
                  <path d="M10 50 Q 25 30, 40 50 T 70 50" stroke="#C9B8FF" strokeWidth="3" fill="none" />
                  <circle cx="80" cy="22" r="6" fill="#BFE7D8" />
                </svg>

                <Icon className="h-12 w-12 text-[#4E3FA3] mb-4" />
                <h2 className="text-2xl font-semibold text-[#3E2F9A] mb-2">
                  {tab.title} {/* Already wrapped in array */}
                </h2>
                <p className="text-[#4E3FA3]/80 text-sm">{tab.desc}</p> {/* Already wrapped in array */}

                <Button className="mt-6 bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110">
                  <T>Explore</T>
                </Button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default withAuth(CommunityHome, ['teacher', 'student']); // Keep auth guard