export interface StrategyRecommendation {
  id: string;
  summary: string;
  riskScore: number;
  actions: Array<{ type: string; payload: Record<string, unknown> }>;
}

export class StrategyAgent {
  async generateRecommendations(sessionId: string): Promise<StrategyRecommendation[]> {
    // TODO: Pull portfolio state and synthesize AI strategies.
    return [
      {
        id: "placeholder",
        summary: "Enable DCA on ETH and hedge leverage on SOL.",
        riskScore: 0.5,
        actions: [],
      },
    ];
  }
}

