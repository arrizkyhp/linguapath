"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { loadState, completeLesson, getLessonProgress, setLastLesson } from "@/lib/store";
import { LESSON_TYPE_CONFIG } from "@/lib/config";
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
  ItemPerformance,
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
  Sparkles,
} from "lucide-react";
import { dispatchStateUpdate } from "@/components/AppLayout";
import { cn } from "@/lib/utils";

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

// ── Constants for Whisper chunking ───────────────────────
const WHISPER_CHUNK_LENGTH_S = 25;
const WHISPER_STRIDE_LENGTH_S = 2;

// ── Whisper helper for chunked transcription ─────────────
async function transcribeWithChunking(
  audioUrl: string,
  pipeline: any,
): Promise<string> {
  try {
    const result = await pipeline(audioUrl, {
      language: "english",
      task: "transcribe",
      chunk_length_s: WHISPER_CHUNK_LENGTH_S,
      stride_length_s: WHISPER_STRIDE_LENGTH_S,
    });
    return result.text.trim();
  } finally {
    URL.revokeObjectURL(audioUrl);
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
  const [difficultCardIndices, setDifficultCardIndices] = useState<number[]>([]);

  // Quiz / Reading state
  const [qIdx, setQIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectQuestionIndices, setIncorrectQuestionIndices] = useState<number[]>([]);

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
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedFeedback, setPastedFeedback] = useState("");
  const [selectedAISource, setSelectedAISource] = useState("auto");
  const [parsedFeedback, setParsedFeedback] = useState<{
    naturalnessScore: number;
    overallFeedback: string;
    errors: Array<{
      text: string;
      suggestion: string;
      explanation: string;
    }>;
    improvedVersion: string;
    detectedFormat?: string;
  } | null>(null);
  const [parseError, setParseError] = useState("");
  const [showRawFeedback, setShowRawFeedback] = useState(false);
  const [feedbackSidebarOpen, setFeedbackSidebarOpen] = useState(false);

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
    let foundLesson: Lesson | null = null;
    let foundModuleId: string | null = null;
    let foundUnitId: string | null = null;
    for (const m of curr.modules) {
      for (const u of m.units) {
        const l = u.lessons.find((lesson) => lesson.id === lessonId);
        if (l) {
          foundLesson = l;
          foundModuleId = m.id;
          foundUnitId = u.id;
          break;
        }
      }
      if (foundLesson) break;
    }
    if (foundLesson) {
      setLesson(foundLesson);
      setLastLesson(curriculumId, foundModuleId!, foundUnitId!, lessonId);
    }
    const p = getLessonProgress(curriculumId, lessonId);
    if (p?.completed) setAlreadyComplete(true);
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("whisper_model_loaded"))
        setShowFirstTimeMessage(true);
      if (!localStorage.getItem("kokoro_model_loaded"))
        setShowKokoroFirstTimeMessage(true);
      if (lesson?.type === "writing" && parsedFeedback) {
        const saved = localStorage.getItem("feedback-sidebar-open");
        setFeedbackSidebarOpen(saved !== "false");
      }
    }
  }, [curriculumId, lessonId]);
  
  useEffect(() => {
    if (lesson?.type === "writing" && parsedFeedback) {
      localStorage.setItem("feedback-sidebar-open", String(feedbackSidebarOpen));
    }
  }, [feedbackSidebarOpen, lesson, parsedFeedback]);

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

  useEffect(() => {
    if (done) {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'],
      });
    }
  }, [done]);

  function markComplete() {
    if (!lesson) return;
    
    let itemPerformance: ItemPerformance[] | undefined;
    
    if (lesson.type === "quiz" || lesson.type === "reading" || lesson.type === "listening") {
      const content = lesson.content as QuizContent | ReadingContent | ListeningContent;
      const questions = 'questions' in content ? content.questions : [];
      itemPerformance = questions.map((_, i) => ({
        itemIndex: i,
        itemType: 'question' as const,
        correct: !incorrectQuestionIndices.includes(i),
      }));
    } else if (lesson.type === "fill_blank") {
      const content = lesson.content as FillBlankContent;
      itemPerformance = content.sentences.map((_, i) => ({
        itemIndex: i,
        itemType: 'sentence' as const,
        correct: !incorrectQuestionIndices.includes(i),
      }));
    } else if (lesson.type === "flashcard") {
      const content = lesson.content as FlashcardContent;
      itemPerformance = content.cards.map((_, i) => ({
        itemIndex: i,
        itemType: 'card' as const,
        correct: !difficultCardIndices.includes(i),
      }));
    }
    
    completeLesson(curriculumId, lessonId, lesson.xp, itemPerformance);
    dispatchStateUpdate();
    toast(`+${lesson.xp} XP earned! 🎉`, "success");
    setDone(true);
  }

  if (!lesson) return null;
  const typeCfg = LESSON_TYPE_CONFIG[lesson.type];

  // ── Completed Screen ─────────────────────────────────────
  if (done) {
    const replayConfetti = () => {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'],
      });
    };

    return (
      <>
        <div className="p-8 flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4 relative">
              <span className="relative z-10">🎉</span>
            </div>
            <h2 className="font-serif text-3xl font-bold mb-2">
              Lesson Complete!
            </h2>
            <p className="text-neutral-500 mb-2">You earned</p>
            <div className="text-4xl font-bold text-yellow-500 mb-8">
              +{lesson.xp} XP
            </div>
            <button
              onClick={replayConfetti}
              className="text-2xl mb-4 hover:scale-125 transition-transform inline-block"
              title="Play confetti again"
            >
              🎆
            </button>
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
      </>
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
      <>
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
              <>
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={() => {
                    setDifficultCardIndices(prev => [...prev, cardIndex]);
                    setFlipped(false);
                    setCardIdx(cardIdx + 1);
                  }}
                >
                  Don't Know
                </Button>
                <Button
                  className="flex-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300"
                  onClick={() => {
                    setFlipped(false);
                    setCardIdx(cardIdx + 1);
                  }}
                >
                  Know It ✓
                </Button>
              </>
            )}
          </div>
        </div>
      </>
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
        <>
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
        </>
      );
    }

    return (
      <>
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
                      if (isCorrect) {
                        setCorrectCount((c) => c + 1);
                      } else {
                        setIncorrectQuestionIndices(prev => [...prev, qIdx]);
                      }
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
      </>
    );
  }

  // ── FILL BLANK ────────────────────────────────────────────
  if (lesson.type === "fill_blank") {
    const content = lesson.content as FillBlankContent;
    const s = content.sentences[fbIdx];
    const isLastS = fbIdx === content.sentences.length - 1;

    return (
      <>
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
                      if (opt !== s.answer) {
                        setIncorrectQuestionIndices(prev => [...prev, fbIdx]);
                      }
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
      </>
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

    function copyPromptForAI() {
      if (!writingText.trim()) return;
      
      const state = loadState();
      const prompt = `You are an English learning assistant for Linguapath. Please analyze this student's writing:

**Student's CEFR Level**: ${state.current_level}
**Writing Task**: ${content.prompt}
**Minimum Words**: ${content.min_words || "not specified"}

**Student's Answer**:
${writingText}

Please provide:
1. **Naturalness Score** (1-5 stars)
2. **Overall Feedback** - Encouraging summary with 2-3 key improvement areas
3. **Specific Errors** - List mistakes with:
   - Original text snippet
   - Suggested correction  
   - Brief explanation of what's wrong
4. **Improved Version** - A rewritten version that maintains the original meaning but sounds more natural

Be encouraging and educational. Focus on clarity and naturalness for language learners at this level.`;

      navigator.clipboard.writeText(prompt);
      setPromptCopied(true);
      toast("Prompt copied! Paste into Gemini, Claude, or ChatGPT", "success");
    }

    function parseFeedback() {
      const text = pastedFeedback.trim();
      
      if (!text) {
        setParseError("Please paste some feedback first");
        return;
      }

      let detectedFormat = "";
      let formatScore = 0;

      // Extract naturalness score (multiple patterns)
      let score = 0;
      const scorePatterns = [
        /Naturalness Score[:\s⭐]*([1-5])/i,
        /Score[:\s]*([1-5])[:\s]/i,
        /([1-5])[:\s⭐]*\/5/i,
        /Naturalness Score:\s*\*\*([1-5])\s*\/\s*5/i,
      ];
      
      for (const pattern of scorePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          score = parseInt(match[1]);
          break;
        }
      }

      // Extract overall feedback
      let overall = "";
      const overallPatterns = [
        /Overall Feedback[:\s]*([\s\S]*?)(?:Specific Errors|❌ Errors|📝 Specific Errors|🔍 Specific Errors|$)/i,
        /💬 Overall Feedback[:\s]*([\s\S]*?)(?:🔍|##\s*\[|$)/i,
        /🌼\s*\*\*Overall Feedback\*\*[:\s]*([\s\S]*?)(?:🔎|##\s*\[|$)/i,
      ];
      
      for (const pattern of overallPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          overall = match[1].trim().replace(/\n+/g, ' ').replace(/\*\*/g, '');
          break;
        }
      }

      // Extract improved version (look for various patterns)
      let improved = "";
      const improvedPatterns = [
        /Improved Version[:\s]*([\s\S]*?)$/i,
        /✅ Improved Version[:\s]*([\s\S]*?)$/i,
        /✨ Improved Version[:\s]*([\s\S]*?)$/i,
        /Rewritten Version[:\s]*([\s\S]*?)$/i,
        /Better Version[:\s]*([\s\S]*?)$/i,
        /##\s*\d+\.?\s*✨?\s*\*\*?Improved Version\*\*?[:\s]*([\s\S]*?)(?:##|$)/i,
      ];
      
      for (const pattern of improvedPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          improved = match[1].trim().replace(/^>\s*/gm, '').replace(/^-+\s*/gm, '');
          break;
        }
      }

      // Extract errors using multiple patterns - COMBINE ALL MATCHES
      const errors: Array<{ text: string; suggestion: string; explanation: string }> = [];
      
      // If user selected Claude, try table pattern FIRST
      if (selectedAISource === "claude") {
        // Pattern: Markdown table format (Claude style) - FIXED to handle asterisks
        // | # | *"original"* | *"suggestion"* | explanation |
        const tablePattern = /\|\s*\d+\s*\|\s*\*?_?["']?([^|"*'\n_]+)["']?\*?_?\s*\|\s*\*?_?["']?([^|"*'\n_]+)["']?\*?_?\s*\|\s*([^|\n]+)\|/g;
        let match;
        while ((match = tablePattern.exec(text)) !== null) {
          const text_content = match[1].trim().replace(/^["']|["']$/g, '').replace(/^\*|\*$/g, '').replace(/^_+_$/g, '');
          const suggestion = match[2].trim().replace(/^["']|["']$/g, '').replace(/^\*|\*$/g, '').replace(/^_+_$/g, '');
          const explanation = match[3].trim();
          
          if (text_content && suggestion && !errors.find(e => e.text === text_content)) {
            errors.push({
              text: text_content,
              suggestion: suggestion,
              explanation: explanation
            });
            formatScore += 10;
            detectedFormat = "Claude (table format)";
          }
        }
        
        if (errors.length === 0) {
          setParseError("Claude table format not detected. Make sure to copy the entire table including the header row and all columns. The table should look like: | # | Original | Correction | Explanation |");
          return;
        }
      }
      
      // If user selected ChatGPT, try label patterns FIRST
      if (selectedAISource === "chatgpt") {
        // Pattern: Numbered labels (ChatGPT style)
        const numberedLabelPattern = /\*\*\d+\.\s*Original[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Correction[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Explanation[:\s]*\*\*\s*([^\n]+)/gi;
        let match;
        while ((match = numberedLabelPattern.exec(text)) !== null) {
          const text_content = match[1].trim().replace(/^["']|["']$/g, '');
          const suggestion = match[2].trim().replace(/^["']|["']$/g, '');
          const explanation = match[3].trim();
          
          if (!errors.find(e => e.text === text_content)) {
            errors.push({
              text: text_content,
              suggestion: suggestion,
              explanation: explanation
            });
            formatScore += 10;
            detectedFormat = "ChatGPT (numbered labels)";
          }
        }
        
        // Pattern: Label-based (ChatGPT style)
        const labelPattern = /\*\*Original[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Correction[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Explanation[:\s]*\*\*\s*([^\n]+)/gi;
        while ((match = labelPattern.exec(text)) !== null) {
          const text_content = match[1].trim().replace(/^["']|["']$/g, '');
          const suggestion = match[2].trim().replace(/^["']|["']$/g, '');
          const explanation = match[3].trim().replace(/^["']|["']$/g, '');
          
          if (!errors.find(e => e.text === text_content)) {
            errors.push({
              text: text_content,
              suggestion: suggestion,
              explanation: explanation
            });
            formatScore += 10;
            detectedFormat = "ChatGPT (structured labels)";
          }
        }
        
        if (errors.length === 0) {
          setParseError("ChatGPT format not detected. Make sure the response includes **Original:**, **Correction:**, and **Explanation:** sections.");
          return;
        }
      }
      
      // For auto-detect or if no errors yet, try all patterns
      if (selectedAISource === "auto" || errors.length === 0) {
        // Pattern 1: "text" → "suggestion" - explanation (arrow format)
        const errorPattern1 = /["'](.*?)["']\s*→\s*["'](.*?)["']\s*(?:-?\s*(.*?))(?=["']|$)/g;
        let match;
        while ((match = errorPattern1.exec(text)) !== null) {
          errors.push({
            text: match[1].trim(),
            suggestion: match[2].trim(),
            explanation: match[3]?.trim().replace(/^-\s*/, '') || ""
          });
          formatScore += 10;
        }

        // Pattern 2: Markdown table format (Claude style) - FIXED to handle asterisks
        const tablePattern = /\|\s*\d+\s*\|\s*\*?_?["']?([^|"*'\n_]+)["']?\*?_?\s*\|\s*\*?_?["']?([^|"*'\n_]+)["']?\*?_?\s*\|\s*([^|\n]+)\|/g;
        while ((match = tablePattern.exec(text)) !== null) {
          const text_content = match[1].trim().replace(/^["']|["']$/g, '').replace(/^\*|\*$/g, '').replace(/^_+_$/g, '');
          const suggestion = match[2].trim().replace(/^["']|["']$/g, '').replace(/^\*|\*$/g, '').replace(/^_+_$/g, '');
          const explanation = match[3].trim();
          
          if (text_content && suggestion && !errors.find(e => e.text === text_content)) {
            errors.push({
              text: text_content,
              suggestion: suggestion,
              explanation: explanation
            });
            formatScore += 10;
            if (!detectedFormat) detectedFormat = "Claude (table format)";
          }
        }

        // Pattern 3: **text** -> **suggestion** (bold arrow format)
        const errorPattern2 = /\*\*(.*?)\*\*\s*->\s*\*\*(.*?)\*\*/g;
        while ((match = errorPattern2.exec(text)) !== null) {
          errors.push({
            text: match[1],
            suggestion: match[2],
            explanation: ""
          });
        }

        // Pattern 4: "text" should be "suggestion"
        const errorPattern3 = /["'](.*?)["']\s+should be\s+["'](.*?)["']/gi;
        while ((match = errorPattern3.exec(text)) !== null) {
          errors.push({
            text: match[1],
            suggestion: match[2],
            explanation: ""
          });
        }

        // Pattern 5: Label-based format (ChatGPT style)
        const labelPattern = /\*\*Original[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Correction[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Explanation[:\s]*\*\*\s*([^\n]+)/gi;
        while ((match = labelPattern.exec(text)) !== null) {
          const text_content = match[1].trim().replace(/^["']|["']$/g, '');
          const suggestion = match[2].trim().replace(/^["']|["']$/g, '');
          const explanation = match[3].trim().replace(/^["']|["']$/g, '');
          
          if (!errors.find(e => e.text === text_content)) {
            errors.push({
              text: text_content,
              suggestion: suggestion,
              explanation: explanation
            });
            formatScore += 10;
            if (!detectedFormat) detectedFormat = "ChatGPT (structured labels)";
          }
        }

        // Pattern 6: Numbered list with Original/Correction/Explanation
        const numberedLabelPattern = /\*\*\d+\.\s*Original[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Correction[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Explanation[:\s]*\*\*\s*([^\n]+)/gi;
        while ((match = numberedLabelPattern.exec(text)) !== null) {
          const text_content = match[1].trim().replace(/^["']|["']$/g, '');
          const suggestion = match[2].trim().replace(/^["']|["']$/g, '');
          const explanation = match[3].trim();
          
          if (!errors.find(e => e.text === text_content)) {
            errors.push({
              text: text_content,
              suggestion: suggestion,
              explanation: explanation
            });
            formatScore += 10;
            if (!detectedFormat) detectedFormat = "ChatGPT (numbered labels)";
          }
        }
      }

      // Determine format based on patterns found
      if (!detectedFormat && errors.length > 0) {
        detectedFormat = "Standard (arrow format)";
      }

      // If we couldn't extract key information, show error but offer raw view
      if (errors.length === 0 && !improved && !overall) {
        setParseError("Couldn't parse the feedback automatically. But you can still view the raw AI response below!");
        setParsedFeedback({
          naturalnessScore: score,
          overallFeedback: "",
          errors: [],
          improvedVersion: "",
          detectedFormat: "Unknown"
        });
        setShowRawFeedback(true);
        return;
      }

      // Set parsed feedback
      setParsedFeedback({
        naturalnessScore: score,
        overallFeedback: overall,
        errors: errors,
        improvedVersion: improved,
        detectedFormat: detectedFormat || "Mixed format"
      });
      
       setParseError("");
       setShowRawFeedback(false);
       setShowPasteArea(false);
       setPastedFeedback("");
       setFeedbackSidebarOpen(true);
       toast(`Feedback parsed successfully! (${detectedFormat || "Standard"})`, "success");
     }

    const errorCount = grammarErrors.length;

    return (
      <>
        <Header />
        <div className="flex min-h-[calc(100vh-80px)] p-8 gap-8">
          <div className="flex-1 max-w-2xl">
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
          <div className="flex items-center justify-between mt-2 mb-4 gap-3">
            <span
              className={`text-sm ${wordCount >= minWords ? "text-green-600" : "text-neutral-400"}`}
            >
              {wordCount} words {minWords > 0 && `/ ${minWords} min`}
            </span>
            <div className="flex gap-2">
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
              <button
                onClick={copyPromptForAI}
                disabled={!writingText.trim()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  !writingText.trim()
                    ? "border-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "border-purple-200 text-purple-600 hover:bg-purple-50"
                }`}
              >
                <Sparkles size={14} /> Get AI Feedback
              </button>
            </div>
          </div>
          {promptCopied && (
            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={15} className="text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      Prompt copied to clipboard!
                    </span>
                  </div>
                  <p className="text-xs text-purple-700 mb-3">
                    Paste it into your favorite AI chat, then come back and continue when done.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <a
                      href="https://gemini.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      <Play size={12} className="rotate-[-90deg]" />
                      Open Gemini
                    </a>
                    <a
                      href="https://claude.ai/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      <Play size={12} className="rotate-[-90deg]" />
                      Open Claude
                    </a>
                    <a
                      href="https://chatgpt.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      <Play size={12} className="rotate-[-90deg]" />
                      Open ChatGPT
                    </a>
                    <a
                      href="https://chat.qwen.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      <Play size={12} className="rotate-[-90deg]" />
                      Open Qwen
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => setPromptCopied(false)}
                  className="text-purple-400 hover:text-purple-600 p-1"
                  title="Close"
                >
                  ✕
                </button>
              </div>
              
              {!showPasteArea ? (
                <button
                  onClick={() => setShowPasteArea(true)}
                  className="text-xs text-purple-700 hover:text-purple-900 hover:underline font-medium flex items-center gap-1"
                >
                  📋 Paste AI Feedback Here
                </button>
              ) : (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <div className="mb-2">
                    <label className="text-xs font-medium text-purple-700 block mb-1">
                      Which AI provided this feedback?
                    </label>
                    <select
                      value={selectedAISource}
                      onChange={(e) => setSelectedAISource(e.target.value)}
                      className="text-sm border border-purple-200 rounded-lg px-3 py-1.5 bg-white text-purple-700 focus:outline-none focus:border-purple-400"
                    >
                      <option value="auto">Auto-detect (recommended)</option>
                      <option value="claude">Claude (uses tables)</option>
                      <option value="chatgpt">ChatGPT (uses labels)</option>
                      <option value="gemini">Gemini</option>
                      <option value="qwen">Qwen</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <textarea
                    value={pastedFeedback}
                    onChange={(e) => setPastedFeedback(e.target.value)}
                    placeholder="Paste the AI's response here... (includes score, errors, and improved version)"
                    className="w-full h-32 p-2 text-sm rounded-lg border border-purple-200 bg-white focus:outline-none focus:border-purple-400"
                  />
                  {parseError && (
                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {parseError}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={parseFeedback}
                      className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Parse Feedback
                    </button>
                    <button
                      onClick={() => {
                        setShowPasteArea(false);
                        setPastedFeedback("");
                        setParseError("");
                      }}
                      className="px-3 py-1.5 bg-white text-purple-700 text-xs font-medium rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
          {parsedFeedback && !feedbackSidebarOpen && (
            <div className="flex items-center justify-center mt-4">
              <button
                onClick={() => setFeedbackSidebarOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                <Sparkles size={20} />
                <span>Open AI Feedback Sidebar</span>
              </button>
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
          
          {parsedFeedback && (
            <div 
              className={cn(
                "fixed right-0 top-[80px] h-[calc(100vh-80px)] w-96 bg-white border-l border-neutral-200 shadow-2xl z-30 overflow-hidden transition-all duration-300 ease-in-out",
                feedbackSidebarOpen ? "translate-x-0" : "translate-x-full"
              )}
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-purple-50">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-600" />
                  <div>
                    <span className="text-sm font-semibold text-purple-800">
                      AI Feedback (Parsed)
                    </span>
                    {parsedFeedback.detectedFormat && (
                      <div className="text-xs text-purple-600 mt-0.5">
                        {parsedFeedback.detectedFormat}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowRawFeedback(!showRawFeedback)}
                    className="text-xs text-purple-600 hover:text-purple-900 px-2 py-1 hover:bg-purple-100 rounded transition-colors"
                  >
                    {showRawFeedback ? "Hide Raw" : "View Raw"}
                  </button>
                  <button
                    onClick={() => setParsedFeedback(null)}
                    className="text-xs text-purple-600 hover:text-purple-900 px-2 py-1 hover:bg-purple-100 rounded transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setFeedbackSidebarOpen(false)}
                    className="text-neutral-400 hover:text-neutral-600 p-1 hover:bg-neutral-100 rounded transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
              
              {showRawFeedback && pastedFeedback && (
                <div className="p-4 bg-neutral-50 border-b border-neutral-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-neutral-600">Original AI Response</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pastedFeedback);
                        toast("Raw feedback copied!", "success");
                      }}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      Copy Raw
                    </button>
                  </div>
                  <div className="bg-white border border-neutral-200 rounded-lg p-3 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-sans">
                      {pastedFeedback}
                    </pre>
                  </div>
                </div>
              )}
              
              <div className="p-4 bg-white space-y-4 overflow-y-auto h-[calc(100%-100px)]">
                {parsedFeedback.naturalnessScore > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neutral-700">Naturalness Score</span>
                      <span className="text-lg font-bold text-purple-600">
                        {parsedFeedback.naturalnessScore}/5
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div
                          key={star}
                          className={`w-8 h-2 rounded-full ${
                            star <= parsedFeedback.naturalnessScore
                              ? "bg-purple-500"
                              : "bg-neutral-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {parsedFeedback.overallFeedback && (
                  <div className="p-3 bg-neutral-50 rounded-lg">
                    <p className="text-sm text-neutral-700">{parsedFeedback.overallFeedback}</p>
                  </div>
                )}
                
                {parsedFeedback.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-2">
                      Suggestions ({parsedFeedback.errors.length})
                    </h4>
                    <div className="space-y-2">
                      {parsedFeedback.errors.map((err, i) => (
                        <div key={i} className="p-3 border border-neutral-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono">
                              {err.text || "General"}
                            </span>
                          </div>
                          {err.explanation && (
                            <p className="text-sm text-neutral-700 mb-1">{err.explanation}</p>
                          )}
                          {err.suggestion && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-neutral-500">→</span>
                              <button
                                onClick={() => {
                                  if (err.text) {
                                    setWritingText(writingText.replace(err.text, err.suggestion));
                                    setTextModified(true);
                                  }
                                }}
                                className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 transition-colors font-medium"
                              >
                                {err.suggestion}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {parsedFeedback.improvedVersion && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-neutral-700">Improved Version</h4>
                      <button
                        onClick={() => {
                          setWritingText(parsedFeedback.improvedVersion);
                          setTextModified(true);
                        }}
                        className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded hover:bg-purple-100 transition-colors font-medium"
                      >
                        Use This Version
                      </button>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-neutral-700 leading-relaxed">
                        {parsedFeedback.improvedVersion}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </>
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
                const transcript = await transcribeWithChunking(audioUrl, whisperPipelineRef.current);
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
      <>
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
      </>
    );
  }

  // ── READING ───────────────────────────────────────────────
  if (lesson.type === "reading") {
    const content = lesson.content as ReadingContent;
    const isReading = step === 0;

    return (
      <>
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
                          if (!isCorrect) {
                            setIncorrectQuestionIndices(prev => [...prev, qIdx]);
                          }
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
      </>
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
        <>
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
        </>
      );
    }

    // ── Questions Phase ──
    const q = content.questions[qIdx];
    const isLastQ = qIdx === content.questions.length - 1;

    return (
      <>
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
                      if (isCorrect) {
                        setCorrectCount((c) => c + 1);
                      } else {
                        setIncorrectQuestionIndices(prev => [...prev, qIdx]);
                      }
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
      </>
    );
  }

  return null;
}
