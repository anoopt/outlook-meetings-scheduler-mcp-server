import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from '../logger.js';

/**
 * Helper function to register a tool with the MCP server.
 * Handles common logging and error handling boilerplate.
 */
export function registerTool(
  server: McpServer,
  name: string,
  description: string,
  params: any,
  handler: (args: any) => Promise<any>
): void {
  server.tool(
    name,
    description,
    params,
    async (args: any) => {
      // Common logging pattern for all tools
      logger.info(`ℹ️ Executing ${name} tool with params: ${JSON.stringify(args)}`);

      try {
        // Call the actual handler function
        return await handler(args);
      } catch (error) {
        logger.error(`Error in ${name}:`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    }
  );
}
