'use client';

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

type Question = {
  question: string;
  options: string[];
  correctAnswer: string; // full text
};

type Test = {
  id: string;
  title: string;
  description?: string;
  subject: string;
  chapter: string;
  targetClasses: string[];
  questions: Question[];
};

export default function TakeTestPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // Fetch tests for student's class
  useEffect(() => {
    const fetchTests = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        let studentClass = "";
        if (userDoc.exists()) {
          const u = userDoc.data() as any;
          studentClass = Array.isArray(u.className) ? u.className[0] : u.className || "";
        }
        if (!studentClass) return;

        const qy = query(
          collection(db, "community_tests"),
          where("targetClasses", "array-contains", studentClass)
        );
        const snapshot = await getDocs(qy);
        const data: Test[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Test, "id">) }));
        setTests(data);
      } catch (err) {
        console.error("Error fetching tests:", err);
        alert("Error fetching tests. Try again later.");
      }
    };

    fetchTests();
  }, [user]);

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({ ...prev, [index]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTest) return;

    try {
      setLoading(true);

      // Fetch student info
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let fullName = user.email || "Unknown";
      let studentClass = "-";
      if (userDoc.exists()) {
        const u = userDoc.data() as any;
        fullName = (u.fullName as string) || user.email || "Unknown";
        studentClass = Array.isArray(u.className) ? u.className[0] : u.className || "-";
      }

      // Re-fetch test data to ensure latest
      const testDoc = await getDoc(doc(db, "community_tests", selectedTest.id));
      const testData: Test = testDoc.exists()
        ? ({ id: testDoc.id, ...(testDoc.data() as Omit<Test, "id">) } as Test)
        : selectedTest;

      // Calculate score
      let obtainedScore = 0;
      testData.questions.forEach((q, idx) => {
        const studentAnswer = (answers[idx] ?? "").trim();
        const correctAnswer = (q.correctAnswer ?? "").trim();
        console.log(`Q${idx + 1}: student='${studentAnswer}', correct='${correctAnswer}'`);
        if (studentAnswer && studentAnswer === correctAnswer) {
          obtainedScore++;
        }
      });

      setScore(obtainedScore);

      // Store submission
      await addDoc(collection(db, "community_test_answers"), {
        testId: testData.id,
        studentId: user.uid,
        studentName: fullName,
        studentClass,
        studentEmail: user.email,
        subject: testData.subject,
        chapter: testData.chapter,
        answers,
        score: obtainedScore,
        totalQuestions: testData.questions.length,
        submittedAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error("Error submitting test:", err);
      alert(`❌ Error submitting test: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#DFF3FF] via-[#E9FFF8] to-[#D9F4EC] space-y-4">
        <h2 className="text-2xl font-semibold text-green-700">✅ Test submitted successfully!</h2>
        {score !== null && (
          <p className="text-xl font-medium text-purple-700">
            🎯 You scored {score} / {selectedTest?.questions.length}
          </p>
        )}
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#DFF3FF] via-[#E9FFF8] to-[#D9F4EC] p-6 flex flex-col items-center">
      {!selectedTest ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {tests.length === 0 && (
            <p className="text-gray-500 text-center col-span-full">No tests available for your class.</p>
          )}
          {tests.map(test => (
            <div
              key={test.id}
              className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-xl transition"
              onClick={() => setSelectedTest(test)}
            >
              <h2 className="text-xl font-semibold text-purple-600">{test.title}</h2>
              {test.description && <p className="text-gray-600">{test.description}</p>}
              <p className="text-gray-500 text-sm">
                Subject: {test.subject} | Chapter: {test.chapter}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-3xl mt-6 space-y-4">
          <h2 className="text-2xl font-semibold text-purple-700">{selectedTest.title}</h2>
          <p className="text-gray-600 mb-4">
            Subject: {selectedTest.subject} | Chapter: {selectedTest.chapter}
          </p>

          {selectedTest.questions.map((q, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm">
              <p className="font-medium">{idx + 1}. {q.question}</p>
              <div className="flex flex-col mt-2 gap-2">
                {q.options.map((opt, oIdx) => (
                  <label key={oIdx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${idx}`}
                      value={opt}
                      checked={answers[idx] === opt}
                      onChange={() => handleAnswerChange(idx, opt)}
                      required
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Test"}
          </Button>
        </form>
      )}
    </div>
  );
}
