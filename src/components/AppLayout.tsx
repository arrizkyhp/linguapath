"use client"
import { useEffect, useState } from "react"
import Sidebar from "@/components/Sidebar"
import { loadState } from "@/lib/store"
import type { AppState } from "@/types/curriculum"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)

  useEffect(() => {
    setState(loadState())
    const handler = () => setState(loadState())
    window.addEventListener("linguapath-state-update", handler)
    return () => window.removeEventListener("linguapath-state-update", handler)
  }, [])

  if (!state) return null

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar level={state.current_level} xp={state.total_xp} streak={state.streak_days} />
      <main className="ml-60 flex-1 min-h-screen">{children}</main>
    </div>
  )
}

export function dispatchStateUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("linguapath-state-update"))
  }
}
