'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageCircle, Users } from 'lucide-react';

type Activity = {
  type: 'doubt' | 'community';
  title: string;
  status?: string;
  time: string;
};

export default function TeacherDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [recentActivity, setRecentActivity] = useState<Activity[] | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const t = setTimeout(() => {
      setRecentActivity([
        { type: 'doubt', title: 'Solved doubt in Physics: Motion', status: 'Resolved', time: '1 day ago' },
        { type: 'community', title: 'Shared post in Teaching Innovations', time: '3 days ago' },
      ]);
    }, 700);

    return () => clearTimeout(t);
  }, [user, loading, router]);

  if (loading || !user) {
    return <p className="text-center mt-20 text-gray-500">Loading...</p>;
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#FFF1F8] via-[#E8FFF8] to-[#FFF9E7] text-gray-800 overflow-hidden">
      {/* Background Doodles - corners/edges only */}
      <div className="absolute top-5 left-5 w-16 h-16 bg-yellow-200 rounded-full opacity-40" />
      <div className="absolute top-10 right-10 w-12 h-12 bg-pink-200 rounded-full opacity-40" />
      <div className="absolute bottom-10 left-10 w-20 h-20 bg-purple-200 rounded-full opacity-30" />
      <div className="absolute bottom-10 right-10 w-24 h-24 bg-cyan-200 rounded-full opacity-25" />
      <div className="absolute top-1/2 left-5 w-12 h-12 bg-green-200 rounded-full opacity-30" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Hero / Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-purple-700 drop-shadow-lg mb-4">
            Welcome, {user.name || user.displayName || 'Teacher'} 👋
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Engage with your students, solve doubts, and connect with the teaching community in one place!
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Doubt Solver Card */}
          <Link href="/teacher/doubt_solver">
            <div className="relative p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-transform cursor-pointer overflow-hidden bg-gradient-to-br from-blue-200 via-blue-100 to-blue-50 border border-blue-300/40 backdrop-blur-sm">
              <MessageCircle className="absolute -top-10 -right-10 h-40 w-40 text-blue-300 opacity-30 rotate-12" />
              <MessageCircle className="h-14 w-14 text-blue-700 mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-blue-800">Doubt Solver</h2>
              <p className="text-blue-900 mb-4">Quickly answer and manage student queries.</p>
              <Button className="bg-gradient-to-r from-blue-300 via-blue-200 to-blue-100 hover:from-blue-400 hover:via-blue-300 hover:to-blue-200 text-blue-900 transition-transform hover:scale-105 shadow-md">
                Open Doubt Solver
              </Button>
            </div>
          </Link>

          {/* Community Card */}
          <Link href="/teacher/community">
            <div className="relative p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-transform cursor-pointer overflow-hidden bg-gradient-to-br from-pink-200 via-pink-100 to-purple-50 border border-pink-300/40 backdrop-blur-sm">
              <Users className="absolute -bottom-10 -right-10 h-40 w-40 text-pink-300 opacity-30 rotate-12" />
              <Users className="h-14 w-14 text-pink-700 mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-pink-800">Teacher Community</h2>
              <p className="text-pink-900 mb-4">Share ideas and collaborate with fellow educators.</p>
              <Button className="bg-gradient-to-r from-pink-300 via-pink-200 to-purple-100 hover:from-pink-400 hover:via-pink-300 hover:to-purple-200 text-pink-900 transition-transform hover:scale-105 shadow-md">
                Join Community
              </Button>
            </div>
          </Link>
        </div>

        {/* Recent Activity Section */}
        <section>
          <h2 className="text-3xl font-bold mb-6 text-center text-purple-700 drop-shadow-lg">
            Recent Activity
          </h2>
          {recentActivity === null ? (
            <p className="text-center text-gray-500">Loading activities...</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-center text-gray-500">No recent activities</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto py-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 w-72 p-4 rounded-2xl shadow hover:shadow-lg transition border border-opacity-20 ${
                    activity.type === 'doubt'
                      ? 'bg-gradient-to-br from-blue-200 via-blue-100 to-blue-50 border border-blue-300/40'
                      : 'bg-gradient-to-br from-pink-100 via-pink-50 to-purple-100 border border-pink-300/30'
                  }`}
                >
                  {activity.type === 'doubt' ? (
                    <>
                      <p className="font-semibold text-blue-800">{activity.title}</p>
                      <p className="text-blue-900">Status: {activity.status}</p>
                      <p className="text-sm text-blue-700">{activity.time}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-pink-700">{activity.title}</p>
                      <p className="text-sm text-pink-600">{activity.time}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}