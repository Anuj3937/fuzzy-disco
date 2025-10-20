"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getChildrenForParent } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function ParentEntry() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Watch auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Decide where to go
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=" + encodeURIComponent("/parent"));
      return;
    }
    (async () => {
      const kids = await getChildrenForParent(user.uid);
      if (kids.length === 0) router.replace("/parent/add-child");
      else router.replace("/parent/dashboard");
    })();
  }, [loading, user, router]);

  return <div className="p-6">Loading…</div>;
}
