"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { loadState, getCurriculumProgress } from "@/lib/store"
import { LEVEL_CONFIG } from "@/lib/config"
import AppLayout from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { AppState } from "@/types/curriculum"
import { Upload, BookOpen, ChevronRight } from "lucide-react"

export default function CurriculumPage() {
  const router = useRouter()
  const [state, setState] = useState<AppState | null>(null)

  useEffect(() => {
    const s = loadState()
    if (!s.onboarding_complete) { router.push("/onboarding"); return }
    setState(s)
  }, [router])

  if (!state) return null

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xs tracking-widest uppercase text-neutral-400 mb-1">Browse</div>
            <h1 className="font-serif text-3xl font-bold">Curriculum</h1>
          </div>
          <Button onClick={() => router.push("/import")} variant="outline">
            <Upload size={16} /> Import Curriculum
          </Button>
        </div>

        {state.curriculums.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <BookOpen size={40} className="text-neutral-300 mx-auto mb-4" />
              <div className="font-serif text-xl text-neutral-600 mb-2">No curriculums yet</div>
              <p className="text-neutral-400 text-sm mb-6">Import a curriculum JSON to get started</p>
              <Button onClick={() => router.push("/import")}>
                <Upload size={16} /> Import Curriculum
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {state.curriculums.map((c) => {
              const p = getCurriculumProgress(c, state.progress)
              const cfg = LEVEL_CONFIG[c.level]
              const totalLessons = c.modules.flatMap((m) => m.units.flatMap((u) => u.lessons)).length
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/curriculum/${c.id}`)}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: cfg.bg }}>
                        📚
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="font-serif text-lg font-semibold">{c.title}</h2>
                          <span
                            className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                          >
                            {c.level}
                          </span>
                        </div>
                        {c.description && <p className="text-sm text-neutral-500 mb-3">{c.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-neutral-400 mb-3">
                          <span>{c.modules.length} modules</span>
                          <span>{c.modules.reduce((a, m) => a + m.units.length, 0)} units</span>
                          <span>{totalLessons} lessons</span>
                          {c.author && <span>by {c.author}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Progress value={p} className="h-1.5" />
                          </div>
                          <span className="text-xs font-medium" style={{ color: cfg.color }}>{p}%</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-neutral-300 flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
