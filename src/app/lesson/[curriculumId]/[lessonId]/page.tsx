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
  Curriculum,
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
import { FlashcardLesson } from "./components/FlashcardLesson";
import { QuizLesson } from "./components/QuizLesson";
import { FillBlankLesson } from "./components/FillBlankLesson";
import { ReadingLesson } from "./components/ReadingLesson";
import { WritingLesson } from "./components/WritingLesson";
import { SpeechLesson } from "./components/SpeechLesson";
import { ListeningLesson } from "./components/ListeningLesson";
import { LessonHeader } from "./components/LessonHeader";

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
  const [searchParams, setSearchParams] = useState<{ review?: string }>({});
  const [nextLesson, setNextLesson] = useState<{ curriculumId: string; lessonId: string } | null>(null);

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
      findNextLesson(curr, foundModuleId!, foundUnitId!, lessonId);
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
    const params = new URLSearchParams(window.location.search);
    setSearchParams({ review: params.get("review") || undefined });
  }, []);

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

  function findNextLesson(
    curriculum: Curriculum,
    currentModuleId: string,
    currentUnitId: string,
    currentLessonId: string
  ) {
    for (let m = 0; m < curriculum.modules.length; m++) {
      const module = curriculum.modules[m];
      if (module.id === currentModuleId) {
        for (let u = 0; u < module.units.length; u++) {
          const unit = module.units[u];
          if (unit.id === currentUnitId) {
            const lessonIndex = unit.lessons.findIndex(
              (l: { id: string }) => l.id === currentLessonId
            );
            if (lessonIndex < unit.lessons.length - 1) {
              const nextLesson = unit.lessons[lessonIndex + 1];
              setNextLesson({
                curriculumId: curriculum.id,
                lessonId: nextLesson.id,
              });
              return;
            }
            for (let nextUnitIdx = u + 1; nextUnitIdx < module.units.length; nextUnitIdx++) {
              const nextUnit = module.units[nextUnitIdx];
              if (nextUnit.lessons.length > 0) {
                setNextLesson({
                  curriculumId: curriculum.id,
                  lessonId: nextUnit.lessons[0].id,
                });
                return;
              }
            }
            for (let nextModuleIdx = m + 1; nextModuleIdx < curriculum.modules.length; nextModuleIdx++) {
              const nextModule = curriculum.modules[nextModuleIdx];
              if (nextModule.units.length > 0 && nextModule.units[0].lessons.length > 0) {
                setNextLesson({
                  curriculumId: curriculum.id,
                  lessonId: nextModule.units[0].lessons[0].id,
                });
                return;
              }
            }
          }
        }
      }
    }
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

    if (nextLesson) {
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
              <p className="mb-6 text-neutral-600">
                Ready to continue learning?
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => router.push(`/lesson/${nextLesson.curriculumId}/${nextLesson.lessonId}`)}
                >
                  Next Lesson <ChevronRight size={16} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(searchParams.review === "true" ? "/reviews?completed=true" : `/curriculum/${curriculumId}`)}
                >
                  {searchParams.review === "true" ? "Back to Review" : "Back to Curriculum"}
                </Button>
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="p-8 flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4 relative">
              <span className="relative z-10">🎉</span>
            </div>
            <h2 className="font-serif text-3xl font-bold mb-2">
              Curriculum Complete!
            </h2>
            <p className="text-neutral-500 mb-6">
              You've successfully completed all lessons in this curriculum. Amazing job! 🌟
            </p>
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
                onClick={() => router.push(searchParams.review === "true" ? "/reviews?completed=true" : `/curriculum/${curriculumId}`)}
              >
                {searchParams.review === "true" ? "Back to Review" : "Back to Curriculum"}
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
        onClick={() => router.push(searchParams.review === "true" ? "/reviews?completed=true" : `/curriculum/${curriculumId}`)}
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
    return (
      <>
        <LessonHeader
          curriculumTitle={currTitle}
          lessonTitle={lesson.title}
          lessonType={lesson.type}
          xp={lesson.xp}
          alreadyComplete={alreadyComplete}
          onBack={() => router.back()}
          typeCfg={LESSON_TYPE_CONFIG[lesson.type]}
        />
        <FlashcardLesson
          lesson={lesson}
          curriculumId={curriculumId}
          curriculumTitle={currTitle}
          alreadyComplete={alreadyComplete}
          onComplete={markComplete}
          onNavigateBack={() => router.back()}
        />
      </>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────
  if (lesson.type === "quiz") {
    return (
      <>
        <LessonHeader
          curriculumTitle={currTitle}
          lessonTitle={lesson.title}
          lessonType={lesson.type}
          xp={lesson.xp}
          alreadyComplete={alreadyComplete}
          onBack={() => router.back()}
          typeCfg={LESSON_TYPE_CONFIG[lesson.type]}
        />
        <QuizLesson
          lesson={lesson}
          curriculumId={curriculumId}
          curriculumTitle={currTitle}
          alreadyComplete={alreadyComplete}
          onComplete={markComplete}
          onNavigateBack={() => router.back()}
        />
      </>
    );
  }

  // ── FILL BLANK ────────────────────────────────────────────
  if (lesson.type === "fill_blank") {
    return (
      <>
        <LessonHeader
          curriculumTitle={currTitle}
          lessonTitle={lesson.title}
          lessonType={lesson.type}
          xp={lesson.xp}
          alreadyComplete={alreadyComplete}
          onBack={() => router.back()}
          typeCfg={LESSON_TYPE_CONFIG[lesson.type]}
        />
        <FillBlankLesson
          lesson={lesson}
          curriculumId={curriculumId}
          curriculumTitle={currTitle}
          alreadyComplete={alreadyComplete}
          onComplete={markComplete}
          onNavigateBack={() => router.back()}
        />
      </>
    );
  }

  // ── WRITING ───────────────────────────────────────────────
  if (lesson.type === "writing") {
    return (
      <>
        <LessonHeader
          curriculumTitle={currTitle}
          lessonTitle={lesson.title}
          lessonType={lesson.type}
          xp={lesson.xp}
          alreadyComplete={alreadyComplete}
          onBack={() => router.back()}
          typeCfg={LESSON_TYPE_CONFIG[lesson.type]}
        />
        <WritingLesson
          lesson={lesson}
          curriculumId={curriculumId}
          curriculumTitle={currTitle}
          alreadyComplete={alreadyComplete}
          onComplete={markComplete}
          onNavigateBack={() => router.back()}
        />
      </>
    );
  }

  // ── SPEECH ────────────────────────────────────────────────
  if (lesson.type === "speech") {
    return (
      <>
        <LessonHeader
          curriculumTitle={currTitle}
          lessonTitle={lesson.title}
          lessonType={lesson.type}
          xp={lesson.xp}
          alreadyComplete={alreadyComplete}
          onBack={() => router.back()}
          typeCfg={LESSON_TYPE_CONFIG[lesson.type]}
        />
        <SpeechLesson
          lesson={lesson}
          curriculumId={curriculumId}
          curriculumTitle={currTitle}
          alreadyComplete={alreadyComplete}
          onComplete={markComplete}
          onNavigateBack={() => router.back()}
        />
      </>
    );
  }

  // ──────────────── READING ─────────────────────────────────
  if (lesson.type === "reading") {
    return (
      <>
        <LessonHeader
          curriculumTitle={currTitle}
          lessonTitle={lesson.title}
          lessonType={lesson.type}
          xp={lesson.xp}
          alreadyComplete={alreadyComplete}
          onBack={() => router.back()}
          typeCfg={LESSON_TYPE_CONFIG[lesson.type]}
        />
        <ReadingLesson
          lesson={lesson}
          curriculumId={curriculumId}
          curriculumTitle={currTitle}
          alreadyComplete={alreadyComplete}
          onComplete={markComplete}
          onNavigateBack={() => router.back()}
        />
      </>
    );
  }

  // ──────────────── LISTENING ───────────────────────────────
  if (lesson.type === "listening") {
    return (
      <>
        <LessonHeader
          curriculumTitle={currTitle}
          lessonTitle={lesson.title}
          lessonType={lesson.type}
          xp={lesson.xp}
          alreadyComplete={alreadyComplete}
          onBack={() => router.back()}
          typeCfg={LESSON_TYPE_CONFIG[lesson.type]}
        />
        <ListeningLesson
          lesson={lesson}
          curriculumId={curriculumId}
          curriculumTitle={currTitle}
          alreadyComplete={alreadyComplete}
          onComplete={markComplete}
          onNavigateBack={() => router.back()}
        />
      </>
    );
  }

  return null;
}
