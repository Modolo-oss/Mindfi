# OpenRouter Integration

MindFi uses OpenRouter AI to enable natural language processing for DeFi commands.

## Model

- **Provider**: OpenRouter
- **Model**: `zukijourney/glm-4.5-air:free`
- **Purpose**: Natural language understanding and response generation

## Features

### 1. Intent Parsing
Converts natural language to structured commands:

```
User: "I want to swap 100 USDC from Ethereum to XAVA on Avalanche"
↓
{
  command: "swap",
  params: {
    amount: "100",
    fromChain: "ethereum",
    toChain: "avalanche",
    fromToken: "USDC",
    toToken: "XAVA"
  },
  confidence: 0.95
}
```

### 2. Friendly Response Generation
Transforms technical responses into user-friendly messages:

```
Technical: "Swap 100 USDC (1 → 43114) sedang diproses."
↓
Friendly: "Great! I'm processing your swap of 100 USDC from Ethereum to XAVA on Avalanche. The transaction is being prepared and you'll receive a confirmation shortly. 🚀"
```

## Configuration

### Environment Variables

Add to `.dev.vars`:

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=zukijourney/glm-4.5-air:free
```

### Get API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up / Log in
3. Go to API Keys section
4. Create a new API key
5. Copy and add to `.dev.vars`

## Supported Commands

The AI can understand various natural language inputs:

### Swap
- "Swap 100 USDC to XAVA"
- "I want to exchange ETH for USDC"
- "Convert 50 tokens from Ethereum to Avalanche"

### Bridge
- "Bridge my tokens to Polygon"
- "Move USDC from Ethereum to Avalanche"
- "Transfer tokens cross-chain"

### Balance
- "What's my balance?"
- "Check wallet 0x123..."
- "Show my portfolio on Ethereum"

### Payment
- "Create a payment for $150"
- "I want to pay for strategy tier"
- "Generate payment link"

### Buyback
- "Execute XAVA buyback"
- "Buy back 1000 XAVA tokens"
- "Schedule buyback for Q1 2025"

### Strategy
- "Give me investment recommendations"
- "What should I do with my portfolio?"
- "Suggest a DeFi strategy"

## Fallback Behavior

If OpenRouter is unavailable or confidence is low (<0.6), MindFi falls back to:

1. **Keyword Detection**: Simple pattern matching
2. **Key-Value Parsing**: Extracts `key=value` pairs
3. **Direct Execution**: Processes command without AI enhancement

This ensures the system remains functional even without AI.

## Response Flow

```
User Input
    ↓
OpenRouter Intent Parsing (confidence check)
    ↓
Command Execution (Thirdweb APIs)
    ↓
OpenRouter Response Generation
    ↓
User-Friendly Output
```

## Cost Optimization

- **Free Model**: `zukijourney/glm-4.5-air:free` has no cost
- **Fallback**: Reduces API calls when unnecessary
- **Confidence Threshold**: Only uses AI when confident (>0.6)
- **Error Handling**: Graceful degradation to keyword matching

## Testing

Test natural language commands:

```bash
curl -X POST http://localhost:8787/agent/chat/test \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I want to swap 100 USDC from Ethereum to XAVA on Avalanche"
      }
    ]
  }'
```

Expected: AI parses intent, executes swap, returns friendly response.

## Limitations

1. **Free Model Limits**: May have rate limits or slower response times
2. **Accuracy**: Not 100% - fallback ensures functionality
3. **Context**: Currently stateless - doesn't remember conversation history
4. **Language**: Optimized for English, may work with other languages

## Future Enhancements

- [ ] Multi-turn conversation support
- [ ] Context-aware responses
- [ ] Multi-language support
- [ ] Custom fine-tuned model
- [ ] Streaming responses
- [ ] Voice input/output

