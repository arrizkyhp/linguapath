"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, BookOpen, Upload, Settings, Flame, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { LEVEL_CONFIG } from "@/lib/config"
import type { CEFRLevel } from "@/types/curriculum"

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/curriculum", icon: BookOpen, label: "Curriculum" },
  { href: "/import", icon: Upload, label: "Import Curriculum" },
  { href: "/settings", icon: Settings, label: "Settings" },
]

interface SidebarProps {
  level: CEFRLevel
  xp: number
  streak: number
}

export default function Sidebar({ level, xp, streak }: SidebarProps) {
  const pathname = usePathname()
  const cfg = LEVEL_CONFIG[level]

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0f0f0f] flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="text-xs tracking-[0.2em] uppercase text-white/40 mb-1">Your Learning Path</div>
        <div className="font-serif text-xl font-semibold text-white">LinguaPath</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: XP, Streak, Level */}
      <div className="px-4 py-5 border-t border-white/10 space-y-3">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Flame size={15} className="text-orange-400" />
            <span className="text-white font-semibold">{streak}</span>
            <span className="text-white/40 text-xs">streak</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Star size={15} className="text-yellow-400" />
            <span className="text-white font-semibold">{xp}</span>
            <span className="text-white/40 text-xs">XP</span>
          </div>
        </div>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.color}44` }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
          {cfg.label} · {cfg.description}
        </div>
      </div>
    </aside>
  )
}
