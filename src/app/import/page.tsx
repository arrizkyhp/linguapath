"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { loadStateAsync, addCurriculumAsync, removeCurriculumAsync, loadState, addCurriculum, removeCurriculum } from "@/lib/store"
import { LEVEL_CONFIG } from "@/lib/config"
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
    async function load() {
      const s = await loadStateAsync()
      if (!s.onboarding_complete) { router.push("/onboarding"); return }
      setState(s)
    }
    load()
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

  async function handleImport() {
    if (!parsed) return
    await addCurriculumAsync(parsed.curriculum)
    dispatchStateUpdate()
    const s = await loadStateAsync()
    setState(s)
    toast(`"${parsed.curriculum.title}" imported successfully!`, "success")
    setParsed(null)
    setParseStatus("idle")
  }

  async function handleDelete(id: string, title: string) {
    await removeCurriculumAsync(id)
    dispatchStateUpdate()
    const s = await loadStateAsync()
    setState(s)
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
                  <div className="text-red-600 text-sm">{parseError}</div>
                </div>
              </div>
            )}

            {parseStatus === "valid" && parsed && (
              <div className="mt-4 flex items-center justify-between bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-700 text-sm">"{parsed.curriculum.title}"</div>
                    <div className="text-green-600 text-sm">
                      {parsed.curriculum.level} · {parsed.curriculum.modules.length} modules · Ready to import
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleImport}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Import
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Curriculums */}
        <Card>
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-widest text-neutral-400 mb-4">Your Curriculums</div>
            <div className="space-y-2">
              {state.curriculums.map((c) => {
                const lcfg = LEVEL_CONFIG[c.level]
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                    <FileJson size={16} className="text-neutral-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-700">{c.title}</div>
                      <div className="text-xs text-neutral-400">
                        {c.modules.length} modules · {c.description ? c.description.slice(0, 50) + "..." : "No description"}
                      </div>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-md font-semibold"
                      style={{ background: lcfg.bg, color: lcfg.color, border: `1px solid ${lcfg.border}` }}
                    >
                      {c.level}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(c.id, c.title)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
