"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, ArrowDown } from "lucide-react"
import MessageBubble from "./message-bubble"
import EmptyState from "./empty-state"

interface Message {
  id: string
  text: string
  role: "user" | "assistant"
  timestamp: string
}

interface ChatAreaProps {
  messages: Message[]
  onSendMessage: (text: string) => void
  currentChatId: string | null
  isLoading?: boolean
}

export default function ChatArea({ messages, onSendMessage, currentChatId, isLoading = false }: ChatAreaProps) {
  const [input, setInput] = useState("")
  const [showCommands, setShowCommands] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const prevMessagesLengthRef = useRef(messages.length)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Handle scroll detection
  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50 // 50px threshold
    
    setIsUserScrolling(!isAtBottom)
  }

  // Auto-scroll only when new messages arrive and user is at bottom
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessagesLengthRef.current
    prevMessagesLengthRef.current = messages.length

    if (hasNewMessages && !isUserScrolling) {
    scrollToBottom()
    }
  }, [messages, isUserScrolling])

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (isLoading && !isUserScrolling) {
      setTimeout(() => scrollToBottom(), 100)
    }
  }, [isLoading, isUserScrolling])

  const commands = [
    { cmd: "/swap", desc: "Swap tokens" },
    { cmd: "/bridge", desc: "Bridge tokens" },
    { cmd: "/balance", desc: "Check wallet balance" },
    { cmd: "/price", desc: "Get token price" },
    { cmd: "/payment", desc: "Create payment" },
  ]

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSendMessage(input)
    setInput("")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setInput(text)
    setShowCommands(text.startsWith("/"))
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0e27] border-r border-[#1a1f3a] relative min-h-0">
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-4 min-h-0"
        style={{ maxHeight: '100%' }}
      >
        {messages.length === 0 ? <EmptyState /> : messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-md px-4 py-3 rounded border font-mono text-sm bg-[#1a1f3a] text-[#e0e0e0] border-[#1a1f3a]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#666666]">&gt; MindFi</span>
                <span className="text-xs text-[#666666]">{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 items-center">
              <span
                className="w-2 h-2 bg-[#a8ff60] rounded-full animate-bounce"
                    style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
              ></span>
              <span
                className="w-2 h-2 bg-[#a8ff60] rounded-full animate-bounce"
                    style={{ animationDelay: "200ms", animationDuration: "1.4s" }}
              ></span>
              <span
                className="w-2 h-2 bg-[#a8ff60] rounded-full animate-bounce"
                    style={{ animationDelay: "400ms", animationDuration: "1.4s" }}
              ></span>
                </div>
                <span className="text-[#666666] text-xs font-mono animate-pulse">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {isUserScrolling && (
        <button
          onClick={() => {
            scrollToBottom()
            setIsUserScrolling(false)
          }}
          className="absolute bottom-24 right-8 bg-[#1e2749] hover:bg-[#a8ff60] text-[#a8ff60] hover:text-[#0a0e27] p-3 rounded-full border border-[#a8ff60] shadow-lg transition-all duration-200 z-10"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={20} />
        </button>
      )}

      {/* Input Area */}
      <div className="border-t border-[#1a1f3a] bg-[#0a0e27] p-4 md:p-6 flex-shrink-0">
        {showCommands && (
          <div className="mb-3 bg-[#1e2749] border border-[#1a1f3a] rounded p-3">
            <div className="text-xs font-mono text-[#a8ff60] mb-2">&gt; Commands</div>
            <div className="space-y-1">
              {commands.map((c) => (
                <div key={c.cmd} className="text-xs font-mono text-[#e0e0e0] flex justify-between gap-2">
                  <span className="flex-shrink-0">{c.cmd}</span>
                  <span className="text-[#666666] text-right text-xs">{c.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 md:gap-3 flex-col sm:flex-row">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={isLoading ? "Processing your request..." : "Type a message..."}
            disabled={isLoading}
            className="flex-1 bg-[#1e2749] text-[#e0e0e0] placeholder-[#666666] border border-[#1a1f3a] rounded p-3 font-mono text-sm resize-none focus:outline-none focus:border-[#a8ff60] focus:ring-1 focus:ring-[#a8ff60] transition-colors max-h-32 disabled:opacity-50 disabled:cursor-wait"
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-[#a8ff60] text-[#0a0e27] px-3 md:px-4 py-3 rounded font-mono font-bold hover:bg-[#96e64f] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 sm:self-end"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0a0e27] border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Processing...</span>
              </>
            ) : (
              <>
            <Send size={18} />
            <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-mono text-[#666666]">
          <span>{isLoading ? "&gt; Processing..." : "&gt; Ready"}</span>
          <span className="hidden sm:inline">{isLoading ? "Please wait..." : "Shift+Enter for newline"}</span>
        </div>
      </div>
    </div>
  )
}
