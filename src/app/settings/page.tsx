"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { loadState, saveState, clearAllData, getStorageSize, exportState, importState } from "@/lib/store"
import { LEVEL_CONFIG, LEVEL_ORDER } from "@/lib/config"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import type { AppState, CEFRLevel } from "@/types/curriculum"
import { dispatchStateUpdate } from "@/components/AppLayout"

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [state, setState] = useState<AppState | null>(null)
  const [storageSize, setStorageSize] = useState("0 KB")
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const s = loadState()
    if (!s.onboarding_complete) { router.push("/onboarding"); return }
    setState(s)
    setStorageSize(getStorageSize())
  }, [router])

  function changeLevel(level: CEFRLevel) {
    if (!state) return
    const updated = { ...state, current_level: level }
    saveState(updated)
    setState(updated)
    dispatchStateUpdate()
    toast(`Level changed to ${level}`, "success")
  }

  function resetProgress() {
    if (!state) return
    const updated = { ...state, progress: [], total_xp: 0, streak_days: 0, last_lesson: null }
    saveState(updated)
    setState(updated)
    dispatchStateUpdate()
    toast("Progress reset", "info")
  }

  function handleClearAll() {
    if (!confirmClear) { setConfirmClear(true); return }
    clearAllData()
    router.push("/onboarding")
  }

  function handleExport() {
    const exported = exportState()
    if (!exported) {
      toast("Failed to export data", "error")
      return
    }
    const blob = new Blob([exported], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `linguapath-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast("Progress exported successfully", "success")
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const result = importState(content)
      if (result.success) {
        toast("Progress imported successfully", "success")
        const s = loadState()
        setState(s)
        dispatchStateUpdate()
        setStorageSize(getStorageSize())
      } else {
        toast(result.error || "Failed to import", "error")
      }
    }
    reader.onerror = () => {
      toast("Failed to read file", "error")
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  if (!state) return null

  return (
    <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <div className="text-xs tracking-widest uppercase text-neutral-400 mb-1">Configure</div>
          <h1 className="font-serif text-3xl font-bold">Settings</h1>
        </div>

        {/* Current Level */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-1">Current Level</h2>
            <p className="text-sm text-neutral-500 mb-4">Change your learning level at any time</p>
            <div className="grid grid-cols-3 gap-3">
              {LEVEL_ORDER.map((lvl) => {
                const cfg = LEVEL_CONFIG[lvl]
                const active = state.current_level === lvl
                return (
                  <button
                    key={lvl}
                    onClick={() => changeLevel(lvl)}
                    className="rounded-xl p-3 text-center border-2 transition-all"
                    style={{
                      background: active ? cfg.bg : "#fafafa",
                      borderColor: active ? cfg.color : "#e5e5e5",
                      color: active ? cfg.color : "#737373",
                    }}
                  >
                    <div className="font-bold text-lg">{lvl}</div>
                    <div className="text-xs">{cfg.description}</div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-1">Storage</h2>
            <p className="text-sm text-neutral-500 mb-3">All data is stored locally in your browser</p>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-neutral-100 rounded-lg px-3 py-2 font-mono text-neutral-600">{storageSize}</div>
              <span className="text-neutral-400">used</span>
            </div>
          </CardContent>
        </Card>

        {/* Backup & Restore */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-1">Backup & Restore</h2>
            <p className="text-sm text-neutral-500 mb-4">Export your progress or restore from a backup</p>
            <div className="flex gap-3">
              <Button onClick={handleExport} variant="outline" size="sm" className="flex-1">
                📤 Export Progress
              </Button>
              <Button onClick={handleImportClick} variant="outline" size="sm" className="flex-1">
                📥 Import Backup
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-100">
          <CardContent className="p-6">
            <h2 className="font-semibold text-red-600 mb-4">Danger Zone</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                <div>
                  <div className="font-medium text-sm">Reset Progress</div>
                  <div className="text-xs text-neutral-400">Clear all lesson completions and XP</div>
                </div>
                <Button variant="outline" size="sm" onClick={resetProgress} className="border-red-200 text-red-600 hover:bg-red-50">
                  Reset
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                <div>
                  <div className="font-medium text-sm">Clear All Data</div>
                  <div className="text-xs text-neutral-400">Delete everything and restart onboarding</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className={confirmClear ? "bg-red-500 text-white hover:bg-red-600 border-red-500" : "border-red-200 text-red-600 hover:bg-red-50"}
                >
                  {confirmClear ? "Confirm Delete" : "Clear All"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
