# Nullshot Framework - Ringkasan dari Dokumentasi yang Dipaste

## 📚 OVERVIEW FRAMEWORK (dari text yang dipaste)

### Core Philosophy
- **🤝 Interoperability First**: AI Agents sebagai teammates dan organizations yang bisa generate revenue dan perform advanced operations
- **💰 Cost-Effective Hosting**: Shared hosting options dengan edge-optimized performance
- **🔒 Security by Design**: Secure sensitive assets seperti trading agents dan treasuries
- **📈 Self-Improvement**: Agents yang evolve berdasarkan collective usage patterns
- **🔓 No Vendor Lock-in**: Full self-hosting dan personal account options

**Goal**: Empower laymen users untuk effortlessly self host AI Agents, MCP tools dan data/context yang supercharges experience sambil rewarding contributors & developers.

### Architecture Components (dari text yang dipaste)

#### 1. Sessions
Multi-session support dengan robust authentication patterns:
- **Persistent Context**: Maintain conversation state across interactions
- **User Management**: Handle authentication and authorization seamlessly
- **Session Isolation**: Secure separation antara different user sessions

#### 2. Agents made Easy
Deep integration dengan modern AI tooling:
- **Model Agnostic**: Work dengan any LLM provider melalui standardized interfaces
- **Tool Calling**: Native support untuk function calling dan tool execution
- **Streaming Support**: Real-time response streaming untuk better UX
- **Inclusive SDK Support**: Support AI SDK, Agents SDK, ElizaOS, dan more
- **Model Agnostic**: Make it dead simple untuk bring your own keys ke any AI model

#### 3. MCP Tools for Everyone
Ensure MCP Tools are dead simple to use dan can run anywhere:
- **Cost Effective**: MCP Tools run locally when necessary, in the cloud only when used, dan reward their builders
- **Play Safely**: Ensure tools run in secure boxes on your machines dan in their own private clouds
- **Clear Direction**: Provide type-safe examples yang showcase opinion on how AI Agents dan MCP tools speak to each other

#### 4. Services
Ensure Agents can connect, interact, dan consume traditional internet:
- **Data Ingestion**: Enable ability untuk ingest realtime data dari webhooks dan 3rd party services
- **Admin Mode Online**: Create capabilities untuk super users untuk manage, tweak dan configure brain of Agents
- **Sharing is Caring**: Ensure services are reusable packages yang can work across multiple use cases

#### 5. Middleware
Empower developers untuk customize dan react to user messages:
- **Tool Injection**: Easily configure dynamic tools dan inject them when necessary
- **Enrich Context**: Add or remove context untuk AI model untuk focus on achieving its goal
- **Custom Logic**: Add or override business logic without disturbing natural flow of ai models

### Key Features (dari text yang dipaste)

#### ✅ Ready for Production
- **Core MCP Framework**: Full Model Context Protocol implementation
- **Multi-Session Support**: Robust session management dengan authentication patterns
- **WebSocket & HTTP Support**: Official MCP WebSocket dan HTTP streaming support
- **Agent Framework**: Complete AI SDK integration untuk building intelligent agents
- **MCP Plugin System**: Seamless MCP plugins melalui mcp.json configuration

#### 🚧 In Active Development
- **Framework Integrations**: LangChain dan additional Agent SDK examples
- **Fullstack Examples**: Cloudflare Pages dengan Server-Sent Events
- **Advanced Auth**: OAuth dan JWT implementations

### Integration Ecosystem (dari text yang dipaste)
- **Getting Started**: Build your first agent dengan step-by-step guidance
- **AI SDK**: Complete integration dengan Vercel's AI SDK untuk model interactions
- **ElizaOS**: Compatibility layer untuk ElizaOS agent patterns
- **Agent SDK**: Native agent development toolkit

### Development Status (dari text yang dipaste)
- **Phase**: Pre-alpha dan actively evolving
- **Versioning**: Semantic versioning dengan automated releases
- **Testing**: Pull Request Testing dengan automatic testing dan semantic-release dry runs
- **Publishing**: Changed packages automatically published ke npm
- **Commits**: Conventional Commits untuk version determination

---

## 🤖 AGENT FRAMEWORK - GETTING STARTED (dari text yang dipaste)

### What You'll Build
By the end of guide, you'll have AI agent yang:
- **🧠 Converses intelligently** menggunakan Anthropic's Claude
- **💬 Maintains conversation context** across multiple interactions
- **🔄 Streams responses** in real-time untuk better UX
- **🚀 Scales automatically** on Cloudflare's edge network
- **🛠️ Supports MCP tools** untuk extended capabilities

### Prerequisites (dari text yang dipaste)
- Node.js 22+ dan pnpm installed
- Cloudflare account dengan Workers enabled
- Anthropic API key untuk Claude integration

### Quick Setup (dari text yang dipaste)
```bash
# 1. Clone and Install
npx @nullshot/cli create agent
pnpm install

# 2. Configure local Environment
cp .vars-example .dev.vars

# 3. Start Development
pnpm dev

# 4. Test Your Agent
curl -X POST http://localhost:8787/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello! Can you help me?"}]}'
```

### Architecture Overview (dari text yang dipaste)
Agent menggunakan **Cloudflare Durable Objects** untuk session management, ensuring:
- **Persistent Memory**: Conversations maintain context across interactions
- **Global Distribution**: Sessions accessible dari any Cloudflare edge location
- **Auto Scaling**: Each session runs independently

### Code Breakdown (dari text yang dipaste)

#### Core Imports and Setup
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { SimplePromptAgent } from "@nullshot/agent/agents";
import { anthropic } from "@ai-sdk/anthropic";
import type { AIUISDKMessage } from "@nullshot/agent/types";
```

**Key Components**:
- **Hono**: Fast, lightweight web framework untuk Cloudflare Workers
- **CORS**: Cross-origin resource sharing untuk web applications
- **SimplePromptAgent**: Base agent class dari SDK
- **Anthropic**: AI provider integration
- **Types**: TypeScript definitions untuk message handling

#### Main Application Setup
```typescript
const app = new Hono<{ Bindings: Env }>();

// Enable CORS untuk web applications
app.use("/agent/*", cors());

// Health check endpoint
app.get("/", (c) => c.text("Agent is running!"));
```

#### The SimplePromptAgent Class
```typescript
class SimplePromptAgent extends SimplePromptAgent<Env> {
  constructor(
    state: DurableObjectState,
    env: Env,
    model: any,
    // services?: Service[] // Uncomment untuk add MCP tools
  ) {
    super(state, env, model);
  }
}
```

**Key Features**:
- **Extends SimplePromptAgent**: Inherits session management dan streaming capabilities
- **Durable Object State**: Persistent storage untuk conversation history
- **Environment Access**: Cloudflare Workers environment variables
- **Model Integration**: AI provider (Anthropic Claude) connection

#### Message Processing Logic
```typescript
async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
  const result = await this.streamText(sessionId, {
    model: this.model,
    system: 'You are a helpful AI assistant. Be concise and helpful.',
    messages: messages.messages,
    maxSteps: 10,
    // experimental_toolCallStreaming: true, // Uncomment untuk tool streaming
  });

  return result.toDataStreamResponse();
}
```

**Process Breakdown**:
- **Session ID**: Unique identifier untuk conversation continuity
- **Messages**: Array of conversation messages (user + assistant)
- **System Prompt**: Defines the agent's personality dan behavior
- **Max Steps**: Limits reasoning steps untuk cost control
- **Streaming**: Returns real-time response stream

#### Chat Endpoint Handler
```typescript
app.post("/agent/chat/:sessionId?", async (c) => {
  const sessionId = c.req.param("sessionId") || crypto.randomUUID();
  const body = await c.req.json<AIUISDKMessage>();

  // Get Durable Object instance untuk this session
  const id = c.env.SIMPLE_PROMPT_AGENT.idFromName(sessionId);
  const stub = c.env.SIMPLE_PROMPT_AGENT.get(id);

  // Process the message through the agent
  return await stub.processMessage(sessionId, body);
});
```

**Endpoint Logic**:
- **Session Management**: Creates new session ID if none provided
- **Request Parsing**: Extracts JSON message payload
- **Durable Object Lookup**: Gets or creates session-specific agent instance
- **Message Processing**: Forwards request ke agent untuk handling

#### Durable Object Export
```typescript
export { SimplePromptAgent };

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
```

### Usage Examples (dari text yang dipaste)

#### Basic Chat Interaction
**Start new conversation**:
```bash
curl -X POST https://your-worker.workers.dev/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What is quantum computing?"
      }
    ]
  }'
```

**Continue existing conversation**:
```bash
curl -X POST https://your-worker.workers.dev/agent/chat/session-123 \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is quantum computing?"},
      {"role": "assistant", "content": "Quantum computing is a revolutionary approach..."},
      {"role": "user", "content": "Can you give me a simple analogy?"}
    ]
  }'
```

#### JavaScript Client Implementation (dari text yang dipaste)
```typescript
class AgentClient {
  constructor(private baseUrl: string) {}

  async sendMessage(message: string, sessionId?: string): Promise<ReadableStream> {
    const url = sessionId 
      ? `${this.baseUrl}/agent/chat/${sessionId}` 
      : `${this.baseUrl}/agent/chat`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.body!;
  }

  async *streamResponse(stream: ReadableStream): AsyncGenerator<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  }
}
```

#### React Hook Integration (dari text yang dipaste)
```typescript
import { useState, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useAgent(baseUrl: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = { role: "user", content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}/agent/chat/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;

        setMessages(prev => [
          ...prev.slice(0, -1), 
          { role: "assistant", content: assistantMessage }
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, sessionId, messages]);

  return { messages, sendMessage, isLoading, sessionId };
}
```

### Customization Options (dari text yang dipaste)

#### 1. Modify Agent Personality
```typescript
async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
  const result = await this.streamText(sessionId, {
    model: this.model,
    system: `You are a specialized coding assistant. 
             Always provide code examples and explain complex concepts simply.
             Be encouraging and patient with beginners.`,
    messages: messages.messages,
    maxSteps: 10,
  });

  return result.toDataStreamResponse();
}
```

#### 2. Add MCP Tools
```typescript
import { ToolboxService } from "@nullshot/agent/services";

class SimplePromptAgent extends SimplePromptAgent<Env> {
  constructor(state: DurableObjectState, env: Env, model: any) {
    super(state, env, model, [
      new ToolboxService(env, mcpConfig), // Enable MCP toolbox
    ]);
  }

  async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
    const result = await this.streamText(sessionId, {
      model: this.model,
      system: 'You are a helpful AI assistant with access to tools.',
      messages: messages.messages,
      maxSteps: 10,
      experimental_toolCallStreaming: true, // Enable tool streaming
    });

    return result.toDataStreamResponse();
  }
}
```

#### 3. Environment Configuration
Update `wrangler.jsonc`:
```json
{
  "name": "my-agent",
  "main": "src/index.ts",
  "compatibility_date": "2024-12-19",
  "vars": {
    "AI_PROVIDER": "anthropic"
  },
  "durable_objects": {
    "bindings": [
      {
        "name": "SIMPLE_PROMPT_AGENT",
        "class_name": "SimplePromptAgent",
        "script_name": "my-agent"
      }
    ]
  }
}
```

### Deployment (dari text yang dipaste)
```bash
# Deploy to Production
pnpm deploy

# View deployment logs
npx wrangler tail
```

### Environment Variables (dari text yang dipaste)
Set these as Cloudflare Workers secrets:
```bash
# Required: Anthropic API key
npx wrangler secret put ANTHROPIC_API_KEY

# Optional: Custom model configuration
npx wrangler secret put ANTHROPIC_MODEL # defaults to claude-3-haiku-20240307
```

### Next Steps (dari text yang dipaste)
- **Sessions**: Deep dive into session handling dan state management
- **AI SDK Integration**: Advanced AI provider configurations dan tool calling
- **MCP Tools**: Add external capabilities ke your agents
- **Middleware**: Custom request/response processing

### Troubleshooting (dari text yang dipaste)

#### Common Issues
- **Agent not responding**: Check Anthropic API key, verify wrangler.jsonc, review logs
- **CORS errors**: Ensure CORS enabled, check client origin
- **Session state lost**: Verify Durable Objects configured, check session ID consistency

#### Getting Help
- **Documentation**: Comprehensive guides dan API references
- **GitHub Issues**: Report bugs dan request features
- **Discord Community**: Real-time support dan discussions

---

## 💬 SESSIONS (dari text yang dipaste)

### Overview
Sessions enable you untuk maintain conversation context across multiple interactions. Every agent conversation gets its own unique session powered by **Cloudflare Durable Objects**, giving you persistent, stateful conversations yang scale automatically.

### The Magic: Durable Objects
The key insight adalah bahwa each session maps ke unique Durable Object instance. When you route ke `/agent/chat/abc123`, you're talking ke same persistent object every time. This is where the magic happens - your conversation state, memory, dan context live in that specific instance.

```typescript
// This is the core pattern - route to a unique AGENT instance
const agent = AGENT.get(id); // Gets the specific Durable Object for this session
```

### Quick Start: Default Router
The simplest setup uses default Hono router. It automatically handles session IDs dan routes ke right agent instance:

```typescript
import { Hono } from 'hono';
import { applyPermissionlessAgentSessionRouter } from '@nullshot/agent';
import { MyAgent } from './agents/my-agent';

// Use type assertion to make Hono app compatible with AgentRouterBuilder
const app = new Hono<{ Bindings: EnvWithAgent }>();
applyPermissionlessAgentSessionRouter(app);

export default {
  fetch: app.fetch,
};
```

**That's it!** You now have:
- `POST /agent/chat/:sessionId` - Send messages ke specific session (sessionId is generated untuk you on first message)
- Automatic Durable Object routing
- Persistent conversation state

### How Session Routing Works
The router implementation follows this pattern:
1. Extract session ID dari URL path (`/agent/chat/abc123`)
2. Generate Durable Object ID dari session ID
3. Route ke specific agent instance menggunakan `AGENT.get(id)`
4. Maintain conversation state in that persistent object

```typescript
// Simplified router logic
app.post('/chat/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const id = env.AGENT.idFromName(sessionId); // Create consistent DO ID
  const agent = env.AGENT.get(id); // Get the persistent instance
  return agent.fetch(c.req.raw); // Route to the agent
});
```

### Custom Routers
You don't need the default router. Here's minimal custom implementation:

```typescript
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.post('/chat/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  
  // Create Durable Object ID from session
  const id = c.env.AGENT.idFromName(sessionId);
  const agent = c.env.AGENT.get(id);
  
  // Forward the request to the agent
  return agent.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,
};
```

### The Agent Implementation
Your actual agent runs inside the Durable Object:

```typescript
export class MyAgent extends AiSdkAgent<Env> {
  constructor(state: DurableObjectState, env: Env, model: LanguageModel) {
    super(state, env, model);
  }

  async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
    // This is where the magic happens - persistent conversation state
    const result = await this.streamTextWithMessages(sessionId, messages.messages, {
      system: 'You are a helpful assistant.',
      maxSteps: 5,
      stopWhen: stepCountIs(5),
      experimental_toolCallStreaming: true,
    });

    return result.toTextStreamResponse();
  }
}
```

### Key Points

#### ✅ Do This
- **Always route to `AGENT.get(id)`** - This is crucial untuk persistence
- **Use meaningful session IDs** - They become Durable Object names
- **Let the framework handle state** - It's built untuk this

#### ❌ Avoid This
- **Don't try to manage state outside the agent**
- **Don't create new Durable Object IDs untuk same session**
- **Don't skip the routing layer** - it handles the magic dan will be key untuk future protocol dan permission use cases

### Production Patterns

#### Health Checks
```typescript
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});
```

#### Session Management API
```typescript
app.get('/sessions/:userId', async (c) => {
  const userId = c.req.param('userId');
  
  // Get user's sessions from database
  const sessions = await c.env.DB.prepare(
    'SELECT id, created_at, last_activity FROM sessions WHERE user_id = ?'
  ).bind(userId).all();
  
  return c.json(sessions);
});
```

#### Session Cleanup
```typescript
app.delete('/sessions/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  
  // Clean up database record
  await c.env.DB.prepare(
    'DELETE FROM sessions WHERE id = ?'
  ).bind(sessionId).run();
  
  // The Durable Object will be cleaned up automatically by Cloudflare
  return c.json({ message: 'Session deleted' });
});
```

### Next Steps (dari text yang dipaste)
- **Agent SDK** - Build your agent logic
- **AI SDK Integration** - Add AI models ke your agents
- **Platform Services** - Storage, analytics, dan more

**Remember**: The session is just a routing mechanism. The real magic happens inside your Durable Object agent instance. Keep it simple, let the framework handle the complexity, dan focus on building great conversational experiences! 🚀

---

## 🔧 MIDDLEWARE (dari text yang dipaste)

### Overview
Extend your agents dengan custom functionality. Middleware provides powerful way untuk services untuk inject tools atau override AI SDK functionality, enabling seamless integration of external services dan custom behavior in your agents.

### Key Features (dari text yang dipaste)
- **Tool Injection**: Dynamically add tools ke agents dari external services
- **AI SDK Override**: Customize how AI SDK methods behave
- **Service Integration**: Connect agents dengan external platforms dan APIs
- **Extensible Architecture**: Build reusable middleware components

### Getting Started

#### Basic Middleware Implementation
Create simple logging middleware:

```typescript
import { Middleware } from '@nullshot/agent';

export class LoggingMiddleware implements AiSdkMiddleware {
  async beforeStreamText(params: StreamTextParams): Promise<StreamTextParams> {
    console.log('🚀 Starting text generation:', {
      model: params.model,
      messageCount: params.messages?.length || 0
    });
    
    return params;
  }
  
  async afterStreamText(result: StreamTextResult, params: StreamTextParams): Promise<StreamTextResult> {
    console.log('✅ Text generation completed:', {
      usage: result.usage
    });
    
    return result;
  }
}
```

#### Agent Integration
Add middleware ke your agent melalui services parameter:

```typescript
import { AiSdkAgent } from '@nullshot/agent';
import { openai } from '@ai-sdk/openai';

export class MyAgent extends AiSdkAgent<Env> {
  constructor(state: DurableObjectState, env: Env, model: LanguageModel, services?: Service[]) {
    super(state, env, model, [new LoggingMiddleware(), ...(services || [])]);
  }

  async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
    // Middleware will automatically be applied to this call
    const result = await this.streamTextWithMessages(sessionId, messages.messages, {
      system: 'You are a helpful assistant.',
      maxSteps: 5,
      stopWhen: stepCountIs(5),
      experimental_toolCallStreaming: true,
    });

    return result.toTextStreamResponse();
  }
}
```

### Middleware Methods (dari text yang dipaste)

#### Pre-processing Hooks
- **`beforeStreamText(params: StreamTextParams): Promise<StreamTextParams>`**
  - Called before streamText executes. Modify parameters atau add context before AI processing.

- **`beforeGenerateText(params: GenerateTextParams): Promise<GenerateTextParams>`**
  - Called before generateText executes. Transform input parameters atau inject additional context.

- **`beforeGenerateObject(params: GenerateObjectParams): Promise<GenerateObjectParams>`**
  - Called before generateObject executes. Modify schema atau parameters before structured generation.

#### Post-processing Hooks
- **`afterStreamText(result: StreamTextResult, params: StreamTextParams): Promise<StreamTextResult>`**
  - Called after streamText completes. Transform results atau log completion data.

- **`afterGenerateText(result: GenerateTextResult, params: GenerateTextParams): Promise<GenerateTextResult>`**
  - Called after generateText completes. Modify the final result atau perform cleanup.

- **`afterGenerateObject(result: GenerateObjectResult, params: GenerateObjectParams): Promise<GenerateObjectResult>`**
  - Called after generateObject completes. Transform structured output atau validate results.

#### Tool and Context Injection
- **`injectTools(existingTools: Record<string, any>): Promise<Record<string, any>>`**
  - Add new tools ke agent's available tool set. Merge dengan existing tools.

- **`injectContext(messages: any[], context: AgentContext): Promise<any[]>`**
  - Modify atau enhance the message array before AI processing. Add system messages atau context.

### Examples (dari text yang dipaste)

#### Tool Injection Middleware
```typescript
import { tool } from 'ai';
import { z } from 'zod';

export class CustomToolsMiddleware implements AiSdkMiddleware {
  async injectTools(existingTools: Record<string, any>): Promise<Record<string, any>> {
    return {
      ...existingTools,
      getCurrentTime: tool({
        description: 'Get the current date and time',
        parameters: z.object({}),
        execute: async () => {
          return new Date().toISOString();
        },
      }),
      calculateSum: tool({
        description: 'Calculate the sum of two numbers',
        parameters: z.object({
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        }),
        execute: async ({ a, b }) => {
          return (a + b).toString();
        },
      }),
    };
  }
}
```

#### Context Enhancement Middleware
```typescript
export class ContextMiddleware implements AiSdkMiddleware {
  async injectContext(messages: any[], context: AgentContext): Promise<any[]> {
    const systemMessage = {
      role: 'system',
      content: `Current session: ${context.sessionId}. User timezone: ${context.timezone || 'UTC'}`
    };
    
    return [systemMessage, ...messages];
  }
  
  async beforeStreamText(params: StreamTextParams): Promise<StreamTextParams> {
    if (params.system) {
      params.system = `${params.system}\n\nRemember to be helpful and concise.`;
    }
    
    return params;
  }
}
```

#### Response Transformation Middleware
```typescript
export class ResponseMiddleware implements AiSdkMiddleware {
  async afterStreamText(result: StreamTextResult, params: StreamTextParams): Promise<StreamTextResult> {
    // Add metadata to the response
    if (result.text) {
      const enhanced = {
        ...result,
        metadata: {
          processedAt: new Date().toISOString(),
          model: params.model,
          tokenCount: result.usage?.totalTokens || 0
        }
      };
      
      return enhanced;
    }
    
    return result;
  }
}
```

#### Multiple Middleware Composition
```typescript
export class MultiServiceAgent extends AiSdkAgent<Env> {
  constructor(state: DurableObjectState, env: Env, model: LanguageModel) {
    super(state, env, model, [
      new LoggingMiddleware(),
      new CustomToolsMiddleware(),
      new ContextMiddleware(),
      new ResponseMiddleware()
    ]);
  }

  async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
    // All middleware will be applied in sequence
    const result = await this.streamTextWithMessages(sessionId, messages.messages, {
      system: 'You are an advanced AI assistant.',
      maxSteps: 10,
      stopWhen: stepCountIs(10),
      experimental_toolCallStreaming: true,
    });

    return result.toTextStreamResponse();
  }
}
```

#### Error Handling
```typescript
export class ErrorHandlingMiddleware implements AiSdkMiddleware {
  async beforeStreamText(params: StreamTextParams): Promise<StreamTextParams> {
    try {
      // Validate parameters
      if (!params.messages || params.messages.length === 0) {
        throw new Error('No messages provided');
      }
      
      return params;
    } catch (error) {
      console.error('Middleware error:', error);
      throw error;
    }
  }
  
  async afterStreamText(result: StreamTextResult, params: StreamTextParams): Promise<StreamTextResult> {
    try {
      return result;
    } catch (error) {
      console.error('Post-processing error:', error);
      return result; // Return original result to prevent cascade failures
    }
  }
}
```

### Best Practices (dari text yang dipaste)

#### Middleware Ordering
Apply middleware in logical order - each middleware processes in sequence:

```typescript
// Processing order: Logging → Tools → Context → Response
super(env,..., [
    new LoggingMiddleware(),      // First: Log requests
    new CustomToolsMiddleware(), // Second: Add tools
    new ContextMiddleware(),     // Third: Enhance context
    new ResponseMiddleware()     // Last: Transform responses
  ]
);
```

#### Keep Middleware Focused
Each middleware should have single responsibility:

```typescript
// ✅ Good: Single purpose
export class TimestampMiddleware implements AiSdkMiddleware {
  async injectContext(messages: any[], context: AgentContext): Promise<any[]> {
    const timestamp = { role: 'system', content: `Current time: ${new Date().toISOString()}` };
    return [timestamp, ...messages];
  }
}

// ❌ Avoid: Multiple responsibilities
export class EverythingMiddleware implements AiSdkMiddleware {
  // Don't do logging, tools, context, and validation all in one middleware
}
```

#### External Service Integration
For complex integrations seperti toolbox services, see the Toolbox Service implementation sebagai example of middleware usage.

### Next Steps (dari text yang dipaste)
- **Sessions** - Learn how middleware integrates dengan session management
- **AI SDK** - Explore AI SDK integration patterns
- **Platform Services** - Connect middleware dengan platform services

**Remember**: Middleware provides clean way untuk extend agent functionality without modifying core agent logic, enabling better separation of concerns dan reusable components.

---

## 🤖 AGENT SDK (dari text yang dipaste)

### Overview
Build AI-Powered Agents on Our Platform. We're bringing Cloudflare's powerful Agents SDK ke our platform, enabling you untuk build dan deploy AI-powered agents yang can autonomously perform tasks, communicate dengan clients in real-time, call AI models, persist state, schedule tasks, run asynchronous workflows, browse the web, dan much more.

### What's Coming to Our Platform (dari text yang dipaste)

#### 🔋 Batteries (State) Included
Your agents will come dengan built-in state management:
- **Automatic state synchronization** antara agents dan clients
- **Trigger events** on state changes
- **Built-in SQL database** untuk each agent
- **Persistent memory** across conversations

#### 💬 Real-Time Communication
Connect ke agents via WebSockets dan stream updates in real-time:
- **Handle long-running responses** dari AI models
- **Stream results** dari asynchronous workflows
- **Build interactive chat applications**
- **Real-time client updates** dan notifications

#### 🔧 Extensible by Design
Agents are code - bring your own tools dan integrations:
- **Use any AI models** you prefer
- **Integrate dengan external services** dan APIs
- **Add custom methods** ke your agents
- **Pull data** dari your existing databases

### Agent SDK Features Preview (dari text yang dipaste)
Based on Cloudflare's Agents SDK, you'll be able untuk create agents seperti this:

#### Built-in Capabilities
- **State Management**: Built-in `setState` dan SQL database access
- **Scheduling**: Native task scheduling dengan `this.schedule`
- **WebSocket Support**: Real-time bidirectional communication
- **HTTP Requests**: Make external API calls seamlessly
- **Long-Running Tasks**: Agents can run untuk minutes, hours, atau longer

### Get Ready (dari text yang dipaste)
While we integrate the Agents SDK ke our platform, here's how you can prepare:
- **Explore Cloudflare Agents**: Check out the official documentation untuk understand the capabilities
- **Review Our Platform**: Familiarize yourself dengan our Platform Overview
- **Join Our Community**: Stay updated on our Discord untuk the latest announcements

---

## ⚡ VERCEL AI SDK (dari text yang dipaste)

### Overview
The Vercel AI SDK integration provides streamlined way untuk build AI agents yang leverage Vercel's AI SDK untuk text generation sambil integrating seamlessly dengan our platform services. This guide shows you how untuk set up models, process messages via streaming, dan configure workers untuk agent access.

### Quick Start (dari text yang dipaste)

#### 1. Install Dependencies
```bash
npm install @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
npm install @nullshot/agent hono
```

#### 2. Set Up Your Environment
Add your API keys dan provider configuration ke your `.dev.vars` file:
```bash
# AI Provider Configuration
AI_PROVIDER=anthropic
AI_PROVIDER_API_KEY=sk-ant-your-anthropic-key
MODEL_ID=claude-3-5-sonnet-20241022

# Alternative providers:
# AI_PROVIDER=openai
# AI_PROVIDER_API_KEY=sk-your-openai-key
# MODEL_ID=gpt-4o

# AI_PROVIDER=google
# AI_PROVIDER_API_KEY=your-google-key
# MODEL_ID=gemini-pro
```

#### 3. Create Your First Agent
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModel, Provider, stepCountIs } from "ai";
import { AiSdkAgent, type AIUISDKMessage, ToolboxService, type MCPConfig } from "@nullshot/agent";
import mcpConfig from "../mcp.json";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: "*", // Allow any origin for development; restrict this in production
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    exposeHeaders: ["X-Session-Id"],
    maxAge: 86400, // 24 hours
  })
);

// Route all requests to the durable object instance based on session
app.all("/agent/chat/:sessionId?", async (c) => {
  const { AGENT } = c.env;
  var sessionIdStr = c.req.param("sessionId");
  if (!sessionIdStr || sessionIdStr == "") {
    sessionIdStr = AGENT.newUniqueId().toString();
  }
  const id = AGENT.idFromName(sessionIdStr);
  const forwardRequest = new Request(
    "https://internal.com/agent/chat/" + sessionIdStr,
    {
      method: c.req.method,
      body: c.req.raw.body,
    }
  );
  return await AGENT.get(id).fetch(forwardRequest);
});

export class SimpleAgent extends AiSdkAgent {
  constructor(state: DurableObjectState, env: Env) {
    // Configure AI provider based on environment
    let provider: Provider;
    let model: LanguageModel;
    
    switch (env.AI_PROVIDER) {
      case "anthropic":
        provider = createAnthropic({
          apiKey: env.AI_PROVIDER_API_KEY,
        });
        model = provider.languageModel(env.MODEL_ID);
        break;
      case "openai":
        provider = createOpenAI({
          apiKey: env.AI_PROVIDER_API_KEY,
        });
        model = provider.languageModel(env.MODEL_ID);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
    }

    super(state, env, model, [new ToolboxService(env, mcpConfig)]);
  }

  async processMessage(
    sessionId: string,
    messages: AIUISDKMessage
  ): Promise<Response> {
    // Use the protected streamTextWithMessages method
    const result = await this.streamTextWithMessages(
      sessionId,
      messages.messages,
      {
        system: "You are a helpful assistant.",
        maxSteps: 10,
        stopWhen: stepCountIs(10),
        experimental_toolCallStreaming: true,
        onError: (error: unknown) => {
          console.error("Error processing message", error);
        },
      }
    );

    return result.toTextStreamResponse();
  }
}
```

### Advanced Configuration (dari text yang dipaste)

#### Dynamic Model Selection
You can implement dynamic model selection based on message content atau user preferences. Example includes:
- Use faster model untuk simple queries
- Use advanced model untuk complex tasks
- Customize system prompt based on conversation context

#### Streaming Responses
- **Basic Streaming dengan Platform Services**: Track request metrics, handle completion metrics
- **Advanced Streaming dengan Tools**: Enable tool streaming, automatic tool injection via ToolboxService

#### MCP Integration Example
The framework provides built-in MCP integration melalui ToolboxService. Configure your MCP servers in `mcp.json`:
```json
{
  "mcpServers": {
    "linear": {
      "url": "https://mcp.linear.app/sse",
    },
    "custom-worker": {
      "source": "github:null-shot/typescript-mcp-template"
    },
    "your-custom-mcp": {
      "source": "github:your-org/your-mcp-server"
    }
  }
}
```

**Configuration Options**:
- **url**: Use untuk standard public MCP servers dengan mcp:// protocol
- **source**: Use untuk GitHub-based MCPs, especially Cloudflare Worker MCPs dengan format `github:owner/repo`

### Durable Objects untuk Session Management (dari text yang dipaste)
The framework leverages Cloudflare Durable Objects untuk persistent session management. Each agent instance maintains its own state dan can handle multiple concurrent conversations.

**The Durable Object pattern ensures**:
- **Session Isolation**: Each conversation maintains separate state
- **Automatic Scaling**: Sessions are created on-demand
- **Persistence**: Conversation history dan context are preserved
- **Global Distribution**: Sessions can be accessed dari any region

### Worker Setup (dari text yang dipaste)
Complete Worker dengan Durable Object Routing menggunakan Hono untuk routing dengan automatic session management melalui Durable Objects. Includes:
- CORS configuration untuk web clients
- Session-based routing ke Durable Objects
- Health check endpoint
- Environment variables configuration

### Multiple Agent Types (dari text yang dipaste)
You can create different agent classes untuk different use cases:
- **Conversational Agent**: Untuk deep, intellectual conversations
- **Document Processing Agent**: Untuk document upload dan processing
- **Video Analysis Agent**: Untuk video analysis dan processing

### Platform Service Integration (dari text yang dipaste)
Examples include:
- **Document Processing Agent**: Download documents, store in R2 Storage, queue untuk processing, store references in memory
- **Video Analysis Agent**: Upload videos ke Cloudflare Stream, track upload metrics, store video references

### Best Practices (dari text yang dipaste)

#### Error Handling dan Resilience
- Log each step untuk debugging
- Log error details
- Return graceful error response

#### Performance Optimization
- Check cache untuk similar responses
- Limit context window untuk performance
- Cache response untuk future use

### Next Steps (dari text yang dipaste)
- **Session Router**: Learn how untuk implement session routing untuk multi-user conversations
- **Tool Integration**: Add custom tools untuk specific business logic
- **Platform Services**: Explore all available platform services (Storage, Queues, Analytics, etc.)
- **Advanced Patterns**: Implement multi-agent workflows dan complex orchestration

**Remember**: The Vercel AI SDK integration provides powerful foundation untuk building intelligent agents yang can leverage the full capabilities of our platform sambil maintaining excellent performance dan user experience.

---

## 📝 CATATAN PENTING

**Semua informasi di atas adalah ringkasan dari text dokumentasi yang dipaste oleh user.**

**Key Takeaways**:
1. Framework menggunakan `SimplePromptAgent` sebagai base class
2. Menggunakan `this.streamText()` method dari base class (bukan langsung dari AI SDK)
3. MCP tools integration via `ToolboxService` injection
4. Session management otomatis handled oleh base class
5. Response format: `toDataStreamResponse()` untuk streaming
