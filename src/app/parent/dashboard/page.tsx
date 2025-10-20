"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/types";
import { getChildrenForParent } from "@/lib/db";
import { Button } from "@/components/ui/button";

/* ----------------------------------------------------
   🎨 Playful multi-pastel backdrop with soft doodles
   (UI-only; no logic touched)
---------------------------------------------------- */
function PlayfulBackdrop() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* multi-pastel radial washes: peach, mint, lilac, lemon */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_12%_12%,#FFE4E6_0%,transparent_60%),radial-gradient(70%_70%_at_88%_10%,#E0E7FF_0%,transparent_55%),radial-gradient(60%_60%_at_14%_88%,#D1FAE5_0%,transparent_55%),radial-gradient(60%_60%_at_86%_86%,#FEF9C3_0%,transparent_55%)]" />

      {/* bubbly doodle 1 */}
      <svg
        className="absolute -top-24 -left-24 w-[440px] h-[440px] opacity-[0.28] blur-[2px]"
        viewBox="0 0 200 200"
      >
        <path
          fill="#FDE68A"
          d="M43.9,-66.9C58.1,-58.9,70.4,-46,76.2,-31.2C82,-16.5,81.4,-0,75.9,14.8C70.5,29.7,60.2,42.9,47.9,53.5C35.7,64.1,21.5,72.1,6.2,73.6C-9,75.1,-18,69.9,-31.5,64.1C-45,58.4,-63,52,-69.9,40C-76.8,27.9,-72.5,10.2,-65.9,-4.8C-59.4,-19.8,-50.5,-32.1,-40.6,-42.6C-30.8,-53.1,-19.9,-61.8,-6.5,-69C7,-76.2,21.9,-81.8,43.9,-66.9Z"
          transform="translate(100 100)"
        />
      </svg>

      {/* bubbly doodle 2 */}
      <svg
        className="absolute -bottom-28 -right-20 w-[520px] h-[520px] opacity-[0.22]"
        viewBox="0 0 200 200"
      >
        <path
          fill="#A7F3D0"
          d="M39.6,-60.3C51.8,-51.3,62.8,-41.7,73.1,-28.9C83.5,-16.1,93.2,-0.1,92.7,15.9C92.1,32,81.3,48.2,66.7,61.2C52.1,74.2,33.6,83.9,14.3,87.6C-5,91.3,-25.2,89,-40.1,79.2C-55,69.4,-64.5,52.2,-70.9,36.1C-77.2,20,-80.3,5.1,-78.2,-10.3C-76.1,-25.6,-68.8,-41.3,-56.8,-50.8C-44.9,-60.3,-28.4,-63.4,-12.9,-64.3C2.6,-65.3,18.1,-64.1,39.6,-60.3Z"
          transform="translate(100 100)"
        />
      </svg>

      {/* soft sprinkles/dots */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute bottom-24 left-12 w-28 h-28 rounded-full bg-pink-200/40 blur-2xl" />
        <div className="absolute top-28 right-10 w-24 h-24 rounded-full bg-indigo-200/40 blur-2xl" />
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   🪟 Card (glassmorphism)
---------------------------------------------------- */
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-6 " +
        className
      }
    >
      {children}
    </div>
  );
}

/* -----------------------------
   Types for the dashboard view
----------------------------- */
type ActivityKind =
  | "chapters"   // Chapters Read -> contentReads where kind = 'ebook'
  | "quizzes"    // Quizzes Taken -> quizAttempts
  | "teachers"   // Teacher's Test -> community_test_answers
  | "workshops"  // Workshops Attended -> workshop_attended join community_workshops
  | "videos";    // Videos Watched -> videoViews

type TimeWindow = 7 | 15 | 30;

type Row = {
  id: string;
  subject?: string;
  chapter?: string;
  className?: string;
  score?: number | string;
  timestamp?: Date | null;

  // extra fields for new kinds (used only in those views)
  title?: string;
  description?: string;
  timeText?: string;
  // (studentID kept internally if needed but never displayed)
  studentID?: string;
};

/* -----------------------------
   Helpers to make queries resilient
----------------------------- */

// Query by whichever student field the collection uses.
async function getDocsByAnyStudentField(
  coll: string,
  childUid: string,
  fieldCandidates: string[] = ["studentId", "studentID", "userId", "uid"]
) {
  const rows: { id: string; data: any }[] = [];
  for (const field of fieldCandidates) {
    const snap = await getDocs(query(collection(db, coll), where(field, "==", childUid)));
    if (!snap.empty) {
      snap.forEach((d) => rows.push({ id: d.id, data: d.data() }));
      break; // use first matching field
    }
  }
  return rows;
}

// Normalize timestamps from various shapes
function coerceTimestamp(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Timestamp) return raw.toDate();
  if (typeof raw === "number") return new Date(raw);
  if (typeof raw === "string") return new Date(raw);
  if (raw?.toDate && typeof raw.toDate === "function") return raw.toDate(); // Firestore Timestamp-like
  return null;
}

/* -----------------------------
   Firestore fetchers
----------------------------- */
async function fetchChaptersRead(childUid: string, since: Date): Promise<Row[]> {
  const docs = await getDocsByAnyStudentField("contentReads", childUid, [
    "studentId",
    "studentID",
    "userId",
    "uid",
  ]);

  const rows: Row[] = [];
  for (const { id, data } of docs) {
    const kind = (data.kind ?? data.type ?? "").toString().toLowerCase();
    if (kind !== "ebook") continue;

    const ts = coerceTimestamp(
      data.timestamp ?? data.readAt ?? data.createdAt ?? data.updatedAt
    );
    if (ts && ts < since) continue;

    rows.push({
      id,
      chapter: data.chapter ?? data.chapterName ?? data.title ?? "",
      className: data.class ?? data.className ?? "",
      subject: data.subject ?? "",
      timestamp: ts,
    });
  }

  rows.sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
  return rows;
}

async function fetchQuizAttempts(childUid: string, since: Date): Promise<Row[]> {
  const docs = await getDocsByAnyStudentField("quizAttempts", childUid, [
    "studentId",
    "studentID",
    "userId",
    "uid",
  ]);
  const rows: Row[] = [];

  for (const { id, data } of docs) {
    const ts = coerceTimestamp(
      data.timestamp ?? data.submittedAt ?? data.createdAt ?? data.updatedAt
    );
    if (ts && ts < since) continue;

    const score =
      data.score ??
      data.percentage ??
      (typeof data.correctCount === "number" && typeof data.total === "number"
        ? `${data.correctCount}/${data.total}`
        : undefined);

    rows.push({
      id,
      subject: data.subject ?? "",
      chapter: data.chapter ?? "",
      score,
      timestamp: ts,
    });
  }

  rows.sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
  return rows;
}

async function fetchTeachersTests(childUid: string, since: Date): Promise<Row[]> {
  const docs = await getDocsByAnyStudentField("community_test_answers", childUid, [
    "studentId",
    "studentID",
    "userId",
    "uid",
  ]);
  const rows: Row[] = [];

  for (const { id, data } of docs) {
    const ts = coerceTimestamp(
      data.timestamp ?? data.submittedAt ?? data.createdAt ?? data.updatedAt
    );
    if (ts && ts < since) continue;

    const score =
      data.score ??
      data.percentage ??
      (typeof data.correctCount === "number" && typeof data.total === "number"
        ? `${data.correctCount}/${data.total}`
        : undefined);

    rows.push({
      id,
      subject: data.subject ?? "",
      chapter: data.chapter ?? "",
      score,
      timestamp: ts,
    });
  }

  rows.sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
  return rows;
}

/* -----------------------------
   New fetchers: workshops & videos
----------------------------- */

// Pull from `workshop_attended` by student, prefer fields from attendance,
// otherwise join to `community_workshops/{workshopId}`
async function fetchWorkshopsForStudent(childUid: string, since: Date): Promise<Row[]> {
  const docs = await getDocsByAnyStudentField("workshop_attended", childUid, [
    "studentId",
    "studentID",
    "userId",
    "uid",
  ]);

  const out: Row[] = [];

  for (const { id, data } of docs) {
    const ts =
      coerceTimestamp(data.attendedAt ?? data.timestamp ?? data.createdAt ?? data.updatedAt) || null;
    if (ts && ts < since) continue;

    let title = data.Title ?? data.title ?? "";
    let description = data.Description ?? data.description ?? "";
    let timeText = data.Time ?? data.time ?? "";

    // If attendance doc missing details, try to fetch the source workshop
    if ((!title || !description || !timeText) && data.workshopId) {
      try {
        const wDoc = await getDoc(doc(db, "community_workshops", data.workshopId));
        if (wDoc.exists()) {
          const w = wDoc.data() as any;
          title = title || w.Title || w.title || "";
          description = description || w.Description || w.description || "";
          timeText = timeText || w.Time || w.time || "";
        }
      } catch {
        // ignore join errors
      }
    }

    out.push({
      id,
      title,
      description,
      timeText,
      timestamp: ts,
    });
  }

  out.sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
  return out;
}

// Pull from `videoViews` by student, normalize field names
async function fetchVideoViewsForStudent(childUid: string, since: Date): Promise<Row[]> {
  const docs = await getDocsByAnyStudentField("videoViews", childUid, [
    "studentId",
    "studentID",
    "userId",
    "uid",
  ]);

  const out: Row[] = [];
  for (const { id, data } of docs) {
    const ts = coerceTimestamp(
      data.viewedAt ?? data.timestamp ?? data.createdAt ?? data.updatedAt
    );
    if (ts && ts < since) continue;

    out.push({
      id,
      title: data.title ?? data.videoTitle ?? "",
      // studentID kept in data shape for internal use if needed, but not displayed
      studentID: data.studentId ?? data.studentID ?? "",
      timestamp: ts,
    });
  }

  out.sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
  return out;
}

/* -----------------------------
   Dispatcher by kind
----------------------------- */
async function fetchRows(kind: ActivityKind, childUid: string, lookbackDays: TimeWindow) {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  if (kind === "chapters") return fetchChaptersRead(childUid, since);
  if (kind === "quizzes") return fetchQuizAttempts(childUid, since);
  if (kind === "teachers") return fetchTeachersTests(childUid, since);
  if (kind === "workshops") return fetchWorkshopsForStudent(childUid, since);
  return fetchVideoViewsForStudent(childUid, since); // "videos"
}

/* -----------------------------
   Main Page
----------------------------- */
export default function ParentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [children, setChildren] = useState<UserProfile[]>([]);
  const [childId, setChildId] = useState<string | null>(null);

  const [kind, setKind] = useState<ActivityKind>("chapters");
  const [windowDays, setWindowDays] = useState<TimeWindow>(7);

  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const router = useRouter();

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Load children
  useEffect(() => {
    (async () => {
      if (authLoading) return;
      if (!user) {
        router.replace("/login?redirect=" + encodeURIComponent("/parent/dashboard"));
        return;
      }

      const kids = await getChildrenForParent(user.uid);
      if (!kids || kids.length === 0) {
        router.replace("/parent/add-child");
        return;
      }

      setChildren(kids);
      setChildId((prev) => prev ?? kids[0].uid);
    })();
  }, [authLoading, user, router]);

  // Fetch rows
  useEffect(() => {
    (async () => {
      if (!childId) return;
      setLoadingRows(true);
      try {
        const data = await fetchRows(kind, childId, windowDays);
        setRows(data);
      } finally {
        setLoadingRows(false);
      }
    })();
  }, [childId, kind, windowDays]);

  const activeChild = useMemo(
    () => children.find((c) => c.uid === childId),
    [children, childId]
  );

  const kindOptions: { value: ActivityKind; label: string }[] = [
    { value: "chapters", label: "📘 Chapters Read" },
    { value: "quizzes", label: "🧠 Quiz Taken" },
    { value: "teachers", label: "🏫 Teacher’s Test" },
    { value: "workshops", label: "🎉 Workshops Attended" },
    { value: "videos", label: "🎬 Videos Watched" },
  ];

  const timeOptions: { value: TimeWindow; label: string }[] = [
    { value: 7, label: "Last 7 days" },
    { value: 15, label: "Last 15 days" },
    { value: 30, label: "Last 30 days" },
  ];

  const headlineName =
    (activeChild as any)?.fullName ??
    activeChild?.displayName ??
    activeChild?.email ??
    "";

  // 🔒 Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      router.replace("/login");
    }
  };

  return (
    <div className="relative min-h-[100vh] text-slate-800">
      <PlayfulBackdrop />

      <div className="mx-auto max-w-6xl px-5 md:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(90deg,#fb7185,#a78bfa,#34d399)] drop-shadow-sm">
              {headlineName ? `Progress for ${headlineName}` : "Progress Dashboard"}
            </h1>
            {activeChild?.className && (
              <p className="text-sm text-slate-600 mt-1">
                Class: <span className="font-medium">{activeChild.className}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push("/parent/add-child")}
              className="rounded-full bg-gradient-to-r from-rose-400 via-indigo-400 to-emerald-400 text-white px-5 py-2 shadow hover:shadow-md transition-all"
            >
              ➕ Add another child
            </Button>

            {/* 🚪 Logout button */}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="rounded-full border-red-300 text-red-600 hover:bg-red-50"
              title="Log out"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-800">Filters</h2>
            <p className="text-xs text-slate-600 mt-1">
              Pick a child, choose an activity, and set a time window
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Child selector */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Child</label>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                value={childId ?? ""}
                onChange={(e) => setChildId(e.target.value)}
              >
                {children.map((c) => (
                  <option key={c.uid} value={c.uid}>
                    {(c as any).fullName ?? c.displayName ?? c.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity selector */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Activity</label>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={kind}
                onChange={(e) => setKind(e.target.value as ActivityKind)}
              >
                {kindOptions.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time window */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Time Range</label>
              <select
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value) as TimeWindow)}
              >
                {timeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-800">
              {kind === "chapters"
                ? "📘 Chapters Read"
                : kind === "quizzes"
                ? "🧠 Quizzes Taken"
                : kind === "teachers"
                ? "🏫 Teacher’s Test"
                : kind === "workshops"
                ? "🎉 Workshops Attended"
                : "🎬 Videos Watched"}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Light zebra rows, clear contrast, playful hover
            </p>
          </div>

          <div className="mt-2">
            {loadingRows ? (
              <div className="text-center text-slate-600 py-6 animate-pulse">
                Loading records…
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-slate-500 py-6">
                No records for this selection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    {kind === "chapters" ? (
                      <tr className="text-left text-slate-700 bg-white/70">
                        <th className="py-2 pr-4">Chapter</th>
                        <th className="py-2 pr-4">Class</th>
                        <th className="py-2 pr-4">Subject</th>
                        <th className="py-2 pr-4">Timestamp</th>
                      </tr>
                    ) : kind === "quizzes" || kind === "teachers" ? (
                      <tr className="text-left text-slate-700 bg-white/70">
                        <th className="py-2 pr-4">Subject</th>
                        <th className="py-2 pr-4">Chapter</th>
                        <th className="py-2 pr-4">Score</th>
                        <th className="py-2 pr-4">Timestamp</th>
                      </tr>
                    ) : kind === "workshops" ? (
                      <tr className="text-left text-slate-700 bg-white/70">
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">Time</th>
                        <th className="py-2 pr-4">Description</th>
                        <th className="py-2 pr-4">Attended At</th>
                      </tr>
                    ) : (
                      // videos (StudentID removed from display)
                      <tr className="text-left text-slate-700 bg-white/70">
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">Viewed At</th>
                      </tr>
                    )}
                  </thead>

                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`border-t border-slate-100 transition-colors ${
                          i % 2 === 0 ? "bg-pink-50/30" : "bg-emerald-50/30"
                        } hover:bg-indigo-50/50`}
                      >
                        {kind === "chapters" ? (
                          <>
                            <td className="py-2 pr-4 font-medium text-slate-800">{r.chapter ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-700">{r.className ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-700">{r.subject ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-600">
                              {r.timestamp ? r.timestamp.toLocaleString() : "-"}
                            </td>
                          </>
                        ) : kind === "quizzes" || kind === "teachers" ? (
                          <>
                            <td className="py-2 pr-4 font-medium text-slate-800">{r.subject ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-700">{r.chapter ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-700">{r.score ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-600">
                              {r.timestamp ? r.timestamp.toLocaleString() : "-"}
                            </td>
                          </>
                        ) : kind === "workshops" ? (
                          <>
                            <td className="py-2 pr-4 font-medium text-slate-800">{r.title ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-700">{r.timeText ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-700">{r.description ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-600">
                              {r.timestamp ? r.timestamp.toLocaleString() : "-"}
                            </td>
                          </>
                        ) : (
                          // videos (no StudentID column)
                          <>
                            <td className="py-2 pr-4 font-medium text-slate-800">{r.title ?? "-"}</td>
                            <td className="py-2 pr-4 text-slate-600">
                              {r.timestamp ? r.timestamp.toLocaleString() : "-"}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
