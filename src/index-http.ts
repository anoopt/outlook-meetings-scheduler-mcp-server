#!/usr/bin/env node
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
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

/**
 * Outlook Meetings Scheduler MCP Server - HTTP Transport
 * 
 * This server provides HTTP/SSE transport for the MCP server using Hono.
 * It runs as a standalone HTTP server that nanobot can connect to.
 * Hono provides better hot reload support and lighter weight than Express.
 */

// Get HTTP port from environment or use default
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3000', 10);

// Create Hono app
const app = new Hono();

// Create server instance
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

// MCP endpoint - handles all HTTP methods
app.all('/mcp', async (c) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  try {
    await server.connect(transport);
    
    // Convert Hono request to Node.js IncomingMessage format
    const req = c.req.raw;
    
    // Create a response handler that works with Hono
    await new Promise<void>((resolve, reject) => {
      const res = {
        statusCode: 200,
        statusMessage: 'OK',
        headersSent: false,
        _headers: {} as Record<string, string>,
        
        setHeader(name: string, value: string) {
          this._headers[name] = value;
        },
        
        writeHead(statusCode: number, headers?: Record<string, string>) {
          this.statusCode = statusCode;
          if (headers) {
            Object.assign(this._headers, headers);
          }
          this.headersSent = true;
        },
        
        write(chunk: any) {
          // For SSE streaming
          if (!this.headersSent) {
            c.res = new Response(chunk, {
              status: this.statusCode,
              headers: this._headers,
            });
          }
        },
        
        end(data?: any) {
          if (!this.headersSent) {
            c.res = c.json(data || { ok: true }, this.statusCode);
          }
          resolve();
        },
      } as any;

      transport.handleRequest(req as any, res).catch(reject);
    });
    
    logger.info("🌐 HTTP client connected to MCP server");
    return c.res;
  } catch (error) {
    logger.error("🚨 Error handling HTTP request:", error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    server: 'outlook-meetings-scheduler', 
    version: '0.2.0',
    framework: 'hono'
  });
});

// Start the HTTP server
async function main() {
  serve({
    fetch: app.fetch,
    port: HTTP_PORT,
  });
  
  logger.info(`🌐 outlook-meetings-scheduler MCP Server running on HTTP port ${HTTP_PORT}`);
  logger.info(`📍 MCP endpoint: http://localhost:${HTTP_PORT}/mcp`);
  logger.info(`💚 Health check: http://localhost:${HTTP_PORT}/health`);
  logger.info(`⚡ Using Hono framework for better hot reload support`);
}

main().catch((error) => {
  logger.error("🚨 Fatal error in main():", error);
  process.exit(1);
});
