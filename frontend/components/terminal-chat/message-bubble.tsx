interface Message {
  id: string
  text: string
  role: "user" | "assistant"
  timestamp: string
}

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const time = new Date(message.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-md px-4 py-3 rounded border font-mono text-sm ${
          isUser ? "bg-[#1e2749] text-[#a8ff60] border-[#a8ff60]" : "bg-[#1a1f3a] text-[#e0e0e0] border-[#1a1f3a]"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold ${isUser ? "text-[#a8ff60]" : "text-[#666666]"}`}>
            {isUser ? "$ YOU" : "> MindFi"}
          </span>
          <span className="text-xs text-[#666666]">{time}</span>
        </div>
        <p className="break-words whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  )
}
