import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createUIResource } from "@mcp-ui/server";
import { registerTool } from "../utils/tool-registration.js";
import { getGraphConfig } from "../utils/graph-config.js";
import { createPeopleUIUrl } from "../resources/ui-resources.js";

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
      const { graph, userEmail, authError } = await getGraphConfig();

      // Check for authentication errors
      if (authError) {
        return {
          content: [
            {
              type: "text",
              text: `🔐 Authentication Required\n\n${authError}\n\nPlease complete the authentication and try again.`,
            },
          ],
        };
      }

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

      // Fetch photos for found people
      const enrichedPeople = await graph.addPhotosToResults(people);
  
      // Format the results for response
      const peopleList = enrichedPeople.map((person: any, index: number) => {
        const email = person.mail || person.userPrincipalName || person.emailAddresses?.[0]?.address || "No email available";
        const displayName = person.displayName || "Unknown name";
        return `${index + 1}. ${displayName} — ${email}`;
      }).join("\n");
      
      // Log photo data for debugging
      console.log('Enriched people with photos:', enrichedPeople.map((p: any) => ({
        displayName: p.displayName,
        hasPhotoDataUrl: !!p.photoDataUrl,
        photoDataUrlLength: p.photoDataUrl?.length || 0
      })));
      
      // Create UI resource for visual display
      const uiUrl = createPeopleUIUrl(enrichedPeople);
      const uiResource = createUIResource({
        uri: `ui://outlook-meetings/people/${encodeURIComponent(name)}`,
        content: { type: 'externalUrl', iframeUrl: uiUrl },
        encoding: 'text',
        uiMetadata: {
          'preferred-frame-size': ['100%', '300px'],
        },
      });
      
      const successMessage = `I found ${people.length} ${people.length === 1 ? 'person' : 'people'} named ${name}:

${peopleList}

Would you like me to:
- Schedule a meeting with ${people[0]?.displayName || name} (tell me date/time, duration, location and any other attendees), or
- Create a calendar event and invite ${people.length === 1 ? 'them' : 'one of them'}, or
- Show more contact details?

What would you like to do next?`;
  
      return {
        content: [
          uiResource,
          {
            type: "text",
            text: successMessage,
          },
        ],
      };
    }
  );
}
