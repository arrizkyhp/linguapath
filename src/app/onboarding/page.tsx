"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { completeOnboarding } from "@/lib/store"
import { LEVEL_CONFIG, LEVEL_ORDER } from "@/lib/config"
import { placementQuestions } from "@/lib/sampleData"
import type { CEFRLevel } from "@/types/curriculum"
import { ChevronRight, GraduationCap, BookOpen } from "lucide-react"

type Step = "welcome" | "choice" | "test" | "result" | "manual"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("welcome")
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showExp, setShowExp] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [manualLevel, setManualLevel] = useState<CEFRLevel>("B2")

  function recommendLevel(correct: number): CEFRLevel {
    const pct = correct / placementQuestions.length
    if (pct >= 0.9) return "C2"
    if (pct >= 0.75) return "C1"
    if (pct >= 0.55) return "B2"
    if (pct >= 0.4) return "B1"
    if (pct >= 0.25) return "A2"
    return "A1"
  }

  function handleAnswer(idx: number) {
    if (showExp) return
    setSelected(idx)
    setShowExp(true)
    if (idx === placementQuestions[qIdx].answer) setCorrectCount((c) => c + 1)
  }

  function nextQuestion() {
    if (qIdx < placementQuestions.length - 1) {
      setQIdx((i) => i + 1)
      setSelected(null)
      setShowExp(false)
    } else {
      setStep("result")
    }
  }

  function finish(level: CEFRLevel) {
    completeOnboarding(level)
    router.push("/dashboard")
  }

  // ── Welcome ──────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="font-serif text-5xl font-bold text-white mb-3">LinguaPath</div>
          <div className="text-white/40 text-sm tracking-widest uppercase mb-10">Your Personal English Journey</div>
          <p className="text-white/60 mb-10 leading-relaxed">
            A structured, curriculum-based app to take your English from wherever you are to wherever you want to be — all at your own pace.
          </p>
          <Button size="lg" onClick={() => setStep("choice")} className="w-full bg-white text-black hover:bg-white/90 text-base">
            Get Started <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    )
  }

  // ── Choice ───────────────────────────────────────────────
  if (step === "choice") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="font-serif text-3xl font-bold text-white text-center mb-2">What&apos;s your level?</div>
          <p className="text-white/40 text-center mb-10">We&apos;ll personalize your curriculum for you</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStep("test")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 text-left transition-colors group"
            >
              <GraduationCap size={28} className="text-white/60 mb-3 group-hover:text-white transition-colors" />
              <div className="text-white font-semibold mb-1">Test my level</div>
              <div className="text-white/40 text-sm">10 questions · ~5 minutes</div>
            </button>
            <button
              onClick={() => setStep("manual")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 text-left transition-colors group"
            >
              <BookOpen size={28} className="text-white/60 mb-3 group-hover:text-white transition-colors" />
              <div className="text-white font-semibold mb-1">I know my level</div>
              <div className="text-white/40 text-sm">Choose from A1 to C2</div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Manual Level Select ──────────────────────────────────
  if (step === "manual") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="font-serif text-3xl font-bold text-white text-center mb-2">Choose your level</div>
          <p className="text-white/40 text-center mb-8">You can always change this later in Settings</p>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {LEVEL_ORDER.map((lvl) => {
              const cfg = LEVEL_CONFIG[lvl]
              return (
                <button
                  key={lvl}
                  onClick={() => setManualLevel(lvl)}
                  className="rounded-xl p-4 text-center border-2 transition-all"
                  style={{
                    background: manualLevel === lvl ? cfg.color + "22" : "rgba(255,255,255,0.03)",
                    borderColor: manualLevel === lvl ? cfg.color : "rgba(255,255,255,0.1)",
                    color: manualLevel === lvl ? cfg.color : "rgba(255,255,255,0.5)",
                  }}
                >
                  <div className="text-xl font-bold">{lvl}</div>
                  <div className="text-xs mt-1">{cfg.description}</div>
                </button>
              )
            })}
          </div>
          <Button size="lg" onClick={() => finish(manualLevel)} className="w-full bg-white text-black hover:bg-white/90">
            Start Learning at {manualLevel} <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    )
  }

  // ── Placement Test ───────────────────────────────────────
  if (step === "test") {
    const q = placementQuestions[qIdx]
    const progress = ((qIdx) / placementQuestions.length) * 100
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="flex items-center gap-3 mb-8">
            <Progress value={progress} className="flex-1 bg-white/10" indicatorClassName="bg-white" />
            <span className="text-white/40 text-sm whitespace-nowrap">{qIdx + 1} / {placementQuestions.length}</span>
          </div>
          <div className="font-serif text-2xl text-white mb-8">{q.question}</div>
          <div className="space-y-3 mb-6">
            {q.options.map((opt, i) => {
              let style = "border-white/10 text-white/70 hover:border-white/30 hover:text-white bg-white/5"
              if (showExp) {
                if (i === q.answer) style = "border-green-500 text-green-400 bg-green-500/10"
                else if (i === selected) style = "border-red-500 text-red-400 bg-red-500/10"
                else style = "border-white/5 text-white/30 bg-white/3"
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${style}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {showExp && (
            <Button onClick={nextQuestion} className="w-full bg-white text-black hover:bg-white/90">
              {qIdx < placementQuestions.length - 1 ? "Next Question" : "See Results"} <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ── Result ───────────────────────────────────────────────
  if (step === "result") {
    const recommended = recommendLevel(correctCount)
    const cfg = LEVEL_CONFIG[recommended]
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎯</div>
          <div className="font-serif text-3xl font-bold text-white mb-2">Your recommended level</div>
          <div className="text-white/40 mb-8">{correctCount}/{placementQuestions.length} correct answers</div>
          <div
            className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl mb-3 text-2xl font-bold font-serif"
            style={{ background: cfg.color + "22", color: cfg.color, border: `2px solid ${cfg.color}44` }}
          >
            {recommended} — {cfg.description}
          </div>
          <p className="text-white/40 text-sm mb-10">You can override this choice if you prefer</p>
          <Button size="lg" onClick={() => finish(recommended)} className="w-full bg-white text-black hover:bg-white/90 mb-3">
            Start at {recommended} <ChevronRight size={18} />
          </Button>
          <button onClick={() => setStep("manual")} className="text-white/40 text-sm hover:text-white/60 transition-colors">
            Choose a different level instead
          </button>
        </div>
      </div>
    )
  }

  return null
}
