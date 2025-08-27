// AI SSE (Server-Sent Events) utility functions

import { DOTANE_AI_SERVER } from "./config"

export interface AIChatRequest {
  message: string
  mode: "deepthink" | "roadmap" | "knowledge"
  attached_notes?: string[] // Array of note content strings
  sessionId?: string
}

export interface AIChatResponse {
  type: "content" | "error" | "done"
  content?: string
  error?: string
  messageId?: string
}

const BASE_URL = DOTANE_AI_SERVER

export class AISSEConnection {
  private eventSource: EventSource | null = null
  private messageId: string | null = null

  constructor(private baseUrl: string = BASE_URL) {}

  async sendMessage(
    request: AIChatRequest,
    onMessage: (response: AIChatResponse) => void,
    onError?: (error: string) => void,
    onComplete?: () => void,
    sessionToken?: string
  ): Promise<void> {
    try {
      // First, make a POST request to create the message
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      }
      
      if (sessionToken) {
        headers["Authorization"] = sessionToken
      }
      
      const response = await fetch(`${this.baseUrl}/api/message/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: request.message,
          mode: request.mode,
          attached_notes: request.attached_notes
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      this.messageId = data.message_id

      // Create SSE connection for streaming response
      const sseUrl = `${this.baseUrl}/api/message/stream/${this.messageId}`
      this.eventSource = new EventSource(sseUrl)

      this.eventSource.onmessage = (event) => {
        try {
          const response: AIChatResponse = JSON.parse(event.data)
          onMessage(response)

          if (response.type === "done") {
            this.close()
            onComplete?.()
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error)
          onError?.("Failed to parse server response")
        }
      }

      this.eventSource.onerror = (error) => {
        console.error("SSE connection error:", error)
        this.close()
        onError?.("Connection error")
      }

    } catch (error) {
      console.error("Error sending AI message:", error)
      onError?.(error instanceof Error ? error.message : "Unknown error")
    }
  }

  close(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
  }
}

// Alternative implementation using fetch with streaming
export async function sendAIMessageStream(
  request: AIChatRequest,
  onChunk: (chunk: string) => void,
  onError?: (error: string) => void,
  onComplete?: () => void,
  sessionToken?: string
): Promise<void> {
  try {
          // First, create the message
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      }
      
      if (sessionToken) {
        headers["Authorization"] = sessionToken
      }
      
      const createResponse = await fetch(`${BASE_URL}/api/message/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: request.message,
          mode: request.mode,
          attached_notes: request.attached_notes
        }),
      })

    if (!createResponse.ok) {
      throw new Error(`HTTP error! status: ${createResponse.status}`)
    }

    const createData = await createResponse.json()
    const messageId = createData.message_id

          // Then, get the stream
      const streamHeaders: Record<string, string> = {}
      if (sessionToken) {
        streamHeaders["Authorization"] = sessionToken
      }
      
      const streamResponse = await fetch(`${BASE_URL}/api/message/stream/${messageId}`, {
        headers: streamHeaders
      })

    if (!streamResponse.ok) {
      throw new Error(`HTTP error! status: ${streamResponse.status}`)
    }

    if (!streamResponse.body) {
      throw new Error("Response body is null")
    }

    const reader = streamResponse.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          onComplete?.()
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6) // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              onComplete?.()
              return
            }

            // Your backend sends plain text, not JSON
            if (data.trim()) {
              onChunk(data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

  } catch (error) {
    console.error("Error in AI message stream:", error)
    onError?.(error instanceof Error ? error.message : "Unknown error")
  }
}

// Utility function to create a mock SSE for development/testing
export function createMockSSE(
  message: string,
  mode: string,
  onChunk: (chunk: string) => void,
  onComplete?: () => void
): void {
  const responses = {
    deepthink: `I'll analyze this deeply: "${message}". Let me think through this systematically...\n\nBased on my analysis, here are the key insights:\n\n1. First point about your query\n2. Second important consideration\n3. Final recommendation\n\nThis approach should help you achieve your goals effectively.`,
    roadmap: `Let me create a strategic roadmap for: "${message}". Here's a step-by-step approach:\n\nPhase 1: Foundation\n- Set up initial requirements\n- Define success metrics\n\nPhase 2: Implementation\n- Execute core features\n- Monitor progress\n\nPhase 3: Optimization\n- Refine based on feedback\n- Scale successful elements`,
    knowledge: `Searching through public knowledge base for: "${message}". I found relevant information:\n\nKey findings:\n- Related concept 1\n- Supporting evidence 2\n- Expert recommendation 3\n\nThis information should provide valuable context for your query.`
  }

  const response = responses[mode as keyof typeof responses] || responses.deepthink
  const words = response.split(' ')
  let currentIndex = 0

  const interval = setInterval(() => {
    if (currentIndex < words.length) {
      const chunk = words.slice(currentIndex, currentIndex + 3).join(' ') + ' '
      onChunk(chunk)
      currentIndex += 3
    } else {
      clearInterval(interval)
      onComplete?.()
    }
  }, 100) // Simulate streaming with 100ms delays
}
