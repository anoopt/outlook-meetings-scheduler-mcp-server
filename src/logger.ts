import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

function formatMessage(
  level: string,
  message: string,
  data?: unknown,
): string {
  const timestamp = new Date().toISOString();
  const dataStr = data
    ? `\n${JSON.stringify(data, null, 2)}`
    : "";
  return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

// Store a reference to the server instance
let serverInstance: Server | null = null;

// Initialize the logger with a server instance
export function initializeLogger(server: Server) {
  serverInstance = server;
}

// Helper to check if server is actually connected to a client
function isServerConnected(): boolean {
  // In HTTP mode, the server might exist but not be connected to a client
  // We'll catch errors and fall back to console logging
  return serverInstance !== null;
}

export const logger = {
  info(message: string, data?: unknown) {
    const logMessage = formatMessage(
      "INFO",
      message,
      data,
    );
    
    // Try sending notification to MCP server if available
    if (isServerConnected() && serverInstance) {
      serverInstance.notification({
        method: "notifications/message",
        params: {
          level: "info",
          data: message + (data ? `: ${JSON.stringify(data)}` : ""),
        },
      }).catch(() => {
        // Silently fall back to console if not connected
        console.log(logMessage);
      });
    } else {
      console.log(logMessage);
    }
  },

  progress(message: string, data?: unknown) {
    const logMessage = formatMessage(
      "PROGRESS",
      message,
      data,
    );
    // Try sending notification to MCP server if available
    if (isServerConnected() && serverInstance) {
      serverInstance.notification({
        method: "notifications/message",
        params: {
          level: "progress",
          data: message + (data ? `: ${JSON.stringify(data)}` : ""),
        },
      }).catch(() => {
        // Silently fall back to console if not connected
        console.log(logMessage);
      });
    } else {
      console.log(logMessage);
    }
  },

  error(message: string, error?: unknown) {
    const logMessage = formatMessage(
      "ERROR",
      message,
      error,
    );
    
    // Try sending notification to MCP server if available
    if (isServerConnected() && serverInstance) {
      serverInstance.notification({
        method: "notifications/message",
        params: {
          level: "error",
          data: message + (error instanceof Error ? `: ${error.message}` : error ? `: ${JSON.stringify(error)}` : ""),
        },
      }).catch(() => {
        // Silently fall back to console if not connected
        console.error(logMessage);
      });
    } else {
      console.error(logMessage);
    }
  },
};