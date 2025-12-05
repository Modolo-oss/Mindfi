"use client";

import { Plus, MessageSquare } from "lucide-react";
import { Chat } from "@/types";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  chats: Chat[];
  activeChat: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ chats, activeChat, onSelectChat, onNewChat }: ChatSidebarProps) {
  return (
    <aside className="w-64 bg-terminal-surface border-r border-terminal-border flex flex-col">
      <div className="p-3 border-b border-terminal-border">
        <button
          onClick={onNewChat}
          className="w-full terminal-button justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.length === 0 ? (
          <div className="text-terminal-muted text-sm p-3 text-center">
            No chats yet
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                "w-full text-left p-3 rounded flex items-center gap-2 transition-colors",
                activeChat === chat.id
                  ? "bg-terminal-border text-terminal-text border-l-2 border-terminal-green"
                  : "text-terminal-muted hover:bg-terminal-border/50 hover:text-terminal-text"
              )}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <div className="truncate flex-1">
                <div className="text-sm truncate">{chat.title}</div>
                <div className="text-xs text-terminal-muted">
                  {chat.messages.length > 0 && `${chat.messages.length} messages`}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-3 border-t border-terminal-border">
        <div className="text-xs text-terminal-muted">
          {">"} Terminal Chat v1.0
        </div>
      </div>
    </aside>
  );
}
