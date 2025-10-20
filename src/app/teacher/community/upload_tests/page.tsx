'use client';

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

type Question = {
  question: string;
  options: string[];
  correctAnswer: string;
};

export default function UploadTests() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teacherData, setTeacherData] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    chapter: "",
    targetClasses: [] as string[], // multiple classes
    questions: [{ question: "", options: ["", "", "", ""], correctAnswer: "" }],
  });

  // Fetch teacher data
  useEffect(() => {
    if (!user?.uid) return;

    const fetchTeacher = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.role !== "teacher") {
            alert("❌ Only teachers can upload tests.");
            return;
          }
          setTeacherData(data);
          setFormData((prev) => ({ ...prev, subject: data.subject }));
        }
      } catch (err) {
        console.error("Error fetching teacher data:", err);
      }
    };

    fetchTeacher();
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionChange = (
    index: number,
    field: string,
    value: string,
    optionIndex?: number
  ) => {
    const questions = [...formData.questions];
    if (field === "option" && optionIndex !== undefined) {
      questions[index].options[optionIndex] = value;
    } else {
      (questions[index] as any)[field] = value;
    }
    setFormData((prev) => ({ ...prev, questions }));
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question: "", options: ["", "", "", ""], correctAnswer: "" },
      ],
    }));
  };

  const handleClassChange = (cls: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({ ...prev, targetClasses: [...prev.targetClasses, cls] }));
    } else {
      setFormData((prev) => ({
        ...prev,
        targetClasses: prev.targetClasses.filter((c) => c !== cls),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherData) return;
    if (!formData.targetClasses.length) return alert("❌ Select at least one class.");

    try {
      setLoading(true);
      await addDoc(collection(db, "community_tests"), {
        ...formData,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
      });

      alert("✅ Test uploaded successfully!");
      setFormData({
        title: "",
        description: "",
        subject: teacherData.subject,
        chapter: "",
        targetClasses: [],
        questions: [{ question: "", options: ["", "", "", ""], correctAnswer: "" }],
      });
    } catch (err: any) {
      console.error(err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!teacherData) return <p className="text-center mt-10">Loading teacher data...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6E9FF] via-[#F4F7FF] to-[#EAF5FF] p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">📘 Create a New MCQ Test</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-md w-full max-w-3xl space-y-4">
        <div>
          <label className="block font-medium text-gray-700">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full border rounded-lg p-2 mt-1"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border rounded-lg p-2 mt-1"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700">Subject</label>
          <input
            type="text"
            value={teacherData.subject || "Loading..."}
            disabled
            className="w-full border rounded-lg p-2 mt-1 bg-gray-100 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-1">Target Classes</label>
          <div className="flex gap-4">
            {teacherData.className.map((cls: string) => (
              <label key={cls} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={formData.targetClasses.includes(cls)}
                  onChange={(e) => handleClassChange(cls, e.target.checked)}
                  className="w-4 h-4 accent-purple-500"
                />
                {cls}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium text-gray-700">Chapter</label>
          <input
            type="text"
            name="chapter"
            value={formData.chapter}
            onChange={handleChange}
            required
            className="w-full border rounded-lg p-2 mt-1"
          />
        </div>

        <h2 className="text-xl font-semibold text-purple-600 mt-4">Questions (MCQ)</h2>
        {formData.questions.map((q, idx) => (
          <div key={idx} className="border rounded-xl p-4 mt-2 bg-gray-50 space-y-2">
            <input
              type="text"
              placeholder={`Question ${idx + 1}`}
              value={q.question}
              onChange={(e) => handleQuestionChange(idx, "question", e.target.value)}
              required
              className="w-full border rounded-lg p-2"
            />
            <div className="grid grid-cols-2 gap-2">
              {["A", "B", "C", "D"].map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Option ${opt}`}
                  value={q.options[i]}
                  onChange={(e) => handleQuestionChange(idx, "option", e.target.value, i)}
                  required
                  className="w-full border rounded-lg p-2"
                />
              ))}
            </div>
            <div>
              <label className="block text-gray-700 mt-1">Correct Answer</label>
              <select
                value={q.correctAnswer}
                onChange={(e) => handleQuestionChange(idx, "correctAnswer", e.target.value)}
                required
                className="w-full border rounded-lg p-2 mt-1"
              >
                <option value="">Select Correct Answer</option>
                {q.options.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <Button
          type="button"
          onClick={addQuestion}
          className="bg-purple-200 hover:bg-purple-300 text-purple-700 w-full mt-2"
        >
          ➕ Add Another Question
        </Button>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white hover:brightness-110 mt-4"
        >
          {loading ? "Creating..." : "Create MCQ Test"}
        </Button>
      </form>
    </div>
  );
}
