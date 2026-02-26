"use client"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { loadState, completeLesson, getLessonProgress } from "@/lib/store"
import { LESSON_TYPE_CONFIG } from "@/lib/config"
import AppLayout from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/toast"
import type { Lesson, FlashcardContent, QuizContent, FillBlankContent, WritingContent, SpeechContent, ReadingContent } from "@/types/curriculum"
import { ChevronLeft, ChevronRight, RotateCcw, Mic, MicOff, CheckCircle2 } from "lucide-react"
import { dispatchStateUpdate } from "@/components/AppLayout"

export default function LessonPage() {
  const router = useRouter()
  const { curriculumId, lessonId } = useParams<{ curriculumId: string; lessonId: string }>()
  const { toast } = useToast()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [currTitle, setCurrTitle] = useState("")
  const [step, setStep] = useState(0) // for multi-step lessons
  const [done, setDone] = useState(false)
  const [alreadyComplete, setAlreadyComplete] = useState(false)

  // Flashcard state
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)

  // Quiz / Reading state
  const [qIdx, setQIdx] = useState(0)
  const [selectedAns, setSelectedAns] = useState<number | null>(null)
  const [showExp, setShowExp] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)

  // Fill blank state
  const [fbIdx, setFbIdx] = useState(0)
  const [fbSelected, setFbSelected] = useState<string | null>(null)
  const [fbShowExp, setFbShowExp] = useState(false)

  // Writing state
  const [writingText, setWritingText] = useState("")

  // Speech state
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [timerRef, setTimerRef] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const s = loadState()
    const curr = s.curriculums.find((c) => c.id === curriculumId)
    if (!curr) return
    setCurrTitle(curr.title)
    const found = curr.modules.flatMap((m) => m.units.flatMap((u) => u.lessons)).find((l) => l.id === lessonId)
    if (found) setLesson(found)
    const p = getLessonProgress(curriculumId, lessonId)
    if (p?.completed) setAlreadyComplete(true)
  }, [curriculumId, lessonId])

  function markComplete() {
    if (!lesson) return
    completeLesson(curriculumId, lessonId, lesson.xp)
    dispatchStateUpdate()
    toast(`+${lesson.xp} XP earned! 🎉`, "success")
    setDone(true)
  }

  if (!lesson) return null

  const typeCfg = LESSON_TYPE_CONFIG[lesson.type]

  // ── Completed Screen ────────────────────────────────────
  if (done) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-serif text-3xl font-bold mb-2">Lesson Complete!</h2>
            <p className="text-neutral-500 mb-2">You earned</p>
            <div className="text-4xl font-bold text-yellow-500 mb-8">+{lesson.xp} XP</div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push(`/curriculum/${curriculumId}`)}>
                Back to Curriculum
              </Button>
              <Button onClick={() => router.push("/dashboard")}>
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Header ───────────────────────────────────────────────
  const Header = () => (
    <div className="border-b border-neutral-100 px-8 py-4 flex items-center gap-4 bg-white">
      <button onClick={() => router.push(`/curriculum/${curriculumId}`)} className="text-neutral-400 hover:text-neutral-700 transition-colors">
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
  )

  // ── FLASHCARD ────────────────────────────────────────────
  if (lesson.type === "flashcard") {
    const content = lesson.content as FlashcardContent
    const card = content.cards[cardIdx]
    const isLast = cardIdx === content.cards.length - 1

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-2xl mx-auto">
          <div className="text-center text-sm text-neutral-400 mb-6">{cardIdx + 1} / {content.cards.length}</div>
          <Progress value={((cardIdx + 1) / content.cards.length) * 100} className="mb-8" />

          {/* Card */}
          <div
            onClick={() => setFlipped(!flipped)}
            className="cursor-pointer bg-white border border-neutral-200 rounded-2xl p-10 text-center shadow-sm hover:shadow-md transition-all min-h-48 flex flex-col items-center justify-center mb-6"
          >
            {!flipped ? (
              <>
                <div className="font-serif text-3xl font-semibold text-neutral-900 mb-2">{card.front}</div>
                <div className="text-xs text-neutral-400">Click to reveal</div>
              </>
            ) : (
              <>
                <div className="font-serif text-2xl text-neutral-700 mb-3">{card.back}</div>
                {card.example && (
                  <div className="text-sm text-neutral-400 italic border-t border-neutral-100 pt-3 mt-2">
                    &ldquo;{card.example}&rdquo;
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setFlipped(false); setCardIdx(Math.max(0, cardIdx - 1)) }} disabled={cardIdx === 0}>
              <ChevronLeft size={16} /> Previous
            </Button>
            <Button variant="ghost" onClick={() => setFlipped(false)}>
              <RotateCcw size={16} />
            </Button>
            {isLast ? (
              <Button className="flex-1" onClick={markComplete}>
                Complete Lesson ✓
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => { setFlipped(false); setCardIdx(cardIdx + 1) }}>
                Next <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── QUIZ ─────────────────────────────────────────────────
  if (lesson.type === "quiz") {
    const content = lesson.content as QuizContent
    const q = content.questions[qIdx]
    const isLastQ = qIdx === content.questions.length - 1

    if (step === 1) {
      // Results
      const pct = Math.round((correctCount / content.questions.length) * 100)
      return (
        <AppLayout>
          <Header />
          <div className="p-8 max-w-lg mx-auto text-center">
            <div className="text-6xl mb-4">{pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪"}</div>
            <h2 className="font-serif text-3xl font-bold mb-2">Quiz Complete</h2>
            <p className="text-neutral-500 mb-6">{correctCount} / {content.questions.length} correct · {pct}%</p>
            <div className="bg-neutral-50 rounded-xl p-4 mb-8">
              <Progress value={pct} className="h-3" />
            </div>
            <Button size="lg" onClick={markComplete} className="w-full">
              Claim {lesson.xp} XP ✓
            </Button>
          </div>
        </AppLayout>
      )
    }

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Progress value={((qIdx) / content.questions.length) * 100} className="flex-1" />
            <span className="text-sm text-neutral-400 whitespace-nowrap">{qIdx + 1} / {content.questions.length}</span>
          </div>
          <h2 className="font-serif text-2xl font-semibold mb-6">{q.question}</h2>
          <div className="space-y-3 mb-6">
            {q.options.map((opt, i) => {
              let cls = "border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white"
              if (showExp) {
                if (i === q.answer) cls = "border-green-400 bg-green-50 text-green-700"
                else if (i === selectedAns) cls = "border-red-400 bg-red-50 text-red-700"
                else cls = "border-neutral-100 bg-neutral-50 text-neutral-400"
              }
              return (
                <button key={i} onClick={() => { if (!showExp) { setSelectedAns(i); setShowExp(true); if (i === q.answer) setCorrectCount(c => c + 1) } }}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${cls}`}>
                  {opt}
                </button>
              )
            })}
          </div>
          {showExp && q.explanation && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 mb-4">
              💡 {q.explanation}
            </div>
          )}
          {showExp && (
            <Button className="w-full" onClick={() => {
              if (isLastQ) { setStep(1) } else { setQIdx(i => i + 1); setSelectedAns(null); setShowExp(false) }
            }}>
              {isLastQ ? "See Results" : "Next Question"} <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </AppLayout>
    )
  }

  // ── FILL BLANK ───────────────────────────────────────────
  if (lesson.type === "fill_blank") {
    const content = lesson.content as FillBlankContent
    const s = content.sentences[fbIdx]
    const isLastS = fbIdx === content.sentences.length - 1

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Progress value={((fbIdx) / content.sentences.length) * 100} className="flex-1" />
            <span className="text-sm text-neutral-400">{fbIdx + 1} / {content.sentences.length}</span>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 mb-6">
            <p className="font-serif text-xl text-neutral-700 leading-relaxed">
              {s.text.replace("_____", fbSelected && fbShowExp ? `[${fbSelected}]` : "_____")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(s.options ?? [s.answer]).map((opt) => {
              let cls = "border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white"
              if (fbShowExp) {
                if (opt === s.answer) cls = "border-green-400 bg-green-50 text-green-700"
                else if (opt === fbSelected) cls = "border-red-400 bg-red-50 text-red-700"
                else cls = "border-neutral-100 bg-neutral-50 text-neutral-400"
              }
              return (
                <button key={opt} onClick={() => { if (!fbShowExp) { setFbSelected(opt); setFbShowExp(true) } }}
                  className={`px-4 py-3 rounded-xl border-2 transition-all font-medium ${cls}`}>
                  {opt}
                </button>
              )
            })}
          </div>
          {fbShowExp && s.explanation && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 mb-4">
              💡 {s.explanation}
            </div>
          )}
          {fbShowExp && (
            <Button className="w-full" onClick={() => {
              if (isLastS) { markComplete() } else { setFbIdx(i => i + 1); setFbSelected(null); setFbShowExp(false) }
            }}>
              {isLastS ? "Complete Lesson ✓" : "Next"} <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </AppLayout>
    )
  }

  // ── WRITING ──────────────────────────────────────────────
  if (lesson.type === "writing") {
    const content = lesson.content as WritingContent
    const wordCount = writingText.trim().split(/\s+/).filter(Boolean).length
    const minWords = content.min_words ?? 0

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-2xl mx-auto">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-6">
            <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">Writing Prompt</div>
            <p className="text-neutral-700 leading-relaxed">{content.prompt}</p>
            {minWords > 0 && <div className="text-xs text-neutral-400 mt-2">Minimum: {minWords} words</div>}
          </div>
          <textarea
            value={writingText}
            onChange={(e) => setWritingText(e.target.value)}
            placeholder="Start writing here..."
            className="w-full min-h-56 border border-neutral-200 rounded-xl p-4 text-neutral-700 leading-relaxed resize-y outline-none focus:border-neutral-400 transition-colors font-sans text-sm"
          />
          <div className="flex items-center justify-between mt-2 mb-6">
            <span className={`text-sm ${wordCount >= minWords ? "text-green-600" : "text-neutral-400"}`}>
              {wordCount} words {minWords > 0 && `/ ${minWords} min`}
            </span>
          </div>
          <Button
            className="w-full"
            disabled={minWords > 0 && wordCount < minWords}
            onClick={markComplete}
          >
            Submit & Complete ✓
          </Button>
        </div>
      </AppLayout>
    )
  }

  // ── SPEECH ───────────────────────────────────────────────
  if (lesson.type === "speech") {
    const content = lesson.content as SpeechContent

    function toggleRecording() {
      if (recording) {
        setRecording(false)
        if (timerRef) clearInterval(timerRef)
      } else {
        setRecording(true)
        setElapsed(0)
        const t = setInterval(() => setElapsed((e) => {
          if (e >= content.duration_seconds) { clearInterval(t); setRecording(false); return e }
          return e + 1
        }), 1000)
        setTimerRef(t)
      }
    }

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-xl mx-auto">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-6">
            <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">Speaking Prompt</div>
            <p className="font-serif text-lg text-neutral-700 leading-relaxed">{content.prompt}</p>
            <div className="text-xs text-neutral-400 mt-2">{content.duration_seconds} seconds</div>
          </div>

          {content.keywords_to_use && content.keywords_to_use.length > 0 && (
            <div className="mb-6">
              <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">Keywords to use</div>
              <div className="flex flex-wrap gap-2">
                {content.keywords_to_use.map((kw) => (
                  <span key={kw} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm border border-blue-100">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Timer */}
          <div className="text-center mb-6">
            <div className="text-5xl font-mono font-bold text-neutral-900 mb-3">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </div>
            <Progress value={(elapsed / content.duration_seconds) * 100} className="mb-4 h-2" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={toggleRecording}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-semibold transition-all ${
                recording
                  ? "bg-red-50 border-red-400 text-red-600 hover:bg-red-100"
                  : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {recording ? <><MicOff size={18} /> Stop Recording</> : <><Mic size={18} /> Start Recording</>}
            </button>
          </div>
          <Button className="w-full mt-3" onClick={markComplete}>
            Mark as Complete ✓
          </Button>
        </div>
      </AppLayout>
    )
  }

  // ── READING ──────────────────────────────────────────────
  if (lesson.type === "reading") {
    const content = lesson.content as ReadingContent
    const isReading = step === 0

    return (
      <AppLayout>
        <Header />
        <div className="p-8 max-w-2xl mx-auto">
          {isReading ? (
            <>
              <div className="prose prose-neutral max-w-none bg-white border border-neutral-200 rounded-2xl p-8 mb-6">
                <p className="font-serif text-base leading-8 text-neutral-700 whitespace-pre-wrap">{content.text}</p>
              </div>
              <Button className="w-full" onClick={() => setStep(1)}>
                Continue to Questions <ChevronRight size={16} />
              </Button>
            </>
          ) : (
            <>
              {/* Reuse quiz UI for reading questions */}
              <div className="flex items-center gap-3 mb-6">
                <Progress value={((qIdx) / content.questions.length) * 100} className="flex-1" />
                <span className="text-sm text-neutral-400">{qIdx + 1} / {content.questions.length}</span>
              </div>
              <h2 className="font-serif text-xl font-semibold mb-6">{content.questions[qIdx].question}</h2>
              <div className="space-y-3 mb-6">
                {content.questions[qIdx].options.map((opt, i) => {
                  let cls = "border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white"
                  if (showExp) {
                    if (i === content.questions[qIdx].answer) cls = "border-green-400 bg-green-50 text-green-700"
                    else if (i === selectedAns) cls = "border-red-400 bg-red-50 text-red-700"
                    else cls = "border-neutral-100 bg-neutral-50 text-neutral-400"
                  }
                  return (
                    <button key={i} onClick={() => { if (!showExp) { setSelectedAns(i); setShowExp(true) } }}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${cls}`}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {showExp && content.questions[qIdx].explanation && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 mb-4">
                  💡 {content.questions[qIdx].explanation}
                </div>
              )}
              {showExp && (
                <Button className="w-full" onClick={() => {
                  if (qIdx === content.questions.length - 1) { markComplete() }
                  else { setQIdx(i => i + 1); setSelectedAns(null); setShowExp(false) }
                }}>
                  {qIdx === content.questions.length - 1 ? "Complete Lesson ✓" : "Next"} <ChevronRight size={16} />
                </Button>
              )}
            </>
          )}
        </div>
      </AppLayout>
    )
  }

  return null
}
