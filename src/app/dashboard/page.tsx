"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { loadState, getCurriculumProgress } from "@/lib/store"
import { LEVEL_CONFIG } from "@/lib/config"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import AppLayout from "@/components/AppLayout"
import type { AppState } from "@/types/curriculum"
import { Flame, Star, BookOpen, Trophy, ArrowRight } from "lucide-react"

const DAILY_CHALLENGES = [
  "Write 3 sentences using inversion (e.g. 'Never have I...')",
  "Use 5 different discourse markers in a short paragraph",
  "Describe your morning routine using the present perfect",
  "Write a formal email declining an invitation",
  "Explain a concept you know well using only simple words",
]

export default function DashboardPage() {
  const router = useRouter()
  const [state, setState] = useState<AppState | null>(null)
  const [todayChallenge] = useState(() => DAILY_CHALLENGES[new Date().getDay() % DAILY_CHALLENGES.length])

  useEffect(() => {
    const s = loadState()
    if (!s.onboarding_complete) { router.push("/onboarding"); return }
    setState(s)
  }, [router])

  if (!state) return null

  const cfg = LEVEL_CONFIG[state.current_level]
  const totalLessonsCompleted = state.progress.reduce(
    (acc, cp) => acc + Object.values(cp.lessons).filter((l) => l.completed).length, 0
  )

  // Find continue lesson
  let continueCurriculum = state.curriculums[0]
  let continueProgress = 0
  if (state.last_lesson) {
    const found = state.curriculums.find((c) => c.id === state.last_lesson?.curriculum_id)
    if (found) continueCurriculum = found
  }
  if (continueCurriculum) {
    continueProgress = getCurriculumProgress(continueCurriculum, state.progress)
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs tracking-widest uppercase text-neutral-400 mb-1">Welcome back</div>
          <h1 className="font-serif text-3xl font-bold text-neutral-900">Your Dashboard</h1>
        </div>

        {/* Level Progress */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-neutral-400 mb-1">Current Level</div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-serif text-2xl font-bold"
                    style={{ color: cfg.color }}
                  >
                    {state.current_level}
                  </span>
                  <span className="text-neutral-500 text-sm">— {cfg.description}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-400 mb-1">Overall Progress</div>
                <div className="font-bold text-lg" style={{ color: cfg.color }}>{continueProgress}%</div>
              </div>
            </div>
            <Progress
              value={continueProgress}
              className="h-2.5"
              indicatorClassName=""
              style={{ "--tw-bg-opacity": 1 } as React.CSSProperties}
            />
            <div
              className="h-2.5 rounded-full mt-0 -mt-2.5 transition-all"
              style={{
                width: `${continueProgress}%`,
                background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}99)`,
              }}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <Flame size={22} className="text-orange-400" />
              <div>
                <div className="text-2xl font-bold">{state.streak_days}</div>
                <div className="text-xs text-neutral-400">Day Streak</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <Star size={22} className="text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{state.total_xp}</div>
                <div className="text-xs text-neutral-400">Total XP</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <Trophy size={22} className="text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{totalLessonsCompleted}</div>
                <div className="text-xs text-neutral-400">Lessons Done</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Continue Learning */}
          <div className="col-span-3 space-y-4">
            {continueCurriculum && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-xs uppercase tracking-widest text-neutral-400 mb-3">Continue Learning</div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-xl flex-shrink-0">
                      📚
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-neutral-900 mb-1">{continueCurriculum.title}</div>
                      <div className="text-sm text-neutral-400 mb-3">
                        Level {continueCurriculum.level} · {continueCurriculum.modules.length} modules
                      </div>
                      <div className="bg-neutral-100 rounded-full h-1.5 mb-1">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${continueProgress}%`, background: cfg.color }}
                        />
                      </div>
                      <div className="text-xs text-neutral-400">{continueProgress}% complete</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/curriculum/${continueCurriculum.id}`)}
                    >
                      Continue <ArrowRight size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Curriculums */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-widest text-neutral-400">Your Curriculums</div>
                  <button onClick={() => router.push("/curriculum")} className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors">
                    View all →
                  </button>
                </div>
                <div className="space-y-2">
                  {state.curriculums.map((c) => {
                    const p = getCurriculumProgress(c, state.progress)
                    const lcfg = LEVEL_CONFIG[c.level]
                    return (
                      <button
                        key={c.id}
                        onClick={() => router.push(`/curriculum/${c.id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors text-left"
                      >
                        <BookOpen size={16} className="text-neutral-400 flex-shrink-0" />
                        <span className="flex-1 text-sm font-medium text-neutral-700">{c.title}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-md font-semibold"
                          style={{ background: lcfg.bg, color: lcfg.color, border: `1px solid ${lcfg.border}` }}
                        >
                          {c.level}
                        </span>
                        <span className="text-xs text-neutral-400">{p}%</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Challenge */}
          <div className="col-span-2">
            <Card className="bg-[#0f0f0f] text-white border-0 h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Today&apos;s Challenge</div>
                <p className="font-serif text-lg leading-relaxed flex-1 text-white/90">{todayChallenge}</p>
                <Button
                  onClick={() => router.push("/curriculum")}
                  className="mt-6 w-full bg-white text-black hover:bg-white/90"
                >
                  Start Challenge
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
