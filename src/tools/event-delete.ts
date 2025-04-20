import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTool } from "../utils/tool-registration.js";
import { getGraphConfig } from "../utils/graph-config.js";

/**
 * Register event deletion tools with the MCP server
 */
export function registerEventDeleteTools(server: McpServer): void {
  // Register delete event tool
  registerTool(
    server,
    "delete-event",
    "Delete a calendar event",
    {
      eventId: z.string().describe("ID of the event to delete"),
    },
    async ({ eventId }) => {
      const { graph, userEmail } = getGraphConfig();
  
      // First get the event details to confirm what's being deleted
      const event = await graph.getEvent(eventId, userEmail);
      
      if (!event) {
        return {
          content: [
            {
              type: "text",
              text: "Could not find the event to delete. Please check the event ID.",
            },
          ],
        };
      }
      
      // Delete the event
      const success = await graph.deleteEvent(eventId, userEmail);
      
      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to delete calendar event. Check the logs for details.",
            },
          ],
        };
      }
  
      // Format the result for response
      const successMessage = `Calendar event deleted successfully! Event ID: ${eventId}`;
  
      return {
        content: [
          {
            type: "text",
            text: successMessage,
          },
        ],
      };
    }
  );
}
