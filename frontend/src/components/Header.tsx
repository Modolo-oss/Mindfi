"use client";

import { Circle, Wifi, WifiOff } from "lucide-react";
import { MCPServerStatus } from "@/types";

interface HeaderProps {
  serverStatus: MCPServerStatus;
}

export function Header({ serverStatus }: HeaderProps) {
  return (
    <header className="h-12 bg-terminal-surface border-b border-terminal-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Circle className="w-3 h-3 fill-terminal-green text-terminal-green" />
          <span className="text-terminal-green font-semibold text-lg tracking-wider">
            {">"} TERMINAL
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          {serverStatus.connected ? (
            <>
              <Wifi className="w-4 h-4 text-terminal-green" />
              <span className="text-terminal-green">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-terminal-red" />
              <span className="text-terminal-red">Disconnected</span>
            </>
          )}
        </div>
        <span className="text-terminal-muted text-sm">v1.0.0</span>
      </div>
    </header>
  );
}
