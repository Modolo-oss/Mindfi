"use client"

import { useState, useEffect } from "react"
import Header from "@/components/terminal-chat/header"
import Sidebar from "@/components/terminal-chat/sidebar"
import ChatArea from "@/components/terminal-chat/chat-area"
import RightPanel from "@/components/terminal-chat/right-panel"
import { sendChatMessage, checkBackendHealth } from "@/lib/api"

export default function Home() {
  const [chats, setChats] = useState<any[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [backendOnline, setBackendOnline] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedChats = localStorage.getItem("mindfi-chats")
    const savedCurrentId = localStorage.getItem("mindfi-current-chat")

    if (savedChats) {
      const parsedChats = JSON.parse(savedChats)
      setChats(parsedChats)

      if (savedCurrentId) {
        setCurrentChatId(savedCurrentId)
        const currentChat = parsedChats.find((c: any) => c.id === savedCurrentId)
        if (currentChat) {
          setMessages(currentChat.messages || [])
        }
      } else if (parsedChats.length > 0) {
        // If no current chat but chats exist, select the first one
        setCurrentChatId(parsedChats[0].id)
        setMessages(parsedChats[0].messages || [])
      } else {
        // Empty chats array and no currentChatId - create default chat
        const defaultId = Date.now().toString()
        const defaultChat = { id: defaultId, title: "New Chat", messages: [] }
        setChats([defaultChat])
        setCurrentChatId(defaultId)
        setMessages([])
      }
    } else {
      // No saved chats, create a default one
      const defaultId = Date.now().toString()
      const defaultChat = { id: defaultId, title: "New Chat", messages: [] }
      setChats([defaultChat])
      setCurrentChatId(defaultId)
      setMessages([])
    }

    // Check backend health
    checkBackendHealth().then(setBackendOnline)
    
    // Periodic health check every 30 seconds
    const healthCheckInterval = setInterval(() => {
      checkBackendHealth().then(setBackendOnline)
    }, 30000)

    return () => clearInterval(healthCheckInterval)
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem("mindfi-chats", JSON.stringify(chats))
  }, [chats, mounted])

  useEffect(() => {
    if (!mounted || !currentChatId) return
    localStorage.setItem("mindfi-current-chat", currentChatId)
  }, [currentChatId, mounted])

  const handleNewChat = () => {
    const newId = Date.now().toString()
    const newChat = { id: newId, title: "New Chat", messages: [] }
    setChats([newChat, ...chats])
    setCurrentChatId(newId)
    setMessages([])
  }

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId)
    const chat = chats.find((c) => c.id === chatId)
    setMessages(chat?.messages || [])
  }

  const handleSendMessage = async (text: string) => {
    console.log("handleSendMessage called with:", { text, currentChatId, hasText: !!text.trim() })
    
    if (!text.trim()) {
      console.warn("Empty message, ignoring")
      return
    }

    // Ensure we have a chat session
    let activeChatId = currentChatId
    if (!activeChatId) {
      console.warn("No currentChatId! Creating a new chat...")
      const newId = Date.now().toString()
      const newChat = { id: newId, title: "New Chat", messages: [] }
      setChats([newChat, ...chats])
      setCurrentChatId(newId)
      activeChatId = newId
    }

    const userMessage = {
      id: Date.now().toString(),
      text,
      role: "user" as const,
      timestamp: new Date().toISOString(),
    }

    console.log("Adding user message:", userMessage)
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    // Update chat
    setChats((prevChats) => 
      prevChats.map((c) => (c.id === activeChatId ? { ...c, messages: updatedMessages } : c))
    )

    // Send to backend with full conversation history for context
    setIsLoading(true)
    try {
      console.log("Sending to backend with chatId:", activeChatId)
      console.log("Conversation history:", updatedMessages.length, "messages")
      
      // Convert frontend messages to backend format (include full history)
      const conversationHistory = updatedMessages.map((msg) => ({
        role: msg.role,
        content: msg.text,
      }))
      
      const response = await sendChatMessage(activeChatId, conversationHistory)

      const botMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: response.message || "No response from backend",
        role: "assistant" as const,
        timestamp: new Date().toISOString(),
        data: response.data,
      }

      const messagesWithBot = [...updatedMessages, botMessage]
      setMessages(messagesWithBot)
      setChats((prevChats) => 
        prevChats.map((c) => (c.id === activeChatId ? { ...c, messages: messagesWithBot } : c))
      )
    } catch (error) {
      console.error("Failed to send message:", error)
      
      // Get specific error message if available
      const errorText = error instanceof Error 
        ? error.message 
        : "Failed to connect to MindFi backend. Please ensure the backend is running on http://localhost:8787"
      
      const errorMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: `❌ ${errorText}`,
        role: "assistant" as const,
        timestamp: new Date().toISOString(),
      }

      const messagesWithError = [...updatedMessages, errorMessage]
      setMessages(messagesWithError)
      setChats((prevChats) => 
        prevChats.map((c) => (c.id === activeChatId ? { ...c, messages: messagesWithError } : c))
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteChat = (chatId: string) => {
    const filtered = chats.filter((c) => c.id !== chatId)
    setChats(filtered)
    if (currentChatId === chatId) {
      setCurrentChatId(filtered[0]?.id || null)
      setMessages(filtered[0]?.messages || [])
    }
  }

  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats(chats.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c)))
  }

  if (!mounted) return null

  return (
    <div className="h-screen bg-[#0a0e27] text-[#e0e0e0] flex flex-col overflow-hidden">
      {/* Connection Status Banner */}
      {!backendOnline && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-center text-sm font-mono text-red-200">
          ⚠️ Backend offline - Please start backend server (cd backend && pnpm dev)
        </div>
      )}
      
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onPanelClick={() => setRightPanelOpen(!rightPanelOpen)}
      />
      <div className="flex flex-1 overflow-hidden gap-0 relative">
        {/* Sidebar - hidden on mobile, visible on tablet+ */}
        <div
          className={`absolute md:relative left-0 top-0 h-full z-30 md:z-0 transform transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <Sidebar
            chats={chats}
            currentChatId={currentChatId}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            onRenameChat={handleRenameChat}
          />
        </div>

        {/* Sidebar backdrop on mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Chat Area - full width on mobile, flex on tablet+ */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <ChatArea messages={messages} onSendMessage={handleSendMessage} currentChatId={currentChatId} isLoading={isLoading} />
        </div>

        {/* Right Panel - hidden on mobile, visible on lg+ */}
        <div
          className={`absolute lg:relative right-0 top-0 h-full z-30 lg:z-0 transform transition-transform duration-300 ${
            rightPanelOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
        >
          <RightPanel messages={messages} />
        </div>

        {/* Right panel backdrop on mobile/tablet */}
        {rightPanelOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setRightPanelOpen(false)} />
        )}
      </div>
    </div>
  )
}
