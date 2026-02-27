"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { loadState, completeLesson, getLessonProgress } from "@/lib/store";
import { LESSON_TYPE_CONFIG } from "@/lib/config";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import type {
  Lesson,
  FlashcardContent,
  QuizContent,
  FillBlankContent,
  WritingContent,
  SpeechContent,
  ReadingContent,
  ListeningContent,
} from "@/types/curriculum";
import type {
  WorkerMessage,
  LoadModelMessage,
  GenerateAudioMessage,
  WorkerResponse,
  ProgressMessage,
  ModelReadyMessage,
  AudioReadyMessage,
  ErrorMessage,
} from "@/workers/worker";

import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Volume2,
  Loader2,
  Shuffle,
  List,
  SpellCheck,
  Play,
  Gauge,
} from "lucide-react";
import { dispatchStateUpdate } from "@/components/AppLayout";

// ── Whisper loader ───────────────────────────────────────
async function loadWhisperModel(
  setModelLoading: (loading: boolean) => void,
  setModelProgress: (progress: number) => void,
  pipelineRef: React.MutableRefObject<any>,
) {
  if (typeof window === "undefined") return null;
  if (pipelineRef.current) return pipelineRef.current;
  setModelLoading(true);
  setModelProgress(0);
  try {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    const whisper = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-base",
      {
        dtype: "q8",
        progress_callback: (progress: any) => {
          if (progress.status === "progress" && progress.progress)
            setModelProgress(Math.round(progress.progress));
        },
      },
    );
    pipelineRef.current = whisper;
    setModelLoading(false);
    return whisper;
  } catch (error) {
    console.error("Failed to load Whisper model:", error);
    setModelLoading(false);
    throw error;
  }
}

// ── Kokoro loader ────────────────────────────────────────
async function loadKokoroModel(
  setModelLoading: (loading: boolean) => void,
  setModelProgress: (progress: number) => void,
  kokoroRef: React.MutableRefObject<any>,
) {
  if (typeof window === "undefined") return null;
  if (kokoroRef.current) return kokoroRef.current;
  setModelLoading(true);
  setModelProgress(0);
  try {
    const kokoroJs = await import("kokoro-js");
    kokoroJs.env.allowLocalModels = false;
    kokoroJs.env.useBrowserCache = true;
    const kokoro = await kokoroJs.KokoroTTS.from_pretrained(
      "onnx-community/Kokoro-82M-v1.0-ONNX",
      {
        dtype: "q8",
        device: "wasm",
        progress_callback: (progress: any) => {
          if (progress.status === "progress" && progress.progress)
            setModelProgress(Math.round(progress.progress));
        },
      },
    );
    kokoroRef.current = kokoro;
    setModelLoading(false);
    return kokoro;
  } catch (error) {
    console.error("Failed to load Kokoro model:", error);
    setModelLoading(false);
    throw error;
  }
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25] as const;
type Speed = (typeof SPEED_OPTIONS)[number];

export default function LessonPage() {
  const router = useRouter();
  const { curriculumId, lessonId } = useParams<{
    curriculumId: string;
    lessonId: string;
  }>();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currTitle, setCurrTitle] = useState("");
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [alreadyComplete, setAlreadyComplete] = useState(false);

  // Flashcard state
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCardOrder, setShuffledCardOrder] = useState<number[]>([]);

  // Quiz / Reading state
  const [qIdx, setQIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Fill blank state
  const [fbIdx, setFbIdx] = useState(0);
  const [fbSelected, setFbSelected] = useState<string | null>(null);
  const [fbShowExp, setFbShowExp] = useState(false);

  // Writing state
  const [writingText, setWritingText] = useState("");
  const [grammarErrors, setGrammarErrors] = useState<any[]>([]);
  const [grammarChecking, setGrammarChecking] = useState(false);
  const [grammarChecked, setGrammarChecked] = useState(false);
  const [lastCheckedText, setLastCheckedText] = useState("");
  const [textModified, setTextModified] = useState(false);

  // Speech state
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);
  const [allTranscripts, setAllTranscripts] = useState<string>("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [micStatus, setMicStatus] = useState<
    "idle" | "initializing" | "ready" | "recording" | "error"
  >("idle");
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    "idle" | "processing" | "done" | "error"
  >("idle");

  // Whisper model state
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [showFirstTimeMessage, setShowFirstTimeMessage] = useState(false);

  // Kokoro / Listening state
  const [kokoroLoading, setKokoroLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [kokoroProgress, setKokoroProgress] = useState(0);
  const [showKokoroFirstTimeMessage, setShowKokoroFirstTimeMessage] =
    useState(false);
  const [listeningAudioUrl, setListeningAudioUrl] = useState<string | null>(
    null,
  );
  const [audioGenerating, setAudioGenerating] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [playSpeed, setPlaySpeed] = useState<Speed>(1.0);
  const [hasListened, setHasListened] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const whisperPipelineRef = useRef<any>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const kokoroWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const s = loadState();
    const curr = s.curriculums.find((c) => c.id === curriculumId);
    if (!curr) return;
    setCurrTitle(curr.title);
    const found = curr.modules
      .flatMap((m) => m.units.flatMap((u) => u.lessons))
      .find((l) => l.id === lessonId);
    if (found) setLesson(found);
    const p = getLessonProgress(curriculumId, lessonId);
    if (p?.completed) setAlreadyComplete(true);
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("whisper_model_loaded"))
        setShowFirstTimeMessage(true);
      if (!localStorage.getItem("kokoro_model_loaded"))
        setShowKokoroFirstTimeMessage(true);
    }
  }, [curriculumId, lessonId]);

  // Pre-generate audio as soon as lesson loads (using Web Worker)
  useEffect(() => {
    if (!lesson || lesson.type !== "listening") return;

    const content = lesson.content as ListeningContent;

    if (typeof window === "undefined") return;

    // Skip if worker already initialized (prevent double initialization)
    if (kokoroWorkerRef.current) return;

    const worker = new Worker(
      new URL("@/workers/kokoro.worker.ts", import.meta.url),
      { type: "module" },
    );
    kokoroWorkerRef.current = worker;
    setAudioGenerating(true);

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const response = e.data;

      if (response.type === "MODEL_READY") {
        setWorkerReady(true);
        setIsModelLoading(false);
        setKokoroLoading(false);
        setAudioGenerating(true);

        const generateMsg: GenerateAudioMessage = {
          type: "GENERATE_AUDIO",
          text: content.text,
          voice: content.voice || "af_heart",
        };
        worker.postMessage(generateMsg);
      } else if (response.type === "PROGRESS") {
        setKokoroProgress(response.progress);
        setGenerationProgress(response.progress);
        setGenerationMessage(response.message || "");

        if (response.status === "loading") {
          setIsModelLoading(true);
          setKokoroLoading(true);
          // Set localStorage on first loading progress (same pattern as Whisper)
          if (showKokoroFirstTimeMessage && typeof window !== "undefined") {
            localStorage.setItem("kokoro_model_loaded", "true");
            setShowKokoroFirstTimeMessage(false);
          }
        } else if (response.status === "generating") {
          setKokoroLoading(false);
        }
      } else if (response.type === "AUDIO_READY") {
        // ✅ wavBytes is already a complete WAV file — just wrap in Blob
        const blob = new Blob([response.wavBytes.buffer as ArrayBuffer], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setListeningAudioUrl(url);
        setAudioGenerating(false);
        setGenerationProgress(100);
        setGenerationMessage("Audio ready!");
      } else if (response.type === "ERROR") {
        console.error("Worker error:", response.error);
        toast(`Audio error: ${response.error}`, "error");
        setKokoroLoading(false);
        setAudioGenerating(false);
      }
    };

    setKokoroLoading(true);
    setAudioGenerating(true);
    worker.postMessage({
      type: "LOAD_MODEL",
      modelId: "onnx-community/Kokoro-82M-v1.0-ONNX",
    });
  }, [lesson]);

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      )
        mediaRecorderRef.current.stop();
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function markComplete() {
    if (!lesson) return;
    completeLesson(curriculumId, lessonId, lesson.xp);
    dispatchStateUpdate();
    toast(`+${lesson.xp} XP earned! 🎉`, "success");
    setDone(true);
  }

  if (!lesson) return null;
  const typeCfg = LESSON_TYPE_CONFIG[lesson.type];

  // ── Completed Screen ─────────────────────────────────────
  if (done) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-serif text-3xl font-bold mb-2">
              Lesson Complete!
            </h2>
            <p className="text-neutral-500 mb-2">You earned</p>
            <div className="text-4xl font-bold text-yellow-500 mb-8">
              +{lesson.xp} XP
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push(`/curriculum/${curriculumId}`)}
              >
                Back to Curriculum
              </Button>
              <Button onClick={() => router.push("/dashboard")}>
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Header ────────────────────────────────────────────────
  const Header = () => (
    <div className="border-b border-neutral-100 px-8 py-4 flex items-center gap-4 bg-white">
      <button
        onClick={() => router.push(`/curriculum/${curriculumId}`)}
        className="text-neutral-400 hover:text-neutral-700 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="flex-1">
        <div className="text-xs text-neutral-400">{currTitle}</div>
        <div className="font-semibold text-sm">{lesson.title}</div>
      </div>
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <span>{typeCfg.icon}</span>
        <span>{typeCfg.label}</span>
        <span className="text-yellow-500 font-semibold">+{lesson.xp} XP</span>
      </div>
      {alreadyComplete && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 size={14} /> Completed
        </div>
      )}
    </div>
  );

  // ── FLASHCARD ─────────────────────────────────────────────
  if (lesson.type === "flashcard") {
    const content = lesson.content as FlashcardContent;
    const cardIndex = isShuffled ? shuffledCardOrder[cardIdx] : cardIdx;
    const card = content.cards[cardIndex];
    const isLast = cardIdx === content.cards.length - 1;

    function toggleShuffle() {
      if (isShuffled) {
        setIsShuffled(false);
        setShuffledCardOrder([]);
      } else {
        const order = Array.from({ length: content.cards.length }, (_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        setIsShuffled(true);
        setShuffledCardOrder(order);
        setCardIdx(0);
        setFlipped(false);
      }
    }

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-2xl mx-auto">
          <div className="text-center text-sm text-neutral-400 mb-6">
            {cardIdx + 1} / {content.cards.length}
          </div>
          <Progress
            value={((cardIdx + 1) / content.cards.length) * 100}
            className="mb-8"
          />
          <div
            onClick={() => setFlipped(!flipped)}
            className="cursor-pointer bg-white border border-neutral-200 rounded-2xl p-10 text-center shadow-sm hover:shadow-md transition-all min-h-48 flex flex-col items-center justify-center mb-6"
          >
            {!flipped ? (
              <>
                <div className="font-serif text-3xl font-semibold text-neutral-900 mb-2">
                  {card.front}
                </div>
                <div className="text-xs text-neutral-400">Click to reveal</div>
              </>
            ) : (
              <>
                <div className="font-serif text-2xl text-neutral-700 mb-3">
                  {card.back}
                </div>
                {card.example && (
                  <div className="text-sm text-neutral-400 italic border-t border-neutral-100 pt-3 mt-2">
                    &ldquo;{card.example}&rdquo;
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-3 items-center justify-center">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setFlipped(false);
                setCardIdx(Math.max(0, cardIdx - 1));
              }}
              disabled={cardIdx === 0}
            >
              <ChevronLeft size={16} /> Previous
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFlipped(false)}
            >
              <RotateCcw size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleShuffle}
              className={isShuffled ? "text-orange-600" : ""}
            >
              {isShuffled ? <List size={16} /> : <Shuffle size={16} />}
            </Button>
            {isLast ? (
              <Button className="flex-1" onClick={markComplete}>
                Complete Lesson ✓
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={() => {
                  setFlipped(false);
                  setCardIdx(cardIdx + 1);
                }}
              >
                Next <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────
  if (lesson.type === "quiz") {
    const content = lesson.content as QuizContent;
    const q = content.questions[qIdx];
    const isLastQ = qIdx === content.questions.length - 1;

    if (step === 1) {
      const pct = Math.round((correctCount / content.questions.length) * 100);
      return (
        <AppLayout>
          <Header />
          <div className="p-8 max-w-lg mx-auto text-center">
            <div className="text-6xl mb-4">
              {pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪"}
            </div>
            <h2 className="font-serif text-3xl font-bold mb-2">
              Quiz Complete
            </h2>
            <p className="text-neutral-500 mb-6">
              {correctCount} / {content.questions.length} correct · {pct}%
            </p>
            <div className="bg-neutral-50 rounded-xl p-4 mb-8">
              <Progress value={pct} className="h-3" />
            </div>
            <Button size="lg" onClick={markComplete} className="w-full">
              Claim {lesson.xp} XP ✓
            </Button>
          </div>
        </AppLayout>
      );
    }

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Progress
              value={(qIdx / content.questions.length) * 100}
              className="flex-1"
            />
            <span className="text-sm text-neutral-400 whitespace-nowrap">
              {qIdx + 1} / {content.questions.length}
            </span>
          </div>
          <h2 className="font-serif text-2xl font-semibold mb-6">
            {q.question}
          </h2>
          <div className="space-y-3 mb-6">
            {q.options.map((opt, i) => {
              const isCorrect = q.answer === i || opt === q.answer;
              let cls =
                "border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white";
              if (showExp) {
                if (isCorrect)
                  cls = "border-green-400 bg-green-50 text-green-700";
                else if (i === selectedAns)
                  cls = "border-red-400 bg-red-50 text-red-700";
                else cls = "border-neutral-100 bg-neutral-50 text-neutral-400";
              }
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!showExp) {
                      setSelectedAns(i);
                      setShowExp(true);
                      if (isCorrect) setCorrectCount((c) => c + 1);
                    }
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {showExp && q.explanation && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 mb-4">
              💡 {q.explanation}
            </div>
          )}
          {showExp && (
            <Button
              className="w-full"
              onClick={() => {
                if (isLastQ) {
                  setStep(1);
                } else {
                  setQIdx((i) => i + 1);
                  setSelectedAns(null);
                  setShowExp(false);
                }
              }}
            >
              {isLastQ ? "See Results" : "Next Question"}{" "}
              <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </AppLayout>
    );
  }

  // ── FILL BLANK ────────────────────────────────────────────
  if (lesson.type === "fill_blank") {
    const content = lesson.content as FillBlankContent;
    const s = content.sentences[fbIdx];
    const isLastS = fbIdx === content.sentences.length - 1;

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Progress
              value={(fbIdx / content.sentences.length) * 100}
              className="flex-1"
            />
            <span className="text-sm text-neutral-400">
              {fbIdx + 1} / {content.sentences.length}
            </span>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 mb-6">
            <p className="font-serif text-xl text-neutral-700 leading-relaxed">
              {s.text.replace(
                "_____",
                fbSelected && fbShowExp ? `[${fbSelected}]` : "_____",
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(s.options ?? [s.answer]).map((opt) => {
              let cls =
                "border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white";
              if (fbShowExp) {
                if (opt === s.answer)
                  cls = "border-green-400 bg-green-50 text-green-700";
                else if (opt === fbSelected)
                  cls = "border-red-400 bg-red-50 text-red-700";
                else cls = "border-neutral-100 bg-neutral-50 text-neutral-400";
              }
              return (
                <button
                  key={opt}
                  onClick={() => {
                    if (!fbShowExp) {
                      setFbSelected(opt);
                      setFbShowExp(true);
                    }
                  }}
                  className={`px-4 py-3 rounded-xl border-2 transition-all font-medium ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {fbShowExp && s.explanation && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 mb-4">
              💡 {s.explanation}
            </div>
          )}
          {fbShowExp && (
            <Button
              className="w-full"
              onClick={() => {
                if (isLastS) {
                  markComplete();
                } else {
                  setFbIdx((i) => i + 1);
                  setFbSelected(null);
                  setFbShowExp(false);
                }
              }}
            >
              {isLastS ? "Complete Lesson ✓" : "Next"}{" "}
              <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </AppLayout>
    );
  }

  // ── WRITING ───────────────────────────────────────────────
  if (lesson.type === "writing") {
    const content = lesson.content as WritingContent;
    const wordCount = writingText.trim().split(/\s+/).filter(Boolean).length;
    const minWords = content.min_words ?? 0;

    async function checkGrammar() {
      if (!writingText.trim()) return;
      setGrammarChecking(true);
      setGrammarErrors([]);
      setGrammarChecked(false);
      setTextModified(false);
      try {
        const res = await fetch("https://api.languagetool.org/v2/check", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ text: writingText, language: "en-US" }),
        });
        const data = await res.json();
        setGrammarErrors(data.matches || []);
        setGrammarChecked(true);
        setLastCheckedText(writingText);
      } catch {
        toast(
          "Could not connect to grammar checker. Check your internet.",
          "error",
        );
      } finally {
        setGrammarChecking(false);
      }
    }

    const errorCount = grammarErrors.length;

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-2xl mx-auto">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-6">
            <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">
              Writing Prompt
            </div>
            <p className="text-neutral-700 leading-relaxed">{content.prompt}</p>
            {minWords > 0 && (
              <div className="text-xs text-neutral-400 mt-2">
                Minimum: {minWords} words
              </div>
            )}
          </div>
          <textarea
            value={writingText}
            onChange={(e) => {
              setWritingText(e.target.value);
              if (lastCheckedText)
                setTextModified(e.target.value !== lastCheckedText);
            }}
            placeholder="Start writing here..."
            className="w-full min-h-56 border border-neutral-200 rounded-xl p-4 text-neutral-700 leading-relaxed resize-y outline-none focus:border-neutral-400 transition-colors font-sans text-sm"
          />
          <div className="flex items-center justify-between mt-2 mb-4">
            <span
              className={`text-sm ${wordCount >= minWords ? "text-green-600" : "text-neutral-400"}`}
            >
              {wordCount} words {minWords > 0 && `/ ${minWords} min`}
            </span>
            <button
              onClick={checkGrammar}
              disabled={grammarChecking || !writingText.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                grammarChecking || !writingText.trim()
                  ? "border-neutral-200 text-neutral-400 cursor-not-allowed"
                  : "border-blue-200 text-blue-600 hover:bg-blue-50"
              }`}
            >
              {grammarChecking ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Checking...
                </>
              ) : (
                <>
                  <SpellCheck size={14} /> Check Grammar
                </>
              )}
            </button>
          </div>
          {grammarChecked && textModified && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600" />
              <span className="text-sm text-amber-700">
                Text modified since last check — results may be outdated
              </span>
            </div>
          )}
          {grammarChecked && errorCount > 0 && (
            <div className="mb-6 border border-amber-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {errorCount} issue{errorCount !== 1 ? "s" : ""} found
                </span>
              </div>
              <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                {grammarErrors.map((err: any, i: number) => (
                  <div key={i} className="px-4 py-3 bg-white">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono">
                        {writingText.substring(
                          err.offset,
                          err.offset + err.length,
                        ) || "—"}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {err.rule?.category?.name || "Grammar"}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700">{err.message}</p>
                    {err.replacements?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        <span className="text-xs text-neutral-400">
                          Suggestions:
                        </span>
                        {err.replacements
                          .slice(0, 3)
                          .map((r: any, j: number) => (
                            <button
                              key={j}
                              onClick={() => {
                                const before = writingText.substring(
                                  0,
                                  err.offset,
                                );
                                const after = writingText.substring(
                                  err.offset + err.length,
                                );
                                setWritingText(before + r.value + after);
                                setTextModified(true);
                              }}
                              className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 transition-colors font-medium"
                            >
                              {r.value}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {grammarChecked && errorCount === 0 && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                No grammar or spelling issues found!
              </span>
            </div>
          )}
          <Button
            className="w-full"
            disabled={minWords > 0 && wordCount < minWords}
            onClick={markComplete}
          >
            Submit & Complete ✓
          </Button>
        </div>
      </AppLayout>
    );
  }

  // ── SPEECH ────────────────────────────────────────────────
  if (lesson.type === "speech") {
    const content = lesson.content as SpeechContent;
    const keywords = content.keywords_to_use || [];

    async function toggleRecording() {
      if (recording) {
        setRecording(false);
        setMicStatus("idle");
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        )
          mediaRecorderRef.current.stop();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      } else {
        if (!whisperPipelineRef.current) {
          setModelLoading(true);
          try {
            await loadWhisperModel(
              setModelLoading,
              setModelProgress,
              whisperPipelineRef,
            );
            if (typeof window !== "undefined" && showFirstTimeMessage) {
              localStorage.setItem("whisper_model_loaded", "true");
              setShowFirstTimeMessage(false);
            }
          } catch {
            toast("Failed to load speech model. Please try again.", "error");
            return;
          }
        }
        try {
          setMicStatus("initializing");
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          streamRef.current = stream;
          setPermissionDenied(false);
          setRecording(true);
          setMicStatus("recording");
          setElapsed(0);
          setDetectedKeywords([]);
          setAllTranscripts("");

          timerRef.current = setInterval(
            () =>
              setElapsed((e) => {
                if (e >= content.duration_seconds) {
                  clearInterval(timerRef.current!);
                  timerRef.current = null;
                  setRecording(false);
                  setMicStatus("idle");
                  if (
                    mediaRecorderRef.current &&
                    mediaRecorderRef.current.state !== "inactive"
                  )
                    mediaRecorderRef.current.stop();
                  return e;
                }
                return e + 1;
              }),
            1000,
          );

          let recordedChunks: Blob[] = [];
          const mr = new MediaRecorder(stream, {
            mimeType: "audio/webm;codecs=opus",
          });
          mr.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
          };
          mr.onstop = async () => {
            if (recordedChunks.length > 0) {
              const blob = new Blob(recordedChunks, {
                type: "audio/webm;codecs=opus",
              });
              setAudioBlob(blob);
              setTranscriptionStatus("processing");
              try {
                const audioUrl = URL.createObjectURL(blob);
                const result = await whisperPipelineRef.current(audioUrl, {
                  language: "english",
                  task: "transcribe",
                });
                URL.revokeObjectURL(audioUrl);
                const transcript = result.text.trim();
                setAllTranscripts(transcript);
                setDetectedKeywords(
                  keywords.filter((kw) =>
                    transcript.toLowerCase().includes(kw.toLowerCase()),
                  ),
                );
                setTranscriptionStatus("done");
              } catch {
                setTranscriptionStatus("error");
              }
            }
            if (streamRef.current)
              streamRef.current.getTracks().forEach((t) => t.stop());
          };
          mr.start(100);
          mediaRecorderRef.current = mr;
          setMicStatus("ready");
        } catch {
          setPermissionDenied(true);
          setRecording(false);
          setMicStatus("error");
          toast(
            "Could not access microphone. Please check permissions.",
            "error",
          );
        }
      }
    }

    function playRecording() {
      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.play();
        setIsPlaying(true);
      }
    }

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-xl mx-auto">
          {permissionDenied && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertTriangle
                className="text-red-600 shrink-0 mt-0.5"
                size={20}
              />
              <div>
                <div className="text-sm font-medium text-red-800">
                  Microphone Access Denied
                </div>
                <div className="text-xs text-red-700 mt-1">
                  Please allow microphone access in your browser settings and
                  try again.
                </div>
              </div>
            </div>
          )}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-4">
            <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">
              Speaking Prompt
            </div>
            <p className="font-serif text-lg text-neutral-700 leading-relaxed">
              {content.prompt}
            </p>
            <div className="text-xs text-neutral-400 mt-2">
              {content.duration_seconds} seconds
            </div>
          </div>
          {modelLoading && showFirstTimeMessage && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-purple-600" size={20} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-purple-800">
                    First time setup — Loading speech model...
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    Downloading Whisper model (~75MB). This only happens once.
                  </div>
                  <Progress value={modelProgress} className="mt-2 h-2" />
                </div>
              </div>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <div className="text-sm text-blue-700 font-medium mb-1">
              How to complete:
            </div>
            <ol className="text-xs text-blue-600 space-y-1">
              <li>
                1. Click <strong>Start Recording</strong>
              </li>
              <li>2. Speak using the keywords shown below</li>
              <li>
                3. Click <strong>Stop Recording</strong> when done
              </li>
              <li>4. Wait for transcription to complete</li>
              <li>
                5. Click <strong>Mark as Complete</strong>
              </li>
            </ol>
            <div className="text-xs text-blue-500 mt-2 italic">
              Powered by Whisper AI — works offline after first setup.
            </div>
          </div>
          {keywords.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-widest text-neutral-400">
                  Keywords to use
                </div>
                <div className="text-xs text-neutral-500">
                  {detectedKeywords.length}/{keywords.length} detected
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => {
                  const isDetected = detectedKeywords.includes(kw);
                  return (
                    <span
                      key={kw}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all font-medium ${
                        isDetected
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-neutral-100 text-neutral-500 border-neutral-200"
                      }`}
                    >
                      {isDetected && (
                        <CheckCircle2 size={14} className="inline mr-1" />
                      )}
                      {kw}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {(allTranscripts || recording || transcriptionStatus !== "idle") && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-widest text-neutral-400">
                  {recording
                    ? "Recording..."
                    : transcriptionStatus === "processing"
                      ? "Transcribing..."
                      : "Transcript"}
                </div>
                {(recording || transcriptionStatus === "processing") && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                      transcriptionStatus === "processing"
                        ? "bg-purple-100 text-purple-700"
                        : transcriptionStatus === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {transcriptionStatus === "processing" && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    {transcriptionStatus === "processing" && "Transcribing..."}
                    {transcriptionStatus === "error" && "Error"}
                    {transcriptionStatus === "idle" && recording && "Recording"}
                  </span>
                )}
              </div>
              <p
                className={`text-sm min-h-[24px] ${allTranscripts ? "text-neutral-700" : "text-neutral-400 italic"}`}
              >
                {transcriptionStatus === "processing"
                  ? "Analyzing your speech..."
                  : allTranscripts ||
                    (recording ? "Speak now..." : "No speech detected")}
              </p>
            </div>
          )}
          <div className="text-center mb-6">
            <div className="text-5xl font-mono font-bold text-neutral-900 mb-3">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
            </div>
            <Progress
              value={(elapsed / content.duration_seconds) * 100}
              className="mb-4 h-2"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div
              className={`w-3 h-3 rounded-full ${
                micStatus === "recording"
                  ? "bg-red-500 animate-pulse"
                  : micStatus === "ready"
                    ? "bg-green-500"
                    : micStatus === "initializing"
                      ? "bg-yellow-500 animate-pulse"
                      : micStatus === "error"
                        ? "bg-red-500"
                        : "bg-neutral-300"
              }`}
            />
            <span className="text-sm text-neutral-500">
              {micStatus === "recording" && "Recording..."}
              {micStatus === "ready" && "Mic active"}
              {micStatus === "initializing" && "Initializing mic..."}
              {micStatus === "error" && "Mic error"}
              {micStatus === "idle" &&
                audioBlob &&
                !recording &&
                "Recording saved"}
              {micStatus === "idle" && !audioBlob && !recording && "Mic idle"}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={toggleRecording}
              disabled={modelLoading || transcriptionStatus === "processing"}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-semibold transition-all ${
                recording
                  ? "bg-red-50 border-red-400 text-red-600 hover:bg-red-100"
                  : modelLoading || transcriptionStatus === "processing"
                    ? "bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {modelLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Loading
                  Model...
                </>
              ) : recording ? (
                <>
                  <MicOff size={18} /> Stop Recording
                </>
              ) : (
                <>
                  <Mic size={18} /> Start Recording
                </>
              )}
            </button>
          </div>
          {audioBlob && !recording && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={playRecording}
                disabled={transcriptionStatus === "processing"}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                  transcriptionStatus === "processing"
                    ? "border-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "border-neutral-200 text-neutral-700 hover:border-neutral-400"
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause size={18} /> Pause
                  </>
                ) : (
                  <>
                    <Volume2 size={18} /> Play Recording
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setAudioBlob(null);
                  setDetectedKeywords([]);
                  setAllTranscripts("");
                  setTranscriptionStatus("idle");
                }}
                className="px-4 py-3 rounded-xl border-2 border-neutral-200 text-neutral-500 hover:border-neutral-400 transition-all"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          )}
          <Button className="w-full mt-3" onClick={markComplete}>
            Mark as Complete ✓
          </Button>
        </div>
      </AppLayout>
    );
  }

  // ── READING ───────────────────────────────────────────────
  if (lesson.type === "reading") {
    const content = lesson.content as ReadingContent;
    const isReading = step === 0;

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-2xl mx-auto">
          {isReading ? (
            <>
              <div className="prose prose-neutral max-w-none bg-white border border-neutral-200 rounded-2xl p-8 mb-6">
                <p className="font-serif text-base leading-8 text-neutral-700 whitespace-pre-wrap">
                  {content.text}
                </p>
              </div>
              <Button className="w-full" onClick={() => setStep(1)}>
                Continue to Questions <ChevronRight size={16} />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <Progress
                  value={(qIdx / content.questions.length) * 100}
                  className="flex-1"
                />
                <span className="text-sm text-neutral-400">
                  {qIdx + 1} / {content.questions.length}
                </span>
              </div>
              <h2 className="font-serif text-xl font-semibold mb-6">
                {content.questions[qIdx].question}
              </h2>
              <div className="space-y-3 mb-6">
                {content.questions[qIdx].options.map((opt, i) => {
                  const isCorrect =
                    content.questions[qIdx].answer === i ||
                    opt === content.questions[qIdx].answer;
                  let cls =
                    "border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white";
                  if (showExp) {
                    if (isCorrect)
                      cls = "border-green-400 bg-green-50 text-green-700";
                    else if (i === selectedAns)
                      cls = "border-red-400 bg-red-50 text-red-700";
                    else
                      cls = "border-neutral-100 bg-neutral-50 text-neutral-400";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (!showExp) {
                          setSelectedAns(i);
                          setShowExp(true);
                        }
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {showExp && content.questions[qIdx].explanation && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 mb-4">
                  💡 {content.questions[qIdx].explanation}
                </div>
              )}
              {showExp && (
                <Button
                  className="w-full"
                  onClick={() => {
                    if (qIdx === content.questions.length - 1) {
                      markComplete();
                    } else {
                      setQIdx((i) => i + 1);
                      setSelectedAns(null);
                      setShowExp(false);
                    }
                  }}
                >
                  {qIdx === content.questions.length - 1
                    ? "Complete Lesson ✓"
                    : "Next"}{" "}
                  <ChevronRight size={16} />
                </Button>
              )}
            </>
          )}
        </div>
      </AppLayout>
    );
  }

  // ── LISTENING ─────────────────────────────────────────────
  if (lesson.type === "listening") {
    const content = lesson.content as ListeningContent;
    const isListeningPhase = step === 0;

    function formatTime(s: number) {
      return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    }

    function playAudio() {
      if (!listeningAudioUrl) return;
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current = null;
      }

      const audio = new Audio(listeningAudioUrl);
      audio.playbackRate = playSpeed;

      audio.onloadedmetadata = () => setAudioDuration(audio.duration);
      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime);
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.onplay = () => {
        setAudioPlaying(true);
        setHasListened(true);
      };
      audio.onended = () => {
        setAudioPlaying(false);
        setAudioProgress(100);
      };
      audio.onerror = () => {
        setAudioPlaying(false);
        toast("Failed to play audio.", "error");
      };

      audioElRef.current = audio;
      audio.play();
    }

    function pauseAudio() {
      if (audioElRef.current) {
        audioElRef.current.pause();
        setAudioPlaying(false);
      }
    }

    function changeSpeed(speed: Speed) {
      setPlaySpeed(speed);
      if (audioElRef.current) audioElRef.current.playbackRate = speed;
    }

    // ── Listening Phase ──
    if (isListeningPhase) {
      return (
        <AppLayout>
          <Header />
          <div className="p-8 max-w-xl mx-auto">
            {/* First-time Kokoro download */}
            {kokoroLoading && showKokoroFirstTimeMessage && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin text-cyan-600" size={20} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-cyan-800">
                      Loading TTS model...
                    </div>
                    <div className="text-xs text-cyan-600 mt-1">
                      Downloading Kokoro model (~80MB). This only happens once.
                    </div>
                    <Progress value={kokoroProgress} className="mt-2 h-2" />
                    {generationMessage && (
                      <div className="text-xs text-cyan-700 mt-1">
                        {generationMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Hint banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
              <span className="text-xl">🎧</span>
              <p className="text-sm text-amber-800">
                Listen carefully — the passage won't be shown during questions.
              </p>
            </div>

            {/* Audio player card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-6 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-neutral-400 mb-5">
                Audio Passage
              </div>

              {/* Progress bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
                  <span>{formatTime(audioCurrentTime)}</span>
                  <span>
                    {audioDuration > 0 ? formatTime(audioDuration) : "--:--"}
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-neutral-800 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
              </div>

              {/* Big play button */}
              <div className="flex flex-col items-center gap-3 mb-5">
                <button
                  onClick={audioPlaying ? pauseAudio : playAudio}
                  disabled={audioGenerating || !listeningAudioUrl}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md ${
                    audioGenerating || !listeningAudioUrl
                      ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      : audioPlaying
                        ? "bg-neutral-800 text-white hover:bg-neutral-700"
                        : "bg-neutral-900 text-white hover:bg-neutral-700"
                  } ${!audioGenerating && listeningAudioUrl && !hasListened ? "animate-pulse" : ""}`}
                >
                  {audioGenerating ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : audioPlaying ? (
                    <Pause size={24} />
                  ) : (
                    <Play size={24} className="ml-1" />
                  )}
                </button>
                <span className="text-xs text-neutral-400">
                  {audioGenerating
                    ? generationMessage || "Preparing audio..."
                    : audioPlaying
                      ? "Playing..."
                      : hasListened
                        ? "Tap to replay"
                        : listeningAudioUrl
                          ? "Tap to listen"
                          : "Loading..."}
                </span>
              </div>

              {/* Speed control */}
              <div className="flex items-center justify-center gap-2">
                <Gauge size={13} className="text-neutral-400" />
                <span className="text-xs text-neutral-400 mr-1">Speed:</span>
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      playSpeed === s
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Replay tip */}
            {hasListened && (
              <p className="text-center text-xs text-neutral-400 mb-4">
                You can replay as many times as you need before continuing.
              </p>
            )}

            {/* Continue — locked until listened */}
            <Button
              className="w-full"
              disabled={!hasListened}
              onClick={() => {
                if (audioElRef.current) {
                  audioElRef.current.pause();
                  setAudioPlaying(false);
                }
                setStep(1);
                setQIdx(0);
                setSelectedAns(null);
                setShowExp(false);
              }}
            >
              {hasListened ? (
                <>
                  Continue to Questions <ChevronRight size={16} />
                </>
              ) : (
                "Listen to continue"
              )}
            </Button>
          </div>
        </AppLayout>
      );
    }

    // ── Questions Phase ──
    const q = content.questions[qIdx];
    const isLastQ = qIdx === content.questions.length - 1;

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Progress
              value={(qIdx / content.questions.length) * 100}
              className="flex-1"
            />
            <span className="text-sm text-neutral-400 whitespace-nowrap">
              {qIdx + 1} / {content.questions.length}
            </span>
          </div>

          {/* Question + Replay button side by side */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <h2 className="font-serif text-xl font-semibold flex-1">
              {q.question}
            </h2>
            <button
              onClick={() => {
                if (audioElRef.current) {
                  audioElRef.current.pause();
                  setAudioPlaying(false);
                }
                setStep(0);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-neutral-600 hover:border-neutral-400 text-xs font-medium shrink-0 transition-all"
            >
              <Volume2 size={13} /> Replay
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {q.options.map((opt, i) => {
              const isCorrect = q.answer === i || opt === q.answer;
              let cls =
                "border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white";
              if (showExp) {
                if (isCorrect)
                  cls = "border-green-400 bg-green-50 text-green-700";
                else if (i === selectedAns)
                  cls = "border-red-400 bg-red-50 text-red-700";
                else cls = "border-neutral-100 bg-neutral-50 text-neutral-400";
              }
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!showExp) {
                      setSelectedAns(i);
                      setShowExp(true);
                      if (isCorrect) setCorrectCount((c) => c + 1);
                    }
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {showExp && q.explanation && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 mb-4">
              💡 {q.explanation}
            </div>
          )}

          {showExp && (
            <Button
              className="w-full"
              onClick={() => {
                if (isLastQ) {
                  markComplete();
                } else {
                  setQIdx((i) => i + 1);
                  setSelectedAns(null);
                  setShowExp(false);
                }
              }}
            >
              {isLastQ ? "Complete Lesson ✓" : "Next Question"}{" "}
              <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </AppLayout>
    );
  }

  return null;
}
