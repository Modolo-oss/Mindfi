export interface AIUISDKMessage {
  messages?: Array<{ role: string; content: string }>;
}

export class Service {
  protected readonly env: Record<string, unknown>;

  constructor(env: Record<string, unknown>) {
    this.env = env;
  }
}


