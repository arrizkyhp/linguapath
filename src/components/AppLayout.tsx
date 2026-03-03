"use client"
import { useEffect, useState } from "react"
import Sidebar from "@/components/Sidebar"
import { loadState } from "@/lib/store"
import type { AppState } from "@/types/curriculum"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    setState(loadState())
    const handler = () => setState(loadState())
    window.addEventListener("linguapath-state-update", handler)
    return () => window.removeEventListener("linguapath-state-update", handler)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-minimized")
    if (saved !== null) {
      setMinimized(saved === "true")
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebar-minimized", String(minimized))
  }, [minimized])

  if (!state) return null

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar level={state.current_level} xp={state.total_xp} streak={state.streak_days} minimized={minimized} onToggle={() => setMinimized(!minimized)} />
      <main className="flex-1 min-h-screen transition-all duration-300" style={{ marginLeft: minimized ? '5rem' : '15rem' }}>{children}</main>
    </div>
  )
}

export function dispatchStateUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("linguapath-state-update"))
  }
}
