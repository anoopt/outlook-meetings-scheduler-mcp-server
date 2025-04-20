#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from './logger.js';
import { registerPeopleTools } from './tools/people.js';
import { registerEventCreateTools } from './tools/event-create.js';
import { registerEventReadTools } from './tools/event-read.js';
import { registerEventUpdateTools } from './tools/event-update.js';
import { registerEventDeleteTools } from './tools/event-delete.js';

/**
 * Outlook Meetings Scheduler MCP Server
 * 
 * This server provides tools for managing calendar events through Microsoft Graph API.
 * The implementation is split across multiple files to improve maintainability.
 */

// Create server instance
const server = new McpServer({
  name: "outlook-meetings-scheduler",
  version: "0.1.1",
});

// Register all tools
registerPeopleTools(server);
registerEventCreateTools(server);
registerEventReadTools(server);
registerEventUpdateTools(server);
registerEventDeleteTools(server);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("ℹ️ outlook-meetings-scheduler MCP Server running on stdio");
}

main().catch((error) => {
  logger.error("🚨 Fatal error in main():", error);
  process.exit(1);
});
