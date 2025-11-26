import { Zap, MessageSquare, Settings, Code } from "lucide-react"

export default function EmptyState() {
  const examples = [
    { icon: MessageSquare, text: "Swap 1 ETH to USDC", color: "#a8ff60" },
    { icon: Zap, text: "Check my balance", color: "#a8ff60" },
    { icon: Code, text: "Bridge tokens", color: "#a8ff60" },
    { icon: Settings, text: "Create payment", color: "#a8ff60" },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6">
      <div>
        <div className="text-3xl font-mono font-bold text-[#a8ff60] mb-2">&gt; MindFi</div>
        <div className="text-sm font-mono text-[#666666]">Where minds meet DeFi</div>
      </div>

      <div className="space-y-3 w-full max-w-sm">
        <div className="text-xs font-mono text-[#666666] mb-4">&gt; Examples:</div>
        <div className="grid grid-cols-2 gap-3">
          {examples.map((ex, i) => {
            const Icon = ex.icon
            return (
              <div
                key={i}
                className="p-3 bg-[#1e2749] border border-[#1a1f3a] rounded hover:border-[#a8ff60] hover:bg-[#2a3254] transition-colors cursor-pointer"
              >
                <Icon size={16} className="mx-auto mb-2" style={{ color: ex.color }} />
                <div className="text-xs font-mono text-[#e0e0e0]">{ex.text}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="text-xs font-mono text-[#666666] pt-4 border-t border-[#1a1f3a]">
        Press <span className="text-[#a8ff60]">/</span> to see available commands
      </div>
    </div>
  )
}
