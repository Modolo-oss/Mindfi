"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Loader2, User, Bot, Terminal } from "lucide-react";
import { Message } from "@/types";
import { cn } from "@/lib/utils";

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

export function ChatArea({ messages, isLoading, onSendMessage }: ChatAreaProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <main className="flex-1 flex flex-col bg-terminal-bg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-terminal-muted">
            <Terminal className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Welcome to MindFi Terminal</p>
            <p className="text-sm mt-2">Ask me anything about crypto, DeFi, or trading</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role !== "user" && (
                <div className="w-8 h-8 rounded bg-terminal-green/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-terminal-green" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[70%] rounded-lg p-3",
                  message.role === "user"
                    ? "bg-terminal-border text-terminal-text"
                    : "bg-terminal-surface border border-terminal-border"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-xs font-medium",
                    message.role === "user" ? "text-terminal-blue" : "text-terminal-green"
                  )}>
                    {message.role === "user" ? "$ YOU" : "> SYSTEM"}
                  </span>
                  <span className="text-xs text-terminal-muted">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-terminal-border">
                    <div className="text-xs text-terminal-muted">
                      Tools used: {message.toolCalls.map(t => t.name).join(", ")}
                    </div>
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded bg-terminal-blue/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-terminal-blue" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded bg-terminal-green/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-terminal-green" />
            </div>
            <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-terminal-green animate-spin" />
                <span className="text-sm text-terminal-muted">Processing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-terminal-border bg-terminal-surface">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message ..."
              className="w-full terminal-input resize-none h-12 py-3"
              disabled={isLoading}
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "terminal-button px-6",
              (!input.trim() || isLoading) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
        <div className="flex justify-between mt-2 text-xs text-terminal-muted">
          <span>{">"} Ready</span>
          <span>Shift+Enter for newline</span>
        </div>
      </div>
    </main>
  );
}
