"use client"

import { Menu, BarChart3 } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
  onPanelClick: () => void
}

export default function Header({ onMenuClick, onPanelClick }: HeaderProps) {
  return (
    <header className="border-b border-[#1a1f3a] bg-[#0a0e27] px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button onClick={onMenuClick} className="md:hidden p-2 hover:bg-[#1a1f3a] rounded transition-colors">
            <Menu size={20} className="text-[#a8ff60]" />
          </button>

          <div className="w-3 h-3 bg-[#a8ff60] rounded-full animate-pulse"></div>
          <h1 className="text-lg md:text-xl font-mono font-bold text-[#a8ff60]">&gt; MindFi</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm font-mono">
          <span className="hidden sm:inline text-[#a8ff60]">● Online</span>
          <span className="text-[#e0e0e0]">v1.0.0</span>

          {/* Mobile right panel button */}
          <button onClick={onPanelClick} className="lg:hidden p-2 hover:bg-[#1a1f3a] rounded transition-colors">
            <BarChart3 size={18} className="text-[#a8ff60]" />
          </button>
        </div>
      </div>
    </header>
  )
}
