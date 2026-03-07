'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Pause, Volume2, Gauge, Play, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Lesson, ListeningContent } from '@/types/curriculum';

type Speed = 0.75 | 1.0 | 1.25;

type ListeningLessonProps = {
  lesson: Lesson;
  curriculumId: string;
  curriculumTitle: string;
  alreadyComplete: boolean;
  onComplete: () => void;
  onNavigateBack: () => void;
};

export function ListeningLesson({
  lesson,
  curriculumId,
  curriculumTitle,
  alreadyComplete,
  onComplete,
  onNavigateBack,
}: ListeningLessonProps) {
  const [step, setStep] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectQuestionIndices, setIncorrectQuestionIndices] = useState<number[]>([]);
  const [hasListened, setHasListened] = useState(false);
  const [listeningAudioUrl, setListeningAudioUrl] = useState<string | null>(null);
  const [audioGenerating, setAudioGenerating] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [playSpeed, setPlaySpeed] = useState<Speed>(1.0);
  const [kokoroLoading, setKokoroLoading] = useState(false);
  const [kokoroProgress, setKokoroProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [workerReady, setWorkerReady] = useState(false);
  const [showKokoroFirstTimeMessage, setShowKokoroFirstTimeMessage] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const kokoroWorkerRef = useRef<Worker | null>(null);

  const content = lesson.content as ListeningContent;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!localStorage.getItem('kokoro_model_loaded')) {
      setShowKokoroFirstTimeMessage(true);
    }

    const worker = new Worker(
      new URL('@/workers/kokoro.worker.ts', import.meta.url),
      { type: 'module' },
    );
    kokoroWorkerRef.current = worker;
    setAudioGenerating(true);

    worker.onmessage = (e: MessageEvent<any>) => {
      const response = e.data;

      if (response.type === 'MODEL_READY') {
        setWorkerReady(true);
        setKokoroLoading(false);
        setAudioGenerating(true);

        const generateMsg = {
          type: 'GENERATE_AUDIO',
          text: content.text,
          voice: content.voice || 'af_heart',
        };
        worker.postMessage(generateMsg);
      } else if (response.type === 'PROGRESS') {
        setKokoroProgress(response.progress);
        setGenerationProgress(response.progress);
        setGenerationMessage(response.message || '');

        if (response.status === 'loading') {
          setKokoroLoading(true);
        } else if (response.status === 'generating') {
          setKokoroLoading(false);
        }
      } else if (response.type === 'AUDIO_READY') {
        const blob = new Blob([response.wavBytes.buffer as ArrayBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setListeningAudioUrl(url);
        setAudioGenerating(false);
        setGenerationProgress(100);
        setGenerationMessage('Audio ready!');
      } else if (response.type === 'ERROR') {
        console.error('Worker error:', response.error);
        setKokoroLoading(false);
        setAudioGenerating(false);
      }
    };

    setKokoroLoading(true);
    setAudioGenerating(true);
    worker.postMessage({
      type: 'LOAD_MODEL',
      modelId: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    });

    return () => {
      if (kokoroWorkerRef.current) {
        kokoroWorkerRef.current.terminate();
      }
    };
  }, []);

  function formatTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
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

  const isListeningPhase = step === 0;

  if (isListeningPhase) {
    return (
      <div className="p-8 max-w-xl mx-auto">
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

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-xl">🎧</span>
          <p className="text-sm text-amber-800">
            Listen carefully — the passage won't be shown during questions.
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="text-xs uppercase tracking-widest text-neutral-400 mb-5">
            Audio Passage
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span>{formatTime(audioCurrentTime)}</span>
              <span>
                {audioDuration > 0 ? formatTime(audioDuration) : '--:--'}
              </span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-neutral-800 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${audioProgress}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 mb-5">
            <button
              onClick={audioPlaying ? pauseAudio : playAudio}
              disabled={audioGenerating || !listeningAudioUrl}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md ${
                audioGenerating || !listeningAudioUrl
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : audioPlaying
                    ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                    : 'bg-neutral-900 text-white hover:bg-neutral-700'
              } ${!audioGenerating && listeningAudioUrl && !hasListened ? 'animate-pulse' : ''}`}
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
                ? generationMessage || 'Preparing audio...'
                : audioPlaying
                  ? 'Playing...'
                  : hasListened
                    ? 'Tap to replay'
                    : listeningAudioUrl
                      ? 'Tap to listen'
                      : 'Loading...'}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Gauge size={13} className="text-neutral-400" />
            <span className="text-xs text-neutral-400 mr-1">Speed:</span>
            {[0.75, 1.0, 1.25].map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s as Speed)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  playSpeed === s
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {hasListened && (
          <p className="text-center text-xs text-neutral-400 mb-4">
            You can replay as many times as you need before continuing.
          </p>
        )}

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
            'Listen to continue'
          )}
        </Button>
      </div>
    );
  }

  const q = content.questions[qIdx];
  const isLastQ = qIdx === content.questions.length - 1;

  return (
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
            'border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white';
          if (showExp) {
            if (isCorrect)
              cls = 'border-green-400 bg-green-50 text-green-700';
            else if (i === selectedAns)
              cls = 'border-red-400 bg-red-50 text-red-700';
            else cls = 'border-neutral-100 bg-neutral-50 text-neutral-400';
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
              onComplete();
            } else {
              setQIdx((i) => i + 1);
              setSelectedAns(null);
              setShowExp(false);
            }
          }}
        >
          {isLastQ ? 'Complete Lesson ✓' : 'Next Question'}{' '}
          <ChevronRight size={16} />
        </Button>
      )}
    </div>
  );
}
