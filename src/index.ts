#!/usr/bin/env node
// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from 'express';
import { randomUUID } from 'node:crypto';
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
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

  // Handle POST requests for client-to-server communication
  app.post('/mcp', async (req, res) => {
    try {
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport | undefined;

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport for this session
        transport = transports.get(sessionId);
        logger.info(`ℹ️ Reusing existing session: ${sessionId}`);
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request - create new transport
        logger.info('ℹ️ New initialization request received');
        
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            logger.info(`ℹ️ Session initialized: ${sid}`);
            if (transport) {
              transports.set(sid, transport);
            }
          }
        });

        // Clean up on close
        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid && transports.has(sid)) {
            logger.info(`ℹ️ Transport closed for session ${sid}`);
            transports.delete(sid);
          }
        };

        // Connect to a new MCP server instance
        const server = createServer();
        await server.connect(transport);
      } else {
        // Invalid request - no session and not an initialize request
        logger.error('🚨 Invalid request: no session ID and not an initialize request');
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session. Send an initialize request to start a new session.'
          },
          id: null
        });
        return;
      }

      // Handle the request
      if (transport) {
        await transport.handleRequest(req, res, req.body);
      }
    } catch (error) {
      logger.error('Error handling MCP POST request:', error);
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

  // Handle GET requests for SSE streams (server-to-client notifications)
  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    if (!sessionId || !transports.has(sessionId)) {
      logger.error('🚨 GET request without valid session ID');
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: Invalid or missing session ID'
        },
        id: null
      });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // Handle DELETE requests for session termination
  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    if (!sessionId || !transports.has(sessionId)) {
      logger.error('🚨 DELETE request without valid session ID');
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: Invalid or missing session ID'
        },
        id: null
      });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
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
