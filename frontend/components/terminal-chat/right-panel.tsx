"use client"

import { TrendingUp, AlertCircle, Clock } from "lucide-react"

interface Message {
  id: string
  text: string
  role: "user" | "assistant"
  timestamp: string
}

interface RightPanelProps {
  messages: Message[]
}

export default function RightPanel({ messages }: RightPanelProps) {
  const portfolioItems = [
    { symbol: "ETH", value: "$2,340", change: "+1.85%", color: "#a8ff60" },
    { symbol: "USDC", value: "$15,230", change: "+0.00%", color: "#a8ff60" },
    { symbol: "XAVA", value: "$24,880", change: "+3.42%", color: "#a8ff60" },
  ]

  const alerts = [
    { type: "Liquidation", message: "AAVE position guard active", time: "2m ago" },
    { type: "DCA", message: "ETH DCA executes in 2 hours", time: "15m ago" },
  ]

  return (
    <div className="w-64 sm:w-72 lg:w-96 border-l border-[#1a1f3a] bg-[#0a0e27] flex flex-col h-full overflow-y-auto">
      {/* Portfolio Section */}
      <div className="p-4 border-b border-[#1a1f3a]">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[#a8ff60]" />
          <h3 className="text-sm font-mono font-bold text-[#a8ff60]">&gt; PORTFOLIO</h3>
        </div>
        <div className="space-y-3">
          {portfolioItems.map((item) => (
            <div key={item.symbol} className="bg-[#1e2749] border border-[#1a1f3a] rounded p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-sm font-bold text-[#a8ff60]">{item.symbol}</span>
                <span className="font-mono text-xs text-[#666666]">{item.change}</span>
              </div>
              <div className="font-mono text-sm text-[#e0e0e0]">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts Section */}
      <div className="p-4 border-b border-[#1a1f3a]">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={16} className="text-[#a8ff60]" />
          <h3 className="text-sm font-mono font-bold text-[#a8ff60]">&gt; ALERTS</h3>
        </div>
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className="bg-[#1e2749] border border-[#1a1f3a] rounded p-2">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs text-[#a8ff60] font-bold flex-shrink-0">[{alert.type}]</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-[#e0e0e0] line-clamp-2">{alert.message}</div>
                  <div className="font-mono text-xs text-[#666666] mt-1">{alert.time}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-4 flex-1">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-[#a8ff60]" />
          <h3 className="text-sm font-mono font-bold text-[#a8ff60]">&gt; STATS</h3>
        </div>
        <div className="bg-[#1e2749] border border-[#1a1f3a] rounded p-3 space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-[#666666]">Messages:</span>
            <span className="text-[#a8ff60]">{messages?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666666]">Uptime:</span>
            <span className="text-[#a8ff60]">99.9%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666666]">Status:</span>
            <span className="text-[#a8ff60]">Online</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666666]">Memory:</span>
            <span className="text-[#a8ff60]">842 MB</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1f3a] p-4 text-center text-xs text-[#666666] font-mono">
        &gt; MindFi Monitor
      </div>
    </div>
  )
}
