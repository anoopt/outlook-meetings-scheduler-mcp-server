import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTool } from "../utils/tool-registration.js";
import { getGraphConfig } from "../utils/graph-config.js";

/**
 * Register people-related tools with the MCP server
 */
export function registerPeopleTools(server: McpServer): void {
  registerTool(
    server,
    "find-person",
    "Find a person's email address by their name",
    {
      name: z.string().describe("Name or partial name of the person to find"),
    },
    async ({ name }) => {
      const { graph, userEmail } = getGraphConfig();

      // Search for the person by name
      const people = await graph.searchPeople(name, userEmail);
      
      if (!people) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to search for people. Check the logs for details.",
            },
          ],
        };
      }
  
      if (people.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No people found matching "${name}". Please provide the full email address.`,
            },
          ],
        };
      }
  
      // Format the results for response
      const peopleList = people.map((person: any, index: number) => {
        const email = person.mail || person.userPrincipalName || person.emailAddresses?.[0]?.address || "No email available";
        const displayName = person.displayName || "Unknown name";
        return `${index + 1}. ${displayName} (${email})`;
      }).join("\n");
      
      const successMessage = `
Found ${people.length} people matching "${name}":

${peopleList}

You can use these email addresses to create a calendar event..`;
  
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
