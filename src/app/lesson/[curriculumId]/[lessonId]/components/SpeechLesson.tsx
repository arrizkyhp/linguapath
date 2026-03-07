'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Mic, MicOff, RotateCcw, Volume2, Pause, Loader2, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Lesson, SpeechContent } from '@/types/curriculum';

type SpeechLessonProps = {
  lesson: Lesson;
  curriculumId: string;
  curriculumTitle: string;
  alreadyComplete: boolean;
  onComplete: () => void;
  onNavigateBack: () => void;
};

export function SpeechLesson({
  lesson,
  curriculumId,
  curriculumTitle,
  alreadyComplete,
  onComplete,
  onNavigateBack,
}: SpeechLessonProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);
  const [allTranscripts, setAllTranscripts] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [micStatus, setMicStatus] = useState<
    'idle' | 'initializing' | 'ready' | 'recording' | 'error'
  >('idle');
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    'idle' | 'processing' | 'done' | 'error'
  >('idle');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [showFirstTimeMessage, setShowFirstTimeMessage] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const whisperPipelineRef = useRef<any>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('whisper_model_loaded')) {
        setShowFirstTimeMessage(true);
      }
    }
  }, []);

  const content = lesson.content as SpeechContent;

  async function loadWhisperModel() {
    if (typeof window === 'undefined') return null;
    if (whisperPipelineRef.current) return whisperPipelineRef.current;
    setModelLoading(true);
    setModelProgress(0);
    try {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const whisper = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-base',
        {
          dtype: 'q8',
          progress_callback: (progress: any) => {
            if (progress.status === 'progress' && progress.progress)
              setModelProgress(Math.round(progress.progress));
          },
        },
      );
      whisperPipelineRef.current = whisper;
      setModelLoading(false);
      return whisper;
    } catch (error) {
      console.error('Failed to load Whisper model:', error);
      setModelLoading(false);
      throw error;
    }
  }

  async function transcribeWithChunking(audioUrl: string, pipeline: any): Promise<string> {
    try {
      const result = await pipeline(audioUrl, {
        language: 'english',
        task: 'transcribe',
        chunk_length_s: 25,
        stride_length_s: 2,
      });
      return result.text.trim();
    } finally {
      URL.revokeObjectURL(audioUrl);
    }
  }

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      )
        mediaRecorderRef.current.stop();
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function toggleRecording() {
    if (recording) {
      setRecording(false);
      setMicStatus('idle');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
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
          await loadWhisperModel();
          if (typeof window !== 'undefined' && showFirstTimeMessage) {
            localStorage.setItem('whisper_model_loaded', 'true');
            setShowFirstTimeMessage(false);
          }
        } catch {
          return;
        }
      }
      try {
        setMicStatus('initializing');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;
        setPermissionDenied(false);
        setRecording(true);
        setMicStatus('recording');
        setElapsed(0);
        setDetectedKeywords([]);
        setAllTranscripts('');

        timerRef.current = setInterval(
          () =>
            setElapsed((e) => {
              if (e >= content.duration_seconds) {
                clearInterval(timerRef.current!);
                timerRef.current = null;
                setRecording(false);
                setMicStatus('idle');
                if (
                  mediaRecorderRef.current &&
                  mediaRecorderRef.current.state !== 'inactive'
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
          mimeType: 'audio/webm;codecs=opus',
        });
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.push(e.data);
        };
        mr.onstop = async () => {
          if (recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, {
              type: 'audio/webm;codecs=opus',
            });
            setAudioBlob(blob);
            setTranscriptionStatus('processing');
            try {
              const audioUrl = URL.createObjectURL(blob);
              const transcript = await transcribeWithChunking(audioUrl, whisperPipelineRef.current);
              setAllTranscripts(transcript);
              setDetectedKeywords(
                (content.keywords_to_use || []).filter((kw) =>
                  transcript.toLowerCase().includes(kw.toLowerCase()),
                ),
              );
              setTranscriptionStatus('done');
            } catch {
              setTranscriptionStatus('error');
            }
          }
          if (streamRef.current)
            streamRef.current.getTracks().forEach((t) => t.stop());
        };
        mr.start(100);
        mediaRecorderRef.current = mr;
        setMicStatus('ready');
      } catch {
        setPermissionDenied(true);
        setRecording(false);
        setMicStatus('error');
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
    <div className="p-8 max-w-xl mx-auto">
      {permissionDenied && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg className="text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
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
      {content.keywords_to_use && content.keywords_to_use.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-neutral-400">
              Keywords to use
            </div>
            <div className="text-xs text-neutral-500">
              {detectedKeywords.length}/{content.keywords_to_use.length} detected
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(content.keywords_to_use || []).map((kw) => {
              const isDetected = detectedKeywords.includes(kw);
              return (
                <span
                  key={kw}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all font-medium ${
                    isDetected
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200'
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
      {(allTranscripts || recording || transcriptionStatus !== 'idle') && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-neutral-400">
              {recording
                ? 'Recording...'
                : transcriptionStatus === 'processing'
                  ? 'Transcribing...'
                  : 'Transcript'}
            </div>
            {(recording || transcriptionStatus === 'processing') && (
              <span
                className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                  transcriptionStatus === 'processing'
                    ? 'bg-purple-100 text-purple-700'
                    : transcriptionStatus === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {transcriptionStatus === 'processing' && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                {transcriptionStatus === 'processing' && 'Transcribing...'}
              </span>
            )}
          </div>
          <p
            className={`text-sm min-h-[24px] ${allTranscripts ? 'text-neutral-700' : 'text-neutral-400 italic'}`}
          >
            {transcriptionStatus === 'processing'
              ? 'Analyzing your speech...'
              : allTranscripts ||
                (recording ? 'Speak now...' : 'No speech detected')}
          </p>
        </div>
      )}
      <div className="text-center mb-6">
        <div className="text-5xl font-mono font-bold text-neutral-900 mb-3">
          {String(Math.floor(elapsed / 60)).padStart(2, '0')}:
          {String(elapsed % 60).padStart(2, '0')}
        </div>
        <Progress
          value={(elapsed / content.duration_seconds) * 100}
          className="mb-4 h-2"
        />
      </div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <div
          className={`w-3 h-3 rounded-full ${
            micStatus === 'recording'
              ? 'bg-red-500 animate-pulse'
              : micStatus === 'ready'
                ? 'bg-green-500'
                : micStatus === 'initializing'
                  ? 'bg-yellow-500 animate-pulse'
                  : micStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-neutral-300'
          }`}
        />
        <span className="text-sm text-neutral-500">
          {micStatus === 'recording' && 'Recording...'}
          {micStatus === 'ready' && 'Mic active'}
          {micStatus === 'initializing' && 'Initializing mic...'}
          {micStatus === 'error' && 'Mic error'}
          {micStatus === 'idle' &&
            audioBlob &&
            !recording &&
            'Recording saved'}
          {micStatus === 'idle' && !audioBlob && !recording && 'Mic idle'}
        </span>
      </div>
      <div className="flex gap-3">
        <button
          onClick={toggleRecording}
          disabled={modelLoading || transcriptionStatus === 'processing'}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-semibold transition-all ${
            recording
              ? 'bg-red-50 border-red-400 text-red-600 hover:bg-red-100'
              : modelLoading || transcriptionStatus === 'processing'
                ? 'bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
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
            disabled={transcriptionStatus === 'processing'}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
              transcriptionStatus === 'processing'
                ? 'border-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
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
              setAllTranscripts('');
              setTranscriptionStatus('idle');
            }}
            className="px-4 py-3 rounded-xl border-2 border-neutral-200 text-neutral-500 hover:border-neutral-400 transition-all"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      )}
      <Button className="w-full mt-3" onClick={onComplete}>
        Mark as Complete ✓
      </Button>
    </div>
  );
}
