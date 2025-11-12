## MindFi — Implementation Plan (Sprint 0)

### Objectives
- Stand up a runnable Nullshot TypeScript Agent workspace tailored for MindFi.
- Integrate Thirdweb MCP endpoint (toolbox configuration + env placeholders).
- Scaffold core agent/service skeletons mapped to the architecture in `project-vision.md`.

### Workstreams
1. **Workspace Scaffolding**
   - Initialize Node project (`package.json`, tsconfig, linting baseline).
   - Add Wrangler config + placeholders for secrets (`THIRDWEB_SECRET_KEY`, etc.).
   - Create `.dev.vars.example` for local development guidance.
2. **Configuration Assets**
   - Define `mcp.json` with Thirdweb MCP entry (tool filter to swap/payment/tooling set).
   - Document env/secret management in `docs/setup-guide.md`.
3. **Agent Topology Skeleton**
   - `src/agents/DefiPortfolioAgent.ts` orchestrator stub.
   - Modules for swap execution, strategy, payment/buyback agents.
   - Shared services (ToolboxService wrapper, Thirdweb client helpers, caching/logging placeholders).
4. **Integration Points**
   - ToolboxService configured with Thirdweb endpoint via env.
   - External service stubs for webhook/payment verification (Thirdweb REST).
   - Placeholder workflows/queues definitions aligned with roadmap.
5. **Documentation & DX**
   - Update `README.md` dengan instruksi bootstrap, contoh payload, dan autonomous check.
   - Expand `docs/nullshot-keypoints.md` jika ada insight tambahan saat implementasi.

### Next Steps
1. Scaffold workspace + configs.
2. Implement agents/services skeletons with TODOs for data flow.
3. Wire Thirdweb MCP + env secrets.
4. Iterate towards functional MVP (swap route, payment demo, dashboard stubs).

