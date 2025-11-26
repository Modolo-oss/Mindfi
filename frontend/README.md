# MindFi Frontend

Terminal-style chat interface for interacting with the MindFi DeFi agent.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + Custom Terminal Components
- **State**: React Hooks + LocalStorage

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run development server:
   ```bash
   pnpm dev
   ```

3. Open browser:
   ```
   http://localhost:3000
   ```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Main page (chat orchestrator)
│   └── globals.css          # Global styles
├── components/
│   ├── terminal-chat/       # Chat UI components
│   │   ├── header.tsx       # App header
│   │   ├── sidebar.tsx      # Chat history sidebar
│   │   ├── chat-area.tsx    # Main chat area
│   │   ├── message-bubble.tsx # Message component
│   │   ├── empty-state.tsx  # Empty chat state
│   │   └── right-panel.tsx  # Portfolio/alerts/stats
│   └── ui/                  # Reusable UI components
├── lib/
│   └── utils.ts             # Utility functions
└── public/                  # Static assets
```

## Features

### Chat Interface
- Real-time message display
- User and agent message bubbles
- Typing indicators
- Command autocomplete (slash commands)
- Session management with LocalStorage

### Sidebar (Left)
- New chat creation
- Chat history with rename/delete
- Session persistence

### Right Panel
- **Portfolio**: Token balances with 24h changes
- **Alerts**: Liquidation warnings, DCA notifications
- **Stats**: System metrics and uptime

### Slash Commands
- `/swap` - Initiate token swap
- `/bridge` - Bridge tokens across chains
- `/balance` - Check wallet balance
- `/payment` - Create payment

## Design Theme

**Terminal Retro Style**
- Dark background (`#0a0e27`)
- Bright green accents (`#a8ff60`)
- Monospace fonts (JetBrains Mono, IBM Plex Mono)
- Clean borders and minimal effects
- Responsive layout (mobile-first)

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Integration with Backend

The frontend communicates with the MindFi backend via REST API:

```typescript
// Example API call
const response = await fetch('http://localhost:8787/agent/chat/session-id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'swap 1 ETH to USDC' }
    ]
  })
});
```

## LocalStorage Keys

- `mindfi-chats` - Array of chat sessions
- `mindfi-current-chat` - Currently active chat ID

## Responsive Breakpoints

- Mobile: < 768px (sidebar/right panel hidden, toggle buttons)
- Tablet: 768px - 1024px (sidebar visible, right panel toggle)
- Desktop: > 1024px (all panels visible)

## Future Enhancements

- [ ] Real-time WebSocket connection
- [ ] Voice input support
- [ ] Transaction history visualization
- [ ] Multi-wallet support
- [ ] Dark/light theme toggle
- [ ] Export chat history

