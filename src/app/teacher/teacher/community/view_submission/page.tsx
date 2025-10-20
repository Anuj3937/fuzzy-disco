'use client';

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

type Question = { question: string; options: string[]; correctAnswer: string };
type Test = { 
  id: string; 
  title: string; 
  subject: string; 
  chapter: string; 
  targetClasses?: string[]; 
  questions: Question[] 
};
type Submission = {
  id: string;
  testId: string;
  studentId: string;
  studentName?: string;
  studentClass?: string;
  subject: string;
  chapter: string;
  score?: number;
  submittedAt: any;
};

export default function ViewSubmission() {
  const { user } = useAuth();
  const [teacherSubject, setTeacherSubject] = useState("");
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch teacher subject
  useEffect(() => {
    const fetchTeacherSubject = async () => {
      if (!user) return;
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        setTeacherSubject(docSnap.data().subject || "");
      }
    };
    fetchTeacherSubject();
  }, [user]);

  // Fetch tests for teacher’s subject
  useEffect(() => {
    const fetchTests = async () => {
      if (!teacherSubject) return;
      const q = query(collection(db, "community_tests"), where("subject", "==", teacherSubject));
      const snapshot = await getDocs(q);
      setTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Test[]);
    };
    fetchTests();
  }, [teacherSubject]);

  // Fetch submissions for a test
  const fetchSubmissions = async (test: Test) => {
    setSelectedTest(test);
    setLoading(true);
    try {
      const q = query(collection(db, "community_test_answers"), where("testId", "==", test.id));
      const snapshot = await getDocs(q);

      const submissionsWithUser = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const sub = { id: docSnap.id, ...(docSnap.data() as Submission) };
          try {
            const userDoc = await getDoc(doc(db, "users", sub.studentId));
            if (userDoc.exists()) {
              const u = userDoc.data();
              return {
                ...sub,
                studentName: u.fullName || "Unknown",
                studentClass: Array.isArray(u.className) ? u.className[0] : u.className || "-",
              };
            } else return sub;
          } catch {
            return sub;
          }
        })
      );

      setSubmissions(submissionsWithUser);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      alert("Error fetching submissions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ECE7FF] via-[#F6F3FF] to-[#E3F1FF] p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center">📄 View Test Submissions</h1>

      {!selectedTest && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {tests.map(test => (
            <div
              key={test.id}
              className="bg-white p-4 rounded-xl shadow cursor-pointer hover:shadow-lg"
              onClick={() => fetchSubmissions(test)}
            >
              <h2 className="text-xl font-semibold text-purple-600">{test.title}</h2>
              <p className="text-gray-500 text-sm">
                Subject: {test.subject} | Classes: {(test.targetClasses || []).join(", ")} | Chapter: {test.chapter}
              </p>
            </div>
          ))}
        </div>
      )}

      {selectedTest && (
        <div className="max-w-5xl mx-auto mt-6">
          <Button
            onClick={() => setSelectedTest(null)}
            className="mb-4 bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110"
          >
            ← Back
          </Button>

          <h2 className="text-2xl font-semibold text-purple-700 mb-4">
            Submissions for {selectedTest.title} ({(selectedTest.targetClasses || []).join(", ")})
          </h2>

          {loading ? (
            <p>Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <p className="text-gray-600">No submissions yet for this test.</p>
          ) : (
            <table className="w-full bg-white rounded-2xl shadow overflow-hidden">
              <thead className="bg-purple-50">
                <tr>
                  <th className="p-3 text-left">Student Name</th>
                  <th className="p-3 text-left">Class</th>
                  <th className="p-3 text-left">Subject</th>
                  <th className="p-3 text-left">Chapter</th>
                  <th className="p-3 text-left">Marks</th>
                  <th className="p-3 text-left">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id} className="border-t">
                    <td className="p-3">{sub.studentName}</td>
                    <td className="p-3">{sub.studentClass}</td>
                    <td className="p-3">{sub.subject}</td>
                    <td className="p-3">{sub.chapter}</td>
                    <td className="p-3">{sub.score ?? "-"}</td>
                    <td className="p-3">{sub.submittedAt?.toDate?.().toLocaleString() || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
