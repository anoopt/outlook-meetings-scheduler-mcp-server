#!/usr/bin/env node
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger, initializeLogger } from './logger.js';
import { registerPeopleTools } from './tools/people.js';
import { registerEventCreateTools } from './tools/event-create.js';
import { registerEventReadTools } from './tools/event-read.js';
import { registerEventUpdateTools } from './tools/event-update.js';
import { registerEventDeleteTools } from './tools/event-delete.js';
import { registerUIResources } from './resources/ui-resource-handlers.js';
import { getData } from './utils/data-store.js';

/**
 * Outlook Meetings Scheduler MCP Server - HTTP Transport
 * 
 * This server provides HTTP/SSE transport for the MCP server.
 * It uses Node.js native HTTP server for proper handling of streaming responses.
 */

// Get HTTP port from environment or use default
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3000', 10);

// Store active transports by session ID for session management
const transports = new Map<string, StreamableHTTPServerTransport>();

// Function to create and configure a new MCP server instance
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "outlook-meetings-scheduler",
    version: "0.2.0",
  }, {
    capabilities: {
      logging: {},
      resources: {}
    }
  });

  // Initialize logger with server instance
  initializeLogger(server.server);

  // Register all tools
  registerPeopleTools(server);
  registerEventCreateTools(server);
  registerEventReadTools(server);
  registerEventUpdateTools(server);
  registerEventDeleteTools(server);

  // Register UI resources
  registerUIResources(server);

  return server;
}

// Handle MCP requests
async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Check for existing session
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;
  
  try {
    if (sessionId && transports.has(sessionId)) {
      // Reuse existing transport for this session
      transport = transports.get(sessionId)!;
    } else if (req.method === 'POST' || req.method === 'GET') {
      // Create new transport for new sessions (POST for init, GET for SSE)
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports.set(newSessionId, transport);
          logger.info(`🌐 New MCP session created: ${newSessionId}`);
        }
      });

      // Create and connect a new MCP server instance
      const server = createMcpServer();
      await server.connect(transport);
      
      // Handle session cleanup on transport close
      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
          logger.info(`🔌 MCP session closed: ${transport.sessionId}`);
        }
      };
    } else if (req.method === 'DELETE' && sessionId) {
      // Handle session deletion for non-existent session
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    } else {
      // No session and not an initialization request
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Request: No session ID provided' }));
      return;
    }

    // Let the transport handle the request directly
    await transport.handleRequest(req, res);
  } catch (error) {
    logger.error("🚨 Error handling MCP request:", error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
}

// Handle health check requests
function handleHealthRequest(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok', 
    server: 'outlook-meetings-scheduler', 
    version: '0.2.0',
    activeSessions: transports.size
  }));
}

// Handle data retrieval requests for UI
function handleDataRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const dataId = url.searchParams.get('id');
  
  // Add CORS headers for the UI app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (!dataId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing data ID' }));
    return;
  }
  
  const data = getData(dataId);
  if (!data) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Data not found or expired' }));
    return;
  }
  
  logger.info(`Serving data for ID: ${dataId}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Handle OAuth callback with a beautiful Fluent UI styled page
function handleAuthCallback(res: ServerResponse): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Complete</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      padding: 48px;
      text-align: center;
      max-width: 420px;
      width: 100%;
    }
    .icon-container {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 24px;
    }
    .checkmark {
      width: 40px;
      height: 40px;
      stroke: white;
      stroke-width: 3;
      fill: none;
      animation: checkmark 0.5s ease-in-out forwards;
    }
    @keyframes checkmark {
      0% {
        stroke-dasharray: 100;
        stroke-dashoffset: 100;
      }
      100% {
        stroke-dashoffset: 0;
      }
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 12px;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .app-name {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .app-icon {
      width: 32px;
      height: 32px;
      background: #0078d4;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .calendar-icon {
      width: 18px;
      height: 18px;
      stroke: white;
      fill: none;
    }
    .app-text {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      <svg class="checkmark" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1 class="title">Authentication Successful!</h1>
    <p class="subtitle">
      You have been signed in successfully.<br>
      You can close this window and return to your application.
    </p>
    <div class="app-name">
      <div class="app-icon">
        <svg class="calendar-icon" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
          <line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/>
          <line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/>
          <line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/>
        </svg>
      </div>
      <span class="app-text">Outlook Meetings Scheduler</span>
    </div>
  </div>
</body>
</html>`;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

// Create HTTP server
const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  
  // Route requests
  if (url.pathname === '/mcp') {
    await handleMcpRequest(req, res);
  } else if (url.pathname === '/health') {
    handleHealthRequest(res);
  } else if (url.pathname === '/api/data') {
    handleDataRequest(req, res);
  } else if (url.pathname === '/auth/callback' || url.pathname === '/') {
    // Handle OAuth callback - show success page
    handleAuthCallback(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start the HTTP server
async function main() {
  httpServer.listen(HTTP_PORT, () => {
    logger.info(`🌐 outlook-meetings-scheduler MCP Server running on HTTP port ${HTTP_PORT}`);
    logger.info(`📍 MCP endpoint: http://localhost:${HTTP_PORT}/mcp`);
    logger.info(`💚 Health check: http://localhost:${HTTP_PORT}/health`);
  });
}

main().catch((error) => {
  logger.error("🚨 Fatal error in main():", error);
  process.exit(1);
});
