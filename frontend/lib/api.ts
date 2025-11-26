/**
 * MindFi Backend API Client
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_MINDFI_API_URL || "http://localhost:8787";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: Message[];
}

export interface ChatResponse {
  message: string;
  data?: unknown;
  error?: string;
}

/**
 * Send a chat message to MindFi backend
 */
export async function sendChatMessage(sessionId: string, messages: Message[]): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 120000); // 120 second (2 minutes) timeout for AI processing (Thirdweb AI can take longer)

  try {
    const response = await fetch(`${BACKEND_URL}/agent/chat/${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Read response body as text first (can only be consumed once)
    const responseText = await response.text();

    if (!response.ok) {
      let errorText: string;
      try {
        // Try to parse as JSON for structured error messages
        const errorData = JSON.parse(responseText);
        errorText = errorData.error || errorData.message || JSON.stringify(errorData);
      } catch {
        // If not JSON, use the raw text
        errorText = responseText || response.statusText;
      }
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    // Parse the response text as JSON
    let data: ChatResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse response JSON:", parseError);
      throw new Error(`Invalid response format from backend: ${responseText.substring(0, 100)}`);
    }
    
    return data;
  } catch (error) {
    // Always clear timeout on error
    clearTimeout(timeoutId);
    
    console.error("Failed to send chat message:", error);
    if (error instanceof Error) {
      // Check for abort/timeout errors first
      if (error.name === "AbortError" || error.message.includes("aborted") || error.message.includes("timeout")) {
        throw new Error("Request timeout - AI processing is taking longer than expected (2 minutes). This can happen with complex requests. Please try again with a simpler query or wait a moment.");
      }
      // Check if it's a network error (backend not reachable)
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError") || error.message.includes("ERR_")) {
        throw new Error("Failed to connect to backend. Please ensure the backend is running on http://localhost:8787");
      }
      // Re-throw other errors with their original message
      throw error;
    }
    throw new Error("Unknown error occurred while sending message");
  }
}

/**
 * Check if backend is online
 */
export async function checkBackendHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        console.warn("Backend health check timeout - backend might be starting");
      } else {
        console.error("Backend health check failed:", error.message);
      }
    }
    return false;
  }
}

