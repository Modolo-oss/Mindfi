export interface Env {
  DEFI_PORTFOLIO_AGENT: DurableObjectNamespace<any>;
  THIRDWEB_SECRET_KEY?: string;
  THIRDWEB_CLIENT_ID?: string;
  XAVA_TREASURY_ADDRESS?: string;
  ANTHROPIC_API_KEY?: string;
  COINGECKO_API_KEY?: string;
  AI_PROVIDER?: string;
  MODEL_ID?: string;
  [key: string]: unknown;
}
