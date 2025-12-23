#!/usr/bin/env node
import express from 'express';
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
 * This server provides HTTP/SSE transport for the MCP server.
 * It runs as a standalone HTTP server that nanobot can connect to.
 */

// Get HTTP port from environment or use default
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3000', 10);

// Create Express app
const app = express();

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

// Create transport for each request
app.use('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
    logger.info("🌐 HTTP client connected to MCP server");
  } catch (error) {
    logger.error("🚨 Error handling HTTP request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'outlook-meetings-scheduler', version: '0.2.0' });
});

// Start the HTTP server
async function main() {
  app.listen(HTTP_PORT, () => {
    logger.info(`🌐 outlook-meetings-scheduler MCP Server running on HTTP port ${HTTP_PORT}`);
    logger.info(`📍 MCP endpoint: http://localhost:${HTTP_PORT}/mcp`);
    logger.info(`💚 Health check: http://localhost:${HTTP_PORT}/health`);
  });
}

main().catch((error) => {
  logger.error("🚨 Fatal error in main():", error);
  process.exit(1);
});
