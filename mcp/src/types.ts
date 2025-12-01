export interface Env {
  DEFI_MCP_SERVER: DurableObjectNamespace<any>;
  THIRDWEB_SECRET_KEY?: string;
  THIRDWEB_CLIENT_ID?: string;
  COINGECKO_API_KEY?: string;
  [key: string]: unknown;
}

