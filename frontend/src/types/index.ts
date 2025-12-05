export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
}

export interface Alert {
  id: string;
  type: "system" | "update" | "price" | "trade";
  title: string;
  message: string;
  timestamp: Date;
}

export interface ServerStats {
  messages: number;
  uptime: string;
  status: "online" | "offline" | "connecting";
  memory: string;
}

export interface Portfolio {
  tokens: TokenPrice[];
  totalValue: number;
  change24h: number;
}

export interface MCPServerStatus {
  connected: boolean;
  url: string;
  tools: number;
  lastPing?: Date;
}
