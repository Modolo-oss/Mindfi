"use client";

import { TrendingUp, TrendingDown, Bell, Activity, RefreshCw } from "lucide-react";
import { TokenPrice, Alert, ServerStats } from "@/types";
import { formatPrice, formatChange, cn } from "@/lib/utils";

interface RightSidebarProps {
  portfolio: TokenPrice[];
  alerts: Alert[];
  stats: ServerStats;
  onRefreshPortfolio: () => void;
  isRefreshing: boolean;
}

export function RightSidebar({ 
  portfolio, 
  alerts, 
  stats, 
  onRefreshPortfolio,
  isRefreshing 
}: RightSidebarProps) {
  return (
    <aside className="w-72 bg-terminal-surface border-l border-terminal-border flex flex-col overflow-hidden">
      <div className="p-3 border-b border-terminal-border flex items-center justify-between">
        <h2 className="text-terminal-green font-semibold flex items-center gap-2">
          <span>{">"}</span> PORTFOLIO
        </h2>
        <button 
          onClick={onRefreshPortfolio}
          disabled={isRefreshing}
          className="p-1 hover:bg-terminal-border rounded transition-colors"
        >
          <RefreshCw className={cn(
            "w-4 h-4 text-terminal-muted",
            isRefreshing && "animate-spin"
          )} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {portfolio.map((token) => (
            <div
              key={token.symbol}
              className="p-3 rounded bg-terminal-bg/50 hover:bg-terminal-border/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-terminal-text">
                  {token.symbol}
                </span>
                <span className={cn(
                  "text-xs flex items-center gap-1",
                  token.change24h >= 0 ? "text-terminal-green" : "text-terminal-red"
                )}>
                  {token.change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {formatChange(token.change24h)}
                </span>
              </div>
              <div className="text-lg font-mono text-terminal-text mt-1">
                {formatPrice(token.price)}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-terminal-border">
          <h2 className="text-terminal-green font-semibold flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4" />
            <span>{">"}</span> ALERTS
          </h2>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-terminal-muted text-sm p-2">No alerts</div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-2 rounded bg-terminal-bg/50 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <span className={cn(
                      "text-xs font-semibold px-1.5 py-0.5 rounded",
                      alert.type === "system" && "bg-terminal-blue/20 text-terminal-blue",
                      alert.type === "update" && "bg-terminal-green/20 text-terminal-green",
                      alert.type === "price" && "bg-terminal-yellow/20 text-terminal-yellow",
                      alert.type === "trade" && "bg-terminal-red/20 text-terminal-red"
                    )}>
                      [{alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}]
                    </span>
                    <div className="flex-1">
                      <div className="text-terminal-text">{alert.title}</div>
                      <div className="text-terminal-muted text-xs mt-0.5">
                        {new Date(alert.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} ago
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 border-t border-terminal-border">
          <h2 className="text-terminal-green font-semibold flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" />
            <span>{">"}</span> STATS
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-terminal-muted">Messages:</span>
              <span className="text-terminal-text">{stats.messages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">Uptime:</span>
              <span className="text-terminal-text">{stats.uptime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">Status:</span>
              <span className={cn(
                stats.status === "online" ? "text-terminal-green" : "text-terminal-red"
              )}>
                {stats.status.charAt(0).toUpperCase() + stats.status.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">Memory:</span>
              <span className="text-terminal-text">{stats.memory}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-terminal-border">
        <button className="w-full text-sm text-terminal-muted hover:text-terminal-text transition-colors">
          {">"} Terminal Monitor
        </button>
      </div>
    </aside>
  );
}
