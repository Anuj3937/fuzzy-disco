'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import withAuth from '@/components/auth/withAuth';
import { Button } from '@/components/ui/button';
import { CalendarClock, FileUp, Video, Users } from 'lucide-react'; // Added Users icon

function TeacherCommunity() {
  const { user } = useAuth();
  const router = useRouter();

  const tabs = [
    {
      title: 'Schedule a Workshop',
      desc: 'Plan and organize interactive workshops for your students.',
      icon: CalendarClock,
      color: 'from-[#E5DBFF] to-[#F0E9FF]',
      link: '/teacher/community/schedule_workshop',
    },
    {
      title: 'Create a Test',
      desc: 'Create and share assessments with your class easily.',
      icon: FileUp,
      color: 'from-[#D9F4EC] to-[#E9FFF8]',
      link: '/teacher/community/upload_tests',
    },
    {
      title: 'Upload Videos',
      desc: 'Share recorded lessons and helpful video resources.',
      icon: Video,
      color: 'from-[#FFE3ED] to-[#FFF1F6]',
      link: '/teacher/community/upload_videos',
    },
    {
      title: 'View Submissions',
      desc: 'Check student test submissions and their scores.',
      icon: Users,
      color: 'from-[#FDE7C9] to-[#FFF3E2]', // peach → cream
      link: '/teacher/community/view_submission',
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#ECE7FF] via-[#F6F3FF] to-[#E3F1FF] text-gray-800 overflow-hidden">
      {/* ✏️ Decorative doodles */}
      <svg
        className="pointer-events-none absolute -top-16 -left-10 w-72 h-72 opacity-70"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path d="M30 100 q40 -20 70 0 q-30 -20 -70 0" stroke="#B9C8FF" strokeWidth="4" fill="none" />
        <path d="M100 100 q40 -20 70 0 q-30 -20 -70 0" stroke="#C9B8FF" strokeWidth="4" fill="none" />
        <rect x="120" y="20" width="50" height="14" rx="3" fill="#E7DFFF" />
        <path d="M125 24 h40" stroke="#CFC2FF" strokeWidth="2" />
        <path d="M130 24 v10 M140 24 v10 M150 24 v10 M160 24 v10" stroke="#CFC2FF" strokeWidth="2" />
      </svg>

      <svg
        className="pointer-events-none absolute bottom-0 right-0 w-[24rem] h-[24rem] opacity-70"
        viewBox="0 0 300 300"
        fill="none"
      >
        <path d="M40 80 q60 30 140 -20 q40 -20 90 0" stroke="#B6E3D2" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="210" y="220" width="26" height="8" rx="3" fill="#FFDAD5" />
        <path d="M210 220 l-10 10 l36 0 l-10 -10 z" fill="#FFC7BE" />
        <circle cx="220" cy="200" r="10" fill="#FBE2A8" />
      </svg>

      {/* Background glow */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 bg-[#F1EBFF] rounded-full blur-3xl opacity-60 animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[#DFF3FF] rounded-full blur-3xl opacity-60 animate-pulse delay-700" />

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-gradient-to-r from-white/60 via-white/50 to-white/60 border-b border-white/40 shadow-md">
        <div className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-center">
          <Button
            variant="outline"
            className="absolute left-6 bg-white/70 hover:bg-[#9B87F5] hover:text-white text-[#6B5BBE] font-medium border border-[#9B87F5] rounded-xl transition-all duration-200"
            onClick={() => router.push('/teacher')}
          >
            ← Back
          </Button>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#6B5BBE] via-[#7C6BF2] to-[#A1B5FF] drop-shadow-sm text-center">
            Teacher Community
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto p-6">
        <div className="relative mb-12 text-center">
          <h2 className="text-2xl font-semibold text-[#5A4DA8]">
            Create • Guide • Inspire
          </h2>
          <p className="text-[#5A4DA8]/80 text-base mt-1 max-w-2xl mx-auto">
            Manage your teaching content — schedule workshops, upload tests, share videos, and view submission.
          </p>
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
                <svg
                  className="pointer-events-none absolute -top-5 -right-5 w-24 h-24 opacity-40"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <path d="M10 50 Q 25 30, 40 50 T 70 50" stroke="#C9B8FF" strokeWidth="3" fill="none" />
                  <circle cx="80" cy="22" r="6" fill="#BFE7D8" />
                </svg>

                <Icon className="h-12 w-12 text-[#4E3FA3] mb-4" />
                <h2 className="text-2xl font-semibold text-[#3E2F9A] mb-2">
                  {tab.title}
                </h2>
                <p className="text-[#4E3FA3]/80 text-sm">{tab.desc}</p>

                <Button className="mt-6 bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110">
                  Open
                </Button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default withAuth(TeacherCommunity, ['teacher']);
