'use client';

import { T } from '@/components/T'; // Added Import
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookText, PlayCircle, MessageCircle, Eye } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

// PDF.js and Helper functions (chunkText, LANGS, slug, clean, etc.) remain unchanged
function usePdfJs() {
  const pdfjs = useRef<any>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const mod = await import("pdfjs-dist/build/pdf");
      const pdfjsLib: any = mod;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      if (mounted) pdfjs.current = pdfjsLib;
    })();
    return () => { mounted = false; };
  }, []);
  return pdfjs;
}
function chunkText(text: string, maxLen = 1600) { /* ... implementation ... */
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/([.?!]|।|\n)/)
    .reduce<string[]>((acc, part, idx, arr) => {
      if (idx % 2 === 0) acc.push((part + (arr[idx + 1] || "")).trim());
      return acc;
    }, [])
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    const next = (buf ? buf + " " : "") + s;
    if (next.length > maxLen) {
      if (buf) chunks.push(buf.trim());
      if (s.length > maxLen) {
        for (let i = 0; i < s.length; i += maxLen) chunks.push(s.slice(i, i + maxLen));
        buf = "";
      } else {
        buf = s;
      }
    } else {
      buf = next;
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks;
}
const LANGS = ["Hindi","Marathi","Bengali","Tamil","English","Punjabi","Assamese"] as const;
type LangLabel = typeof LANGS[number];
const slug  = (s:string)=> s.trim().toLowerCase();
const clean = (s:string)=> s.replace(/\s+/g,"").toLowerCase();
const LISTEN_KINDS = ["Chapter", "Explanation"] as const;
type ListenKind = typeof LISTEN_KINDS[number];
async function fetchTxtOnly(url: string) { /* ... implementation ... */
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return { ok: false, status: res.status, text: "" };
        const text = await res.text();
        return { ok: true, status: 200, text: text?.trim() ?? "" };
    } catch {
        return { ok: false, status: 0, text: "" };
    }
}
async function fetchIfExists(url: string, asText=false) { /* ... implementation ... */
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return { ok:false, status: res.status as number, data: null as any };
        const data = asText ? await res.text() : await res.arrayBuffer();
        return { ok:true, status: 200, data };
    } catch {
        return { ok:false, status: 0, data: null };
    }
}
type TextSource = { kind: "txt"; url: string; text: string } | { kind: "html"; url: string; text: string };
function extractTextFromHtmlString(html: string): string { /* ... implementation ... */
    const prepared = html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n");
    const doc = new DOMParser().parseFromString(prepared, "text/html");
    const text = doc?.body?.textContent || "";
    return text.trim();
}
async function resolveTextFirstThenHtml(subject:string, language:LangLabel, chapter:string): Promise<TextSource> { /* ... implementation ... */
    const base = `/pdfs/${slug(subject)}/${slug(language)}/${clean(chapter)}`;
    const txtUrl = `${base}.txt`;
    const txtTry = await fetchIfExists(txtUrl, true);
    if (txtTry.ok) {
        const text = String(txtTry.data).trim();
        if (text) return { kind:"txt", url: txtUrl, text };
    }
    const htmlUrl = `${base}.html`;
    const htmlTry = await fetchIfExists(htmlUrl, true);
    if (htmlTry.ok) {
        const raw = String(htmlTry.data);
        const text = extractTextFromHtmlString(raw);
        if (text) return { kind:"html", url: htmlUrl, text };
    }
    const missing = [`${txtUrl}`, `${htmlUrl}`].join("\n");
    throw new Error(`Neither TXT nor HTML was found.\nTried:\n${missing}`);
}
function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> { /* ... implementation ... */
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing && existing.length > 0) return Promise.resolve(existing);
    return new Promise((resolve) => {
        const handler = () => {
        synth.onvoiceschanged = null;
        resolve(synth.getVoices());
        };
        synth.onvoiceschanged = handler;
        setTimeout(() => {
        synth.onvoiceschanged = null;
        resolve(synth.getVoices());
        }, 800);
    });
}
function pickGoogleHindiStrict(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null { /* ... implementation ... */
    return voices.find(v => /google/i.test(v.name) && /hi-IN/i.test(v.lang)) || null;
}

export default function LessonPage() {
  const router = useRouter();
  const { user } = useAuth();
  const studentClass = user?.role === "student" ? (user.className as string | undefined) : undefined;

  // Subjects & chapters definitions remain the same
  const subjects = ["Science","Maths","SSC"] as const;
  const chaptersByClass: Record<"7"|"8"|"9", Record<string,string[]>> = {
    "7": { Science:["Magnets","Methods of Seperation","Mindful Eating"], SSC:["Family","Oceans and Continents","Timeline"], Maths:["Data Handling","Symmetry","Lines and Angles"] },
    "8": { Science:["Electricity","Life Processes in Plants","Life Processes in Animals"], SSC:["Empires","Gupta Empire","Understanding Markets"], Maths:["Expressions using Letters","Fractions","Number Play"] },
    "9": { Science:["Is Matter Around Us Pure","Motion","Cell Fundamental Unit of Life"], Maths:["Number System","Polynomials","Coordinate Geometry"], SSC:["French Revolution","India Size and Location","What is Democracy Why Democracy","The Story of Village Palampur"] },
  };
  const getClassNumber = (cn?:string|null) => { /* ... implementation ... */
    if (!cn) return "9";
    const s = String(cn).trim().toLowerCase();
    const m = s.match(/(?:class|std|standard)?\s*(\d{1,2})/i);
    if (m) { const n = parseInt(m[1],10); if ([7,8,9].includes(n)) return String(n) as "7"|"8"|"9"; }
    if (/7th/.test(s)||/\bvii\b/.test(s)||/\bseven|saat\b/.test(s)) return "7";
    if (/8th/.test(s)||/\bviii\b/.test(s)||/\beight|aath\b/.test(s)) return "8";
    if (/9th/.test(s)||/\bix\b/.test(s)||/\bnine|nau\b/.test(s)) return "9";
    return "9";
  };
  const getChaptersFor = (subject:string, cn?:string|null) => chaptersByClass[getClassNumber(cn) as "7"|"8"|"9"]?.[subject] ?? [];


  // State hooks remain the same
  const [ebookSubject, setEbookSubject] = useState("");
  const [ebookChapter, setEbookChapter] = useState("");
  const [ebookLanguage, setEbookLanguage] = useState<LangLabel | "">("");
  const ebookPdf = ebookSubject && ebookChapter && ebookLanguage
    ? `/pdfs/${slug(ebookSubject)}/${slug(ebookLanguage)}/${clean(ebookChapter)}.pdf`
    : null;

  const [audioSubject, setAudioSubject] = useState("");
  const [audioChapter, setAudioChapter] = useState("");
  const [ttsLanguage, setTtsLanguage] = useState<LangLabel>("Hindi");
  const [listenKind, setListenKind] = useState<ListenKind>("Chapter");
  const [rate, setRate] = useState(1);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);
  const chunkIdxRef = useRef(0);
  const userActionRequiredRef = useRef(false);
  const pdfjs = usePdfJs();

  const [explainSubject, setExplainSubject] = useState("");
  const [explainChapter, setExplainChapter] = useState("");
  const [explainLanguage, setExplainLanguage] = useState<LangLabel | "">("");
  const [quizSubject, setQuizSubject] = useState("");
  const [quizChapter, setQuizChapter] = useState("");
  const [quizLanguage, setQuizLanguage] = useState<LangLabel | "">("");

  const explanationPdf = explainSubject && explainChapter && explainLanguage
    ? `/explanations/${slug(explainSubject)}/${slug(explainLanguage)}/${clean(explainChapter)}.txt`
    : null;

  // Effects and TTS logic remain unchanged
    useEffect(() => {
        (async () => {
        const voices = await ensureVoicesLoaded();
        voiceRef.current = pickGoogleHindiStrict(voices);
        })();
    }, []);

    useEffect(() => {
        const onVis = () => { /* ... implementation ... */
            if (document.visibilityState === "hidden") {
                if (speaking && !paused) {
                window.speechSynthesis.pause();
                setPaused(true);
                userActionRequiredRef.current = true;
                }
            } else {
                if (speaking && paused) {
                window.speechSynthesis.pause();
                }
            }
        };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, [speaking, paused]);

    useEffect(() => {
        return () => { try { window.speechSynthesis.cancel(); } catch {} };
    }, []);

    const resetPlayback = () => { /* ... implementation ... */
        window.speechSynthesis.cancel();
        currentUtterance.current = null;
        queueRef.current = [];
        chunkIdxRef.current = 0;
        setSpeaking(false);
        setPaused(false);
        userActionRequiredRef.current = false;
    };
    const speakChunks = () => { /* ... implementation ... */
        const synth = window.speechSynthesis;
        const next = () => {
            if (chunkIdxRef.current >= queueRef.current.length) {
                setSpeaking(false);
                setPaused(false);
                userActionRequiredRef.current = false;
                return;
            }
            const text = queueRef.current[chunkIdxRef.current];
            const utt = new SpeechSynthesisUtterance(text);
            currentUtterance.current = utt;

            if (voiceRef.current) utt.voice = voiceRef.current;
            utt.rate = rate;

            utt.onend = () => { if (paused) return; chunkIdxRef.current++; next(); };
            utt.onerror = () => { chunkIdxRef.current++; next(); };

            synth.speak(utt);
        };
        next();
    };
    const handlePlayAudio = async () => { /* ... implementation ... */
        resetPlayback();
        try {
            if (!audioSubject || !audioChapter) return alert("Please select a Subject and Chapter.");
            setTtsLoading(true);
            if (!voiceRef.current) {
                const voices = await ensureVoicesLoaded();
                voiceRef.current = pickGoogleHindiStrict(voices);
            }
            if (!voiceRef.current) return alert("Google हिन्दी (hi-IN) voice unavailable.");

            const basePath = listenKind === "Chapter" ? `/pdfs/${slug(audioSubject)}/${slug(ttsLanguage)}/${clean(audioChapter)}.txt` : `/explanations/${slug(audioSubject)}/${slug(ttsLanguage)}/${clean(audioChapter)}.txt`;
            const txt = await fetchTxtOnly(basePath);
            if (!txt.ok || !txt.text) return alert(`Could not load: ${basePath}`);

            const chunks = chunkText(txt.text);
            queueRef.current = chunks;
            setSpeaking(true);
            setPaused(false);
            userActionRequiredRef.current = false;
            speakChunks();
        } catch (e: any) { alert(e?.message || "Failed to start audio."); }
        finally { setTtsLoading(false); }
    };
    const handlePause = () => { /* ... implementation ... */
        if (!speaking || paused) return;
        window.speechSynthesis.pause();
        setPaused(true);
        userActionRequiredRef.current = true;
    };
    const handleResume = () => { /* ... implementation ... */
        if (!speaking || !paused || !userActionRequiredRef.current) return;
        window.speechSynthesis.resume();
        setPaused(false);
        userActionRequiredRef.current = false;
    };
    const handleStop = () => resetPlayback();

  // Firestore write helper remains the same
    const writeContentRead = async ({ kind, subject, chapter }: { kind: 'ebook' | 'explanation'; subject: string; chapter: string; }) => { /* ... implementation ... */
        if (!user?.uid) return;
        try {
            await addDoc(collection(db, 'contentReads'), {
                studentID: user.uid,
                kind,
                class: getClassNumber(studentClass),
                subject,
                chapter,
                timestamp: serverTimestamp(),
            });
        } catch (e) { console.error('Failed to log content read:', e); }
    };
    const onOpenEbook = async (e: React.MouseEvent<HTMLAnchorElement>) => { /* ... implementation ... */
        if (!ebookPdf || !ebookSubject || !ebookChapter) return;
        e.preventDefault();
        await writeContentRead({ kind: 'ebook', subject: ebookSubject, chapter: ebookChapter });
        window.open(ebookPdf, '_blank', 'noopener,noreferrer');
    };
    const onOpenExplanation = async (e: React.MouseEvent<HTMLAnchorElement>) => { /* ... implementation ... */
        if (!explanationPdf || !explainSubject || !explainChapter) return;
        e.preventDefault();
        await writeContentRead({ kind: 'explanation', subject: explainSubject, chapter: explainChapter });
        window.open(explanationPdf, '_blank', 'noopener,noreferrer');
    };


  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#ECE7FF] via-[#F6F3FF] to-[#E3F1FF] text-gray-800 overflow-hidden">
      {/* Decorative blobs & Doodles remain the same */}
      <div className="pointer-events-none absolute -top-24 -left-20 w-96 h-96 bg-[#F1EBFF] rounded-full blur-3xl opacity-60 animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[#DFF3FF] rounded-full blur-3xl opacity-60 animate-pulse delay-700" />
      <svg className="pointer-events-none absolute top-10 left-10 w-40 h-40 opacity-70" viewBox="0 0 200 200" fill="none">
        <path d="M40 100 q40 -20 80 0 q-40 20 -80 0" stroke="#B9C8FF" strokeWidth="4" fill="none" />
        <circle cx="150" cy="70" r="10" fill="#FFD7E5" />
      </svg>
      <svg className="pointer-events-none absolute bottom-20 right-20 w-52 h-52 opacity-70" viewBox="0 0 200 200" fill="none">
        <rect x="100" y="50" width="60" height="12" rx="3" fill="#FBE2A8" />
        <path d="M100 56 h60" stroke="#F6CC70" strokeWidth="2" />
        <circle cx="70" cy="130" r="14" fill="#CFE7FF" />
      </svg>

      <div className="relative z-10 p-6 max-w-6xl mx-auto w-full">
        {/* Back Button */}
        <div className="flex justify-start mb-6">
          <button
            className="px-4 py-2 bg-gradient-to-r from-[#9B87F5] to-[#7C6BF2] text-white rounded-xl hover:brightness-110"
            onClick={() => router.back()}
          >
            <T>Back</T>
          </button>
        </div>

        {/* Title */}
        <h1 className="text-3x2 sm:text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-[#6B5BBE] via-[#7C6BF2] to-[#A1B5FF] drop-shadow-sm mb-12">
          <T>Start a New Lesson</T>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* E-book */}
          <div className="relative bg-gradient-to-br from-purple-200 via-purple-100 to-purple-50 p-8 rounded-3xl shadow-lg hover:shadow-2xl transition overflow-hidden">
            <BookText className="absolute -top-10 -left-10 h-40 w-40 text-purple-300 opacity-40 rotate-12" />
            <BookText className="h-12 w-12 text-purple-600 mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-purple-700"><T>E-book</T></h2>
            <p><T>Read chapters from your subjects at your own pace.</T></p>

            <div className="mt-4 space-y-3">
              <select className="w-full p-3 border rounded-lg" value={ebookSubject} onChange={(e)=>{ setEbookSubject(e.target.value); setEbookChapter(""); setEbookLanguage(""); }}>
                <option value=""><T>Select Subject</T></option>
                {subjects.map((s)=><option key={s} value={s}>{s}</option>)}
              </select>

              {ebookSubject && (
                <select className="w-full p-3 border rounded-lg" value={ebookChapter} onChange={(e)=>{ setEbookChapter(e.target.value); setEbookLanguage(""); }}>
                  <option value=""><T>Select Chapter</T></option>
                  {getChaptersFor(ebookSubject, studentClass).map((c)=><option key={c} value={c}>{c}</option>)}
                </select>
              )}

              {ebookChapter && (
                <select className="w-full p-3 border rounded-lg" value={ebookLanguage} onChange={(e)=>setEbookLanguage(e.target.value as LangLabel)}>
                  <option value=""><T>Select Language</T></option>
                  {LANGS.map((lang)=><option key={lang} value={lang}>{lang}</option>)}
                </select>
              )}

              {ebookSubject && ebookChapter && ebookLanguage && (
                <div className="flex flex-col sm:flex-row gap-3 mt-4"> {/* Added mt-4 */}
                  <a href={ebookPdf!} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center" onClick={onOpenEbook}>
                    <T>Open E-book PDF</T>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Audio Book */}
          <div className="relative bg-gradient-to-br from-emerald-200 via-emerald-100 to-emerald-50 p-8 rounded-3xl shadow-lg hover:shadow-2xl transition overflow-hidden">
            <PlayCircle className="absolute -top-10 -left-10 h-40 w-40 text-emerald-300 opacity-40 rotate-12" />
            <div className="relative z-10">
              <PlayCircle className="h-12 w-12 text-emerald-600 mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-emerald-700"><T>Audio Book</T></h2>
              <p className="text-gray-700"><T>Listen to chapters or explanations with clear, natural speech.</T></p>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700"><T>Choose Subject</T></label>
                    <select className="w-full p-3 border rounded-lg bg-white" value={audioSubject} onChange={(e) => { setAudioSubject(e.target.value); setAudioChapter(""); }}>
                      <option value=""><T>Select</T></option>
                      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700"><T>Choose Chapter</T></label>
                    <select className="w-full p-3 border rounded-lg bg-white" value={audioChapter} onChange={(e) => setAudioChapter(e.target.value)} disabled={!audioSubject}>
                      <option value="">{audioSubject ? <T>Select</T> : <T>Select Subject first</T>}</option>
                      {audioSubject && getChaptersFor(audioSubject, studentClass).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {audioChapter && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700"><T>Choose Language</T></label>
                      <select className="w-full p-3 border rounded-lg bg-white" value={ttsLanguage} onChange={(e) => setTtsLanguage(e.target.value as LangLabel)}>
                        {LANGS.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700"><T>What to listen</T></label>
                      <select className="w-full p-3 border rounded-lg bg-white" value={listenKind} onChange={(e) => setListenKind(e.target.value as ListenKind)}>
                        {LISTEN_KINDS.map((k) => <option key={k} value={k}><T>{k}</T></option>)} {/* Wrapped Chapter/Explanation */}
                      </select>
                    </div>
                  </div>
                )}

                {audioChapter && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700"><T>Rate:</T> {rate.toFixed(2)}</label>
                      <input type="range" min={0.5} max={1.5} step={0.05} value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} className="w-full accent-emerald-600"/>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button onClick={handlePlayAudio} disabled={ttsLoading || !audioSubject || !audioChapter} className={`px-6 py-2.5 rounded-xl text-white shadow-sm transition ${ttsLoading || !audioSubject || !audioChapter ? "bg-emerald-300 cursor-not-allowed" : "bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-600 hover:brightness-110"}`}>
                    {ttsLoading ? <T>Preparing…</T> : <T>▶️ Play Audio</T>}
                  </button>
                  <button onClick={handlePause} disabled={!speaking || paused} className="px-6 py-2.5 rounded-xl border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition"><T>⏸ Pause</T></button>
                  <button onClick={handleResume} disabled={!speaking || !paused} className="px-6 py-2.5 rounded-xl border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition"><T>▶️ Resume</T></button>
                  <button onClick={handleStop} disabled={!speaking} className="px-6 py-2.5 rounded-xl border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition"><T>⏹ Stop</T></button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  <T>Tip: If you switch tabs, playback auto-pauses and will only continue when you press</T> <strong><T>Resume</T></strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Chapter Explanation */}
          <div className="relative bg-gradient-to-br from-pink-200 via-pink-100 to-pink-50 p-8 rounded-3xl shadow-lg hover:shadow-2xl transition overflow-hidden">
            <MessageCircle className="absolute -bottom-10 -left-10 h-40 w-40 text-pink-300 opacity-40 rotate-12" />
            <MessageCircle className="h-12 w-12 text-pink-600 mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-pink-700"><T>Chapter Explanation</T></h2>
            <p><T>Get simplified summaries and notes generated by AI.</T></p>
            <div className="mt-4 space-y-3">
              <select className="w-full p-3 border rounded-lg" value={explainSubject} onChange={(e)=>{ setExplainSubject(e.target.value); setExplainChapter(""); setExplainLanguage(""); }}>
                <option value=""><T>Select Subject</T></option>
                {subjects.map((s)=><option key={s} value={s}>{s}</option>)}
              </select>
              {explainSubject && (
                <select className="w-full p-3 border rounded-lg" value={explainChapter} onChange={(e)=>{ setExplainChapter(e.target.value); setExplainLanguage(""); }}>
                  <option value=""><T>Select Chapter</T></option>
                  {getChaptersFor(explainSubject, studentClass).map((c)=><option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {explainSubject && explainChapter && (
                <select className="w-full p-3 border rounded-lg" value={explainLanguage} onChange={(e)=>setExplainLanguage(e.target.value as LangLabel)}>
                  <option value=""><T>Select Language</T></option>
                  {LANGS.map((lang)=><option key={lang} value={lang}>{lang}</option>)}
                </select>
              )}
              {explainSubject && explainChapter && explainLanguage && (
                <a href={explanationPdf!} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition" onClick={onOpenExplanation}>
                  <T>Open Explanation</T>
                </a>
              )}
            </div>
          </div>

          {/* Personalized Quiz */}
          <div className="relative bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-50 p-8 rounded-3xl shadow-lg hover:shadow-2xl transition overflow-hidden">
            <Eye className="absolute -bottom-10 -right-10 h-40 w-40 text-yellow-300 opacity-40 rotate-12" />
            <Eye className="h-12 w-12 text-yellow-600 mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-yellow-700"><T>Personalized Quiz</T></h2>
            <p><T>Test your understanding with AI-generated quizzes.</T></p>
            <div className="mt-4 space-y-3">
              <select className="w-full p-3 border rounded-lg" value={quizSubject} onChange={(e)=>{ setQuizSubject(e.target.value); setQuizChapter(""); setQuizLanguage(""); }}>
                <option value=""><T>Select Subject</T></option>
                {subjects.map((s)=><option key={s} value={s}>{s}</option>)}
              </select>
              {quizSubject && (
                <select className="w-full p-3 border rounded-lg" value={quizChapter} onChange={(e)=>setQuizChapter(e.target.value)}>
                  <option value=""><T>Select Chapter</T></option>
                  {getChaptersFor(quizSubject, studentClass).map((c)=><option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {quizSubject && quizChapter && (
                <select className="w-full p-3 border rounded-lg" value={quizLanguage} onChange={(e)=>setQuizLanguage(e.target.value as LangLabel)}>
                  <option value=""><T>Select Language</T></option>
                  {LANGS.map((lang)=><option key={lang} value={lang}>{lang}</option>)}
                </select>
              )}
              {quizSubject && quizChapter && quizLanguage && (
                <button onClick={() => router.push(`/student/quiz?subject=${encodeURIComponent(quizSubject)}&chapter=${encodeURIComponent(quizChapter)}&language=${encodeURIComponent(quizLanguage)}`)} className="mt-4 inline-block px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
                  <T>Start Quiz</T>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}