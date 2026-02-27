"use client"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { loadState, getLessonProgress, isLessonUnlocked, saveOpenTabs, loadOpenTabs } from "@/lib/store"
import { LEVEL_CONFIG, LESSON_TYPE_CONFIG } from "@/lib/config"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { AppState, Curriculum, Module, Unit } from "@/types/curriculum"
import { ChevronDown, ChevronRight, Lock, CheckCircle2, Circle } from "lucide-react"

export default function CurriculumDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [state, setState] = useState<AppState | null>(null)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [openUnits, setOpenUnits] = useState<Set<string>>(new Set())

  useEffect(() => {
    const s = loadState()
    if (!s.onboarding_complete) { router.push("/onboarding"); return }
    setState(s)
    const curr = s.curriculums.find((c) => c.id === id)
    const saved = loadOpenTabs(id)
    if (saved && saved.openModules.length > 0) {
      setOpenModules(new Set(saved.openModules))
      setOpenUnits(new Set(saved.openUnits))
    } else if (curr?.modules[0]) {
      setOpenModules(new Set([curr.modules[0].id]))
      if (curr.modules[0].units[0]) setOpenUnits(new Set([curr.modules[0].units[0].id]))
    }
  }, [router, id])

  if (!state) return null
  const curriculum = state.curriculums.find((c) => c.id === id)
  if (!curriculum) return <div className="p-8 text-neutral-400">Curriculum not found.</div>

  const cfg = LEVEL_CONFIG[curriculum.level]

  // All lessons in order for unlock check
  const allLessons = curriculum.modules.flatMap((m) => m.units.flatMap((u) => u.lessons))
  const allLessonIds = allLessons.map((l) => l.id)

  function toggleModule(mid: string) {
    setOpenModules((prev) => { 
      const n = new Set(prev)
      n.has(mid) ? n.delete(mid) : n.add(mid)
      saveOpenTabs(id, { openModules: Array.from(n), openUnits: Array.from(openUnits) })
      return n
    })
  }
  function toggleUnit(uid: string) {
    setOpenUnits((prev) => { 
      const n = new Set(prev)
      n.has(uid) ? n.delete(uid) : n.add(uid)
      saveOpenTabs(id, { openModules: Array.from(openModules), openUnits: Array.from(n) })
      return n
    })
  }

  return (
    <div className="p-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push("/curriculum")} className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors mb-3 flex items-center gap-1">
            ← Back to Curriculum
          </button>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-3xl font-bold">{curriculum.title}</h1>
            <span
              className="text-sm px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              {curriculum.level}
            </span>
          </div>
          {curriculum.description && <p className="text-neutral-500">{curriculum.description}</p>}
        </div>

        {/* Modules */}
        <div className="space-y-3">
          {curriculum.modules.map((mod, mi) => (
            <div key={mod.id}>
              {/* Module Header */}
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-sm font-bold text-neutral-600 flex-shrink-0">
                  {mi + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{mod.title}</div>
                  <div className="text-xs text-neutral-400">{mod.units.length} units · {mod.units.reduce((a, u) => a + u.lessons.length, 0)} lessons</div>
                </div>
                {openModules.has(mod.id) ? <ChevronDown size={18} className="text-neutral-400" /> : <ChevronRight size={18} className="text-neutral-400" />}
              </button>

              {/* Units */}
              {openModules.has(mod.id) && (
                <div className="ml-4 mt-2 space-y-2">
                  {mod.units.map((unit) => (
                    <div key={unit.id}>
                      {/* Unit Header */}
                      <button
                        onClick={() => toggleUnit(unit.id)}
                        className="w-full flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:bg-white transition-colors text-left"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{unit.title}</div>
                          <div className="text-xs text-neutral-400">{unit.lessons.length} lessons</div>
                        </div>
                        {openUnits.has(unit.id) ? <ChevronDown size={15} className="text-neutral-300" /> : <ChevronRight size={15} className="text-neutral-300" />}
                      </button>

                      {/* Lessons */}
                      {openUnits.has(unit.id) && (
                        <div className="ml-4 mt-1 space-y-1">
                          {unit.lessons.map((lesson, li) => {
                            const globalIdx = allLessonIds.indexOf(lesson.id)
                            const unlocked = isLessonUnlocked(curriculum.id, globalIdx, allLessonIds)
                            const progress = getLessonProgress(curriculum.id, lesson.id)
                            const completed = progress?.completed === true
                            const typeCfg = LESSON_TYPE_CONFIG[lesson.type]

                            return (
                              <button
                                key={lesson.id}
                                disabled={!unlocked}
                                onClick={() => unlocked && router.push(`/lesson/${curriculum.id}/${lesson.id}`)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                  completed ? "bg-green-50 border-green-100" :
                                  unlocked ? "bg-white border-neutral-100 hover:border-neutral-200 hover:shadow-sm" :
                                  "bg-neutral-50 border-neutral-100 opacity-50 cursor-not-allowed"
                                }`}
                              >
                                <span className="text-base">{typeCfg.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-medium truncate ${completed ? "text-green-700" : "text-neutral-700"}`}>
                                    {lesson.title}
                                  </div>
                                  <div className="text-xs text-neutral-400">{typeCfg.label} · {lesson.xp} XP</div>
                                </div>
                                {completed ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" /> :
                                 unlocked ? <Circle size={16} className="text-neutral-200 flex-shrink-0" /> :
                                 <Lock size={14} className="text-neutral-300 flex-shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
  )
}
