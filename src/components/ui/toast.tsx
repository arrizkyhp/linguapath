"use client"
import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface Toast { id: string; message: string; type?: "success" | "error" | "info" }
interface ToastContextType { toast: (message: string, type?: Toast["type"]) => void }

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium animate-fade-in",
              t.type === "success" && "bg-neutral-900 text-white",
              t.type === "error" && "bg-red-500 text-white",
              t.type === "info" && "bg-blue-600 text-white"
            )}
          >
            {t.message}
            <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }
