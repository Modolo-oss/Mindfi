"use client"

import { useState } from "react"
import { Trash2, Plus, Edit2, Check, X } from "lucide-react"

interface Chat {
  id: string
  title: string
  messages: any[]
}

interface SidebarProps {
  chats: Chat[]
  currentChatId: string | null
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
  onRenameChat: (id: string, title: string) => void
}

export default function Sidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id)
    setEditTitle(title)
  }

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      onRenameChat(id, editTitle)
    }
    setEditingId(null)
  }

  return (
    <div className="w-64 sm:w-72 md:w-80 border-r border-[#1a1f3a] bg-[#0a0e27] flex flex-col h-full">
      <button
        onClick={onNewChat}
        className="flex items-center justify-center gap-2 m-4 px-4 py-3 bg-[#1e2749] hover:bg-[#2a3254] text-[#a8ff60] rounded border border-[#1a1f3a] font-mono text-sm transition-colors font-semibold"
      >
        <Plus size={18} />
        New Chat
      </button>

      <div className="flex-1 overflow-y-auto px-2 space-y-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
              currentChatId === chat.id
                ? "bg-[#1e2749] border-l-2 border-[#a8ff60]"
                : "hover:bg-[#1a1f3a] border-l-2 border-transparent"
            }`}
          >
            {editingId === chat.id ? (
              <>
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 bg-[#0a0e27] text-[#e0e0e0] border border-[#a8ff60] rounded px-2 py-1 text-sm font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(chat.id)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                />
                <button
                  onClick={() => handleSaveEdit(chat.id)}
                  className="p-1 hover:bg-[#2a3254] rounded text-[#a8ff60]"
                >
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1 hover:bg-[#2a3254] rounded text-[#666666]">
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <div onClick={() => onSelectChat(chat.id)} className="flex-1 truncate text-[#e0e0e0] font-mono text-sm">
                  {chat.title}
                </div>
                <button
                  onClick={() => handleStartEdit(chat.id, chat.title)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#2a3254] rounded text-[#a8ff60] transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteChat(chat.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#2a3254] rounded text-[#666666] hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-[#1a1f3a] p-4 text-center text-xs text-[#666666] font-mono">
        &gt; MindFi v1.0
      </div>
    </div>
  )
}
