import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createUIResource } from "@mcp-ui/server";
import { getGraphConfig } from "../utils/graph-config.js";
import { createEventsUIUrl, createPeopleUIUrl } from "./ui-resources.js";

/**
 * Register UI resource handlers with the MCP server
 */
export function registerUIResources(server: McpServer): void {
  // Register upcoming events UI resource
  server.resource(
    "upcoming-events-ui",
    "ui://outlook-meetings/upcoming-events",
    { description: "UI view of upcoming calendar events" },
    async () => {
      const { graph, userEmail, authError } = await getGraphConfig();

      if (authError) {
        return {
          contents: [
            {
              uri: "ui://outlook-meetings/upcoming-events",
              mimeType: "text/plain",
              text: `Authentication Required\n\n${authError}\n\nPlease complete the authentication and try again.`,
            },
          ],
        };
      }

      try {
        // Get upcoming events (next 7 days)
        const now = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const result = await graph.listEvents(userEmail, {
          startDateTime: now.toISOString(),
          endDateTime: endDate.toISOString(),
          top: 10,
        });

        if (!result || !result.value) {
          return {
            contents: [
              {
                uri: "ui://outlook-meetings/upcoming-events",
                mimeType: "text/plain",
                text: "Failed to retrieve upcoming events.",
              },
            ],
          };
        }

        const events = result.value;
        
        // Create the external URL with events data
        const uiUrl = createEventsUIUrl(events);

        // Use createUIResource from @mcp-ui/server for proper UI rendering
        const uiResource = createUIResource({
          uri: "ui://outlook-meetings/upcoming-events",
          content: { type: 'externalUrl', iframeUrl: uiUrl },
          encoding: 'text',
        });

        return {
          contents: [uiResource.resource],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: "ui://outlook-meetings/upcoming-events",
              mimeType: "text/plain",
              text: `Error fetching events: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Register people search UI resource template
  server.resource(
    "people-search-ui",
    new ResourceTemplate("ui://outlook-meetings/people/{query}", {
      list: undefined, // We don't enumerate all possible searches
    }),
    { description: "UI view of people search results" },
    async (uri, variables) => {
      const query = variables.query as string;
      const { graph, userEmail, authError } = await getGraphConfig();

      if (authError) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "text/plain",
              text: `Authentication Required\n\n${authError}\n\nPlease complete the authentication and try again.`,
            },
          ],
        };
      }

      try {
        const people = await graph.searchPeople(query, userEmail);

        if (!people) {
          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: "text/plain",
                text: "Failed to search for people.",
              },
            ],
          };
        }

        if (people.length === 0) {
          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: "text/plain",
                text: `No people found matching "${query}".`,
              },
            ],
          };
        }

        // Create the external URL with people data
        const uiUrl = createPeopleUIUrl(people);

        // Use createUIResource from @mcp-ui/server for proper UI rendering
        const uiResource = createUIResource({
          uri: `ui://outlook-meetings/people/${encodeURIComponent(query)}`,
          content: { type: 'externalUrl', iframeUrl: uiUrl },
          encoding: 'text',
        });

        return {
          contents: [uiResource.resource],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "text/plain",
              text: `Error searching for people: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
