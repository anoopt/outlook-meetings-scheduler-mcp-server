import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTool } from "../utils/tool-registration.js";
import { getGraphConfig } from "../utils/graph-config.js";
import { createUIResource } from "@mcp-ui/server";
import { UI_RESOURCE_URIS, PREFERRED_FRAME_SIZES } from "../constants/ui-constants.js";
import { storePeopleData } from "../routes/ui-routes.js";
import { getServerBaseUrl } from "../index.js";

/**
 * Register people-related tools with the MCP server
 */
export function registerPeopleTools(server: McpServer): void {
  registerTool(
    server,
    "find-person",
    "Find a person's email address by their name. Displays results as persona cards with profile picture, job title, and location.",
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

      // Get base URL for HTTP mode
      const baseUrl = getServerBaseUrl();
      
      let uiResource;
      
      if (baseUrl) {
        // HTTP mode - use external URL with actual HTTP endpoint
        const dataId = storePeopleData(people, name);
        const uiUrl = `${baseUrl}/ui/people-search?id=${dataId}`;
        
        uiResource = createUIResource({
          uri: UI_RESOURCE_URIS.PERSONA_CARDS,
          content: { type: "externalUrl", iframeUrl: uiUrl },
          encoding: "text",
          uiMetadata: {
            "preferred-frame-size": PREFERRED_FRAME_SIZES.PERSONA_CARDS,
          },
        });
      } else {
        // stdio mode - use data URL (fallback for non-HTTP environments)
        const { generatePersonaCardsHTML } = await import("../utils/html/persona-card.js");
        const htmlContent = generatePersonaCardsHTML(people, name);
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        
        uiResource = createUIResource({
          uri: UI_RESOURCE_URIS.PERSONA_CARDS,
          content: { type: "externalUrl", iframeUrl: dataUrl },
          encoding: "text",
          uiMetadata: {
            "preferred-frame-size": PREFERRED_FRAME_SIZES.PERSONA_CARDS,
          },
        });
      }
  
      // Format the results for text response
      const peopleList = people.map((person: any, index: number) => {
        const email = person.mail || person.userPrincipalName || person.emailAddresses?.[0]?.address || "No email available";
        const displayName = person.displayName || "Unknown name";
        const jobTitle = person.jobTitle ? ` - ${person.jobTitle}` : '';
        const location = person.officeLocation ? ` (${person.officeLocation})` : '';
        return `${index + 1}. ${displayName}${jobTitle}${location}\n   📧 ${email}`;
      }).join("\n\n");
      
      const successMessage = `
👥 Found ${people.length} people matching "${name}":

${peopleList}

View the interactive panel above for more details about each person.
You can use these email addresses to create a calendar event.`.trim();
  
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
