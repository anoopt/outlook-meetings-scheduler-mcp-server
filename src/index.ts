#!/usr/bin/env node
// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { randomUUID } from 'node:crypto';
import { logger, initializeLogger } from './logger.js';
import { registerPeopleTools } from './tools/people.js';
import { registerEventCreateTools } from './tools/event-create.js';
import { registerEventReadTools } from './tools/event-read.js';
import { registerEventUpdateTools } from './tools/event-update.js';
import { registerEventDeleteTools } from './tools/event-delete.js';
import { registerUIEventTools } from './tools/event-ui.js';
import { setupUIRoutes } from './routes/ui-routes.js';

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

// Global variable to store base URL for HTTP mode
let serverBaseUrl: string | null = null;

/**
 * Get the server base URL (for HTTP mode)
 */
export function getServerBaseUrl(): string | null {
  return serverBaseUrl;
}

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
  // Set the base URL for UI routes
  serverBaseUrl = `http://localhost:${port}`;
  
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());

  // Setup UI routes for serving HTML pages
  setupUIRoutes(app);

  // Store transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Outlook Meetings Scheduler MCP Server',
      version: '0.2.0',
      status: 'running',
      transport: 'streamable-http',
      endpoints: {
        mcp: '/mcp',
        ui: '/ui'
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

  // MCP endpoint - handles all HTTP methods (GET, POST, DELETE)
  app.all('/mcp', async (req, res) => {
    try {
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'];
      let transport: StreamableHTTPServerTransport | undefined;

      if (sessionId && typeof sessionId === 'string' && transports.has(sessionId)) {
        // Reuse existing transport for this session
        transport = transports.get(sessionId);
        logger.info(`ℹ️ Reusing existing session: ${sessionId}`);
      } else if (!sessionId && (req.method === 'POST' || req.method === 'GET')) {
        // New session - create transport for POST (initialize) or GET (SSE stream) requests
        logger.info(`ℹ️ New HTTP/SSE connection - creating transport (method: ${req.method})`);
        
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            logger.info(`ℹ️ Session initialized with ID: ${sid}`);
            if (transport) {
              transports.set(sid, transport);
            }
          }
        });

        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid && transports.has(sid)) {
            logger.info(`ℹ️ Transport closed for session ${sid}`);
            transports.delete(sid);
          }
        };

        // Connect the transport to a new MCP server instance
        const server = createServer();
        await server.connect(transport);
      } else if (sessionId && typeof sessionId === 'string' && !transports.has(sessionId)) {
        // Session ID provided but not found - likely server restarted
        // Create new session to allow reconnection
        logger.info(`ℹ️ Session ${sessionId} not found (server may have restarted) - creating new session`);
        
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            logger.info(`ℹ️ New session initialized with ID: ${sid}`);
            if (transport) {
              transports.set(sid, transport);
            }
          }
        });

        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid && transports.has(sid)) {
            logger.info(`ℹ️ Transport closed for session ${sid}`);
            transports.delete(sid);
          }
        };

        const server = createServer();
        await server.connect(transport);
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided or invalid request'
          },
          id: null
        });
        return;
      }

      if (transport) {
        // Handle the request with the transport
        await transport.handleRequest(req, res, req.body);
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: Transport not found'
          },
          id: null
        });
      }
    } catch (error) {
      logger.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    }
  });

  // Start HTTP server
  app.listen(port, () => {
    logger.info(`ℹ️ outlook-meetings-scheduler MCP Server running on HTTP at http://localhost:${port}`);
    logger.info(`ℹ️ MCP endpoint: http://localhost:${port}/mcp`);
  });
}

// Main entry point - determine transport mode based on environment
async function main() {
  // Log important environment variables for debugging (without secrets)
  console.log('\n=== Server Startup Configuration ===');
  console.log(`AUTH_MODE: ${process.env.AUTH_MODE || '(not set - will auto-detect)'}`);
  console.log(`CLIENT_ID: ${process.env.CLIENT_ID ? process.env.CLIENT_ID.substring(0, 8) + '...' : '(not set)'}`);
  console.log(`CLIENT_SECRET: ${process.env.CLIENT_SECRET ? '***set***' : '(not set)'}`);
  console.log(`TENANT_ID: ${process.env.TENANT_ID ? process.env.TENANT_ID.substring(0, 8) + '...' : '(not set)'}`);
  console.log(`USER_EMAIL: ${process.env.USER_EMAIL || '(not set)'}`);
  console.log(`HTTP_PORT: ${process.env.HTTP_PORT || '(not set - will use stdio)'}`);
  console.log('===================================\n');
  
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
