"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatArea } from "@/components/ChatArea";
import { RightSidebar } from "@/components/RightSidebar";
import { Message, Chat, TokenPrice, Alert, ServerStats, MCPServerStatus } from "@/types";
import { generateSessionId } from "@/lib/utils";

export default function Home() {
  const [sessionId] = useState(() => generateSessionId());
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingPortfolio, setIsRefreshingPortfolio] = useState(false);

  const [serverStatus, setServerStatus] = useState<MCPServerStatus>({
    connected: false,
    url: "https://mindfi-mcp.akusiapasij252.workers.dev",
    tools: 0,
  });

  const [portfolio, setPortfolio] = useState<TokenPrice[]>([
    { symbol: "BTC", name: "Bitcoin", price: 0, change24h: 0 },
    { symbol: "ETH", name: "Ethereum", price: 0, change24h: 0 },
    { symbol: "SOL", name: "Solana", price: 0, change24h: 0 },
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      type: "system",
      title: "API connection stable",
      message: "",
      timestamp: new Date(),
    },
  ]);

  const [stats, setStats] = useState<ServerStats>({
    messages: 0,
    uptime: "99.9%",
    status: "online",
    memory: "842 MB",
  });

  const activeChat = chats.find(c => c.id === activeChatId);

  const fetchServerStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/status");
      if (response.ok) {
        const data = await response.json();
        setServerStatus({
          connected: data.connected,
          url: data.url,
          tools: data.tools,
          lastPing: new Date(data.lastPing),
        });
        setStats(prev => ({
          ...prev,
          status: data.connected ? "online" : "offline",
        }));
      }
    } catch (error) {
      console.error("Failed to fetch server status:", error);
      setServerStatus(prev => ({ ...prev, connected: false }));
      setStats(prev => ({ ...prev, status: "offline" }));
    }
  }, []);

  const fetchPortfolio = useCallback(async () => {
    setIsRefreshingPortfolio(true);
    try {
      const response = await fetch("/api/portfolio");
      if (response.ok) {
        const data = await response.json();
        if (data.tokens && data.tokens.length > 0) {
          setPortfolio(data.tokens);
        }
      }
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    } finally {
      setIsRefreshingPortfolio(false);
    }
  }, []);

  useEffect(() => {
    fetchServerStatus();
    fetchPortfolio();

    const statusInterval = setInterval(fetchServerStatus, 30000);
    const portfolioInterval = setInterval(fetchPortfolio, 60000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(portfolioInterval);
    };
  }, [fetchServerStatus, fetchPortfolio]);

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!activeChatId) {
      createNewChat();
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setChats(prev =>
      prev.map(chat =>
        chat.id === activeChatId
          ? {
              ...chat,
              messages: [...chat.messages, userMessage],
              title: chat.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? "..." : "") : chat.title,
              updatedAt: new Date(),
            }
          : chat
      )
    );

    setStats(prev => ({ ...prev, messages: prev.messages + 1 }));
    setIsLoading(true);

    try {
      const chatMessages = [
        ...(activeChat?.messages || []).map(m => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content },
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: data.message || "I couldn't process that request. Please try again.",
        timestamp: new Date(),
        toolCalls: data.toolCalls?.map((tc: { name: string; input: Record<string, unknown>; result: string }) => ({
          id: `tool-${Date.now()}-${Math.random()}`,
          name: tc.name,
          input: tc.input,
          result: tc.result,
        })),
      };

      setChats(prev =>
        prev.map(chat =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: [...chat.messages, assistantMessage],
                updatedAt: new Date(),
              }
            : chat
        )
      );

      setStats(prev => ({ ...prev, messages: prev.messages + 1 }));

      if (data.toolCalls && data.toolCalls.length > 0) {
        setAlerts(prev => [
          {
            id: `alert-${Date.now()}`,
            type: "update",
            title: `Executed: ${data.toolCalls.map((tc: { name: string }) => tc.name).join(", ")}`,
            message: "",
            timestamp: new Date(),
          },
          ...prev.slice(0, 4),
        ]);
      }

    } catch (error) {
      console.error("Chat error:", error);
      
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please check if the API is configured correctly.",
        timestamp: new Date(),
      };

      setChats(prev =>
        prev.map(chat =>
          chat.id === activeChatId
            ? { ...chat, messages: [...chat.messages, errorMessage] }
            : chat
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeChatId, activeChat, sessionId, createNewChat]);

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, [chats.length, createNewChat]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header serverStatus={serverStatus} />
      
      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar
          chats={chats}
          activeChat={activeChatId}
          onSelectChat={setActiveChatId}
          onNewChat={createNewChat}
        />
        
        <ChatArea
          messages={activeChat?.messages || []}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
        
        <RightSidebar
          portfolio={portfolio}
          alerts={alerts}
          stats={stats}
          onRefreshPortfolio={fetchPortfolio}
          isRefreshing={isRefreshingPortfolio}
        />
      </div>
    </div>
  );
}
