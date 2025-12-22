#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from 'express';
import { logger, initializeLogger } from './logger.js';
import { registerPeopleTools } from './tools/people.js';
import { registerEventCreateTools } from './tools/event-create.js';
import { registerEventReadTools } from './tools/event-read.js';
import { registerEventUpdateTools } from './tools/event-update.js';
import { registerEventDeleteTools } from './tools/event-delete.js';
import { registerUIEventTools } from './tools/event-ui.js';

/**
 * Outlook Meetings Scheduler MCP Server
 * 
 * This server provides tools for managing calendar events through Microsoft Graph API.
 * The implementation is split across multiple files to improve maintainability.
 * 
 * Supports two transport modes:
 * 1. stdio (default) - For traditional MCP clients like Claude Desktop
 * 2. HTTP/SSE - For web-based MCP clients like nanobot.ai (set HTTP_PORT environment variable)
 */

/**
 * Create and configure an MCP server instance
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: "outlook-meetings-scheduler",
    version: "0.2.0",
  }, {
    capabilities: {
      logging: {}
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
  registerUIEventTools(server);

  return server;
}

/**
 * Start server in stdio mode (default)
 */
async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("ℹ️ outlook-meetings-scheduler MCP Server running on stdio");
}

/**
 * Start server in HTTP/SSE mode for web-based clients
 */
async function startHttpServer(port: number) {
  const app = express();
  
  // Parse JSON bodies for message endpoint
  app.use(express.json());

  // Store active server instances by session
  const serverSessions = new Map<string, McpServer>();

  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Outlook Meetings Scheduler MCP Server',
      version: '0.2.0',
      status: 'running',
      transport: 'sse',
      endpoints: {
        mcp: '/mcp'
      },
      tools: [
        'find-person',
        'create-event',
        'create-event-with-attendees',
        'get-event',
        'list-events',
        'delete-event',
        'update-event',
        'update-event-attendees',
        'show-upcoming-meetings'
      ]
    });
  });

  // MCP SSE endpoint
  app.get('/mcp', async (req, res) => {
    logger.info("ℹ️ New SSE connection established");
    
    const server = createServer();
    const transport = new SSEServerTransport('/message', res);
    
    // Store server instance for this connection
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    serverSessions.set(sessionId, server);
    
    // Clean up on connection close
    res.on('close', () => {
      logger.info("ℹ️ SSE connection closed");
      serverSessions.delete(sessionId);
    });
    
    await server.connect(transport);
  });

  // SSE message endpoint - currently handled by SSE transport internally
  app.post('/message', async (req, res) => {
    // Messages are handled by the SSE transport automatically
    // This endpoint exists for SSE protocol compatibility
    res.status(200).send();
  });

  // Start HTTP server
  app.listen(port, () => {
    logger.info(`ℹ️ outlook-meetings-scheduler MCP Server running on HTTP at http://localhost:${port}`);
    logger.info(`ℹ️ MCP endpoint: http://localhost:${port}/mcp`);
  });
}

// Main entry point - determine transport mode based on environment
async function main() {
  const httpPortEnv = process.env.HTTP_PORT;
  
  if (httpPortEnv) {
    // Validate HTTP_PORT
    const httpPort = parseInt(httpPortEnv, 10);
    
    if (isNaN(httpPort) || httpPort < 1 || httpPort > 65535) {
      logger.error(`🚨 Invalid HTTP_PORT value: ${httpPortEnv}. Must be a number between 1 and 65535.`);
      process.exit(1);
    }
    
    // HTTP/SSE mode for web-based clients
    await startHttpServer(httpPort);
  } else {
    // stdio mode (default) for traditional MCP clients
    await startStdioServer();
  }
}

main().catch((error) => {
  logger.error("🚨 Fatal error in main():", error);
  process.exit(1);
});
