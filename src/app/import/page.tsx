"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { loadState, addCurriculum, removeCurriculum } from "@/lib/store"
import { LEVEL_CONFIG } from "@/lib/config"
import AppLayout from "@/components/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import type { AppState, CurriculumFile } from "@/types/curriculum"
import { Upload, Trash2, CheckCircle2, AlertCircle, FileJson, Download } from "lucide-react"
import { dispatchStateUpdate } from "@/components/AppLayout"

type ParseStatus = "idle" | "valid" | "error"

export default function ImportPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<AppState | null>(null)
  const [dragging, setDragging] = useState(false)
  const [parseStatus, setParseStatus] = useState<ParseStatus>("idle")
  const [parseError, setParseError] = useState("")
  const [parsed, setParsed] = useState<CurriculumFile | null>(null)

  useEffect(() => {
    const s = loadState()
    if (!s.onboarding_complete) { router.push("/onboarding"); return }
    setState(s)
  }, [router])

  function validateCurriculum(data: unknown): data is CurriculumFile {
    if (typeof data !== "object" || data === null) return false
    const d = data as Record<string, unknown>
    if (!d.curriculum || typeof d.curriculum !== "object") return false
    const c = d.curriculum as Record<string, unknown>
    if (!c.id || !c.title || !c.level || !Array.isArray(c.modules)) return false
    const validLevels = ["A1", "A2", "B1", "B2", "C1", "C2"]
    if (!validLevels.includes(c.level as string)) return false
    return true
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".json")) {
      setParseStatus("error"); setParseError("File must be a .json file"); return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!validateCurriculum(data)) {
          setParseStatus("error")
          setParseError("Invalid curriculum schema. Make sure the JSON has a 'curriculum' object with id, title, level, and modules fields.")
          return
        }
        setParsed(data)
        setParseStatus("valid")
      } catch {
        setParseStatus("error")
        setParseError("Invalid JSON file. Please check the file format.")
      }
    }
    reader.readAsText(file)
  }

  function handleImport() {
    if (!parsed) return
    addCurriculum(parsed.curriculum)
    dispatchStateUpdate()
    setState(loadState())
    toast(`"${parsed.curriculum.title}" imported successfully!`, "success")
    setParsed(null)
    setParseStatus("idle")
  }

  function handleDelete(id: string, title: string) {
    removeCurriculum(id)
    dispatchStateUpdate()
    setState(loadState())
    toast(`"${title}" removed`, "info")
  }

  function handleDownloadTemplate() {
    const link = document.createElement("a")
    link.href = "/curriculum-template.json"
    link.download = "curriculum-template.json"
    link.click()
  }

  if (!state) return null

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs tracking-widest uppercase text-neutral-400 mb-1">Manage</div>
              <h1 className="font-serif text-3xl font-bold">Import Curriculum</h1>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download size={15} /> Download Template
            </Button>
          </div>
        </div>

        {/* Drop Zone */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file) }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragging ? "border-neutral-400 bg-neutral-50" : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <FileJson size={36} className="text-neutral-300 mx-auto mb-3" />
              <div className="font-medium text-neutral-600 mb-1">Drop your curriculum JSON here</div>
              <div className="text-sm text-neutral-400">or click to browse · .json files only</div>
            </div>

            {/* Parse Result */}
            {parseStatus === "error" && (
              <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-red-700 text-sm">Invalid file</div>
                  <div className="text-red-600 text-xs mt-1">{parseError}</div>
                </div>
              </div>
            )}

            {parseStatus === "valid" && parsed && (
              <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-700 text-sm">Valid curriculum!</div>
                    <div className="text-green-600 text-xs mt-0.5">Ready to import</div>
                  </div>
                </div>
                {/* Preview */}
                <div className="bg-white rounded-lg p-4 text-sm space-y-1 mb-4 border border-green-100">
                  <div><span className="text-neutral-400">Title: </span><span className="font-medium">{parsed.curriculum.title}</span></div>
                  <div><span className="text-neutral-400">Level: </span><span className="font-medium">{parsed.curriculum.level}</span></div>
                  <div><span className="text-neutral-400">Modules: </span><span className="font-medium">{parsed.curriculum.modules.length}</span></div>
                  <div><span className="text-neutral-400">Lessons: </span><span className="font-medium">{parsed.curriculum.modules.flatMap(m => m.units.flatMap(u => u.lessons)).length}</span></div>
                  {parsed.curriculum.description && <div><span className="text-neutral-400">Description: </span><span>{parsed.curriculum.description}</span></div>}
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleImport} className="flex-1">
                    <Upload size={15} /> Import Curriculum
                  </Button>
                  <Button variant="outline" onClick={() => { setParsed(null); setParseStatus("idle") }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Curriculums */}
        <div>
          <h2 className="font-serif text-lg font-semibold mb-4">Imported Curriculums ({state.curriculums.length})</h2>
          {state.curriculums.length === 0 ? (
            <p className="text-neutral-400 text-sm">No curriculums imported yet.</p>
          ) : (
            <div className="space-y-3">
              {state.curriculums.map((c) => {
                const cfg = LEVEL_CONFIG[c.level]
                return (
                  <div key={c.id} className="flex items-center gap-4 bg-white border border-neutral-200 rounded-xl p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{c.title}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-md font-semibold"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                        >
                          {c.level}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400">
                        {c.modules.length} modules · {c.modules.flatMap(m => m.units.flatMap(u => u.lessons)).length} lessons
                        {c.author && ` · by ${c.author}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id, c.title)}
                      className="text-neutral-300 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Schema Reference */}
        <div className="mt-10">
          <h2 className="font-serif text-lg font-semibold mb-3">JSON Schema Reference</h2>
          <pre className="bg-neutral-900 text-neutral-100 rounded-xl p-5 text-xs overflow-x-auto leading-relaxed">
{`{
  "curriculum": {
    "id": "my-curriculum-id",
    "title": "My Curriculum",
    "description": "Optional description",
    "level": "B2",           // A1 | A2 | B1 | B2 | C1 | C2
    "author": "Optional",
    "modules": [
      {
        "id": "m1",
        "title": "Module Title",
        "units": [
          {
            "id": "u1",
            "title": "Unit Title",
            "lessons": [
              {
                "id": "l1",
                "title": "Lesson Title",
                "xp": 50,
                "type": "flashcard", // flashcard|quiz|fill_blank
                                     // writing|speech|reading
                "content": { ... }   // see docs
              }
            ]
          }
        ]
      }
    ]
  }
}`}
          </pre>
        </div>
      </div>
    </AppLayout>
  )
}
