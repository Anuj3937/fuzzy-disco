"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getStudentByEmail, linkParentToChild, getChildrenForParent } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  childEmail: z.string().email("Enter a valid email"),
});
type FormValues = z.infer<typeof schema>;

type PendingChild = {
  uid: string;
  name: string;
  className?: string;
};

// 🌈 Pastel background + doodles
function PlayfulBackdrop() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_12%_12%,#FFE4E6_0%,transparent_60%),radial-gradient(70%_70%_at_88%_10%,#E0E7FF_0%,transparent_55%),radial-gradient(60%_60%_at_14%_88%,#D1FAE5_0%,transparent_55%),radial-gradient(60%_60%_at_86%_86%,#FEF9C3_0%,transparent_55%)]" />

      <svg
        className="absolute -top-24 -left-24 w-96 h-96 opacity-[0.25] blur-[1px]"
        viewBox="0 0 200 200"
      >
        <path
          fill="#FDE68A"
          d="M43.9,-66.9C58.1,-58.9,70.4,-46,76.2,-31.2C82,-16.5,81.4,-0,75.9,14.8C70.5,29.7,60.2,42.9,47.9,53.5C35.7,64.1,21.5,72.1,6.2,73.6C-9,75.1,-18,69.9,-31.5,64.1C-45,58.4,-63,52,-69.9,40C-76.8,27.9,-72.5,10.2,-65.9,-4.8C-59.4,-19.8,-50.5,-32.1,-40.6,-42.6C-30.8,-53.1,-19.9,-61.8,-6.5,-69C7,-76.2,21.9,-81.8,43.9,-66.9Z"
          transform="translate(100 100)"
        />
      </svg>

      <svg
        className="absolute -bottom-24 -right-24 w-[520px] h-[520px] opacity-[0.25]"
        viewBox="0 0 200 200"
      >
        <path
          fill="#A7F3D0"
          d="M39.6,-60.3C51.8,-51.3,62.8,-41.7,73.1,-28.9C83.5,-16.1,93.2,-0.1,92.7,15.9C92.1,32,81.3,48.2,66.7,61.2C52.1,74.2,33.6,83.9,14.3,87.6C-5,91.3,-25.2,89,-40.1,79.2C-55,69.4,-64.5,52.2,-70.9,36.1C-77.2,20,-80.3,5.1,-78.2,-10.3C-76.1,-25.6,-68.8,-41.3,-56.8,-50.8C-44.9,-60.3,-28.4,-63.4,-12.9,-64.3C2.6,-65.3,18.1,-64.1,39.6,-60.3Z"
          transform="translate(100 100)"
        />
      </svg>
    </div>
  );
}

export default function AddChildPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [pendingChild, setPendingChild] = useState<PendingChild | null>(null);
  const [linking, setLinking] = useState(false);

  const [linkedCount, setLinkedCount] = useState<number>(0);
  const [loadingLinkedCount, setLoadingLinkedCount] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      if (authLoading) return;
      if (!user) {
        router.replace("/login?redirect=" + encodeURIComponent("/parent/add-child"));
        return;
      }
      setLoadingLinkedCount(true);
      try {
        const kids = await getChildrenForParent(user.uid);
        setLinkedCount(kids.length);
      } finally {
        setLoadingLinkedCount(false);
      }
    })();
  }, [authLoading, user, router]);

  const { register, handleSubmit, formState: { errors }, reset } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const email = values.childEmail.trim().toLowerCase();
    const student = await getStudentByEmail(email);
    if (!student) {
      alert("No student found with that email.");
      setPendingChild(null);
      return;
    }

    const name =
      (student as any).fullName ||
      (student as any).displayName ||
      student.email ||
      "Student";

    setPendingChild({
      uid: student.uid,
      name,
      className: (student as any).className,
    });
  }

  async function confirmLink() {
    if (!user || !pendingChild) return;
    setLinking(true);
    try {
      await linkParentToChild(user.uid, pendingChild.uid);
      setLinkedCount((c) => (c > 0 ? c : 1));

      const addMore = window.confirm("Child linked successfully. Do you want to add another?");
      if (addMore) {
        setPendingChild(null);
        reset({ childEmail: "" });
      } else {
        router.push("/parent/dashboard");
      }
    } finally {
      setLinking(false);
    }
  }

  if (authLoading || !user || loadingLinkedCount) {
    return <div className="p-6 text-center text-slate-700 animate-pulse">Loading…</div>;
  }

  const goToDashboardDisabled = linkedCount === 0;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <PlayfulBackdrop />

      <Card className="w-full max-w-md p-6 rounded-3xl bg-white/70 backdrop-blur-md shadow-lg border border-white/60 space-y-4">
        <CardHeader>
          <CardTitle className="text-2xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-indigo-400 to-emerald-400">
            Add Child Details 👨‍👩‍👧
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {!pendingChild && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="childEmail" className="font-medium text-slate-700">
                  Child’s Email
                </Label>
                <Input
                  id="childEmail"
                  placeholder="student@example.com"
                  className="rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300"
                  {...register("childEmail")}
                />
                {errors.childEmail && (
                  <p className="text-sm text-rose-600">{errors.childEmail.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-rose-400 via-indigo-400 to-emerald-400 text-white font-semibold hover:shadow-md transition"
              >
                Fetch Student ✨
              </Button>
            </form>
          )}

          {pendingChild && (
            <div className="space-y-5 text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-pink-50 to-emerald-50 border border-white shadow-inner">
                <p className="text-lg font-semibold text-slate-800">
                  {pendingChild.name}
                </p>
                <p className="text-slate-600">
                  Class: {pendingChild.className ?? "—"}
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <Button
                  onClick={confirmLink}
                  disabled={linking}
                  className="rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 text-white font-medium px-6 hover:shadow"
                >
                  {linking ? "Linking..." : "OK"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPendingChild(null)}
                  className="rounded-full border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                >
                  Change Email
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between w-full max-w-md text-sm text-slate-700">
        <p>
          {goToDashboardDisabled
            ? "No child linked yet — link a child to enable the dashboard."
            : "You have linked child account(s). You can go to the dashboard."}
        </p>
        <Button
          onClick={() => router.push("/parent/dashboard")}
          disabled={goToDashboardDisabled}
          className={`rounded-full px-5 py-2 ${
            goToDashboardDisabled
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-rose-400 via-indigo-400 to-emerald-400 text-white hover:shadow"
          }`}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
