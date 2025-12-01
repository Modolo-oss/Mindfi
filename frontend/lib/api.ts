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
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for AI processing

    const response = await fetch(`${BACKEND_URL}/agent/chat/${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to send chat message:", error);
    if (error instanceof Error && (error.name === "AbortError" || error.message.includes("timeout"))) {
      throw new Error("Request timeout - Backend is taking too long to respond. Please try again.");
    }
    throw error;
  }
}

/**
 * Check if backend is online
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${BACKEND_URL}/`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
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

