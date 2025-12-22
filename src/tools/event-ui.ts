import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTool } from "../utils/tool-registration.js";
import { getGraphConfig } from "../utils/graph-config.js";
import { createUIResource } from "@mcp-ui/server";
import { DEFAULT_UPCOMING_MEETINGS_COUNT, UI_RESOURCE_URIS, PREFERRED_FRAME_SIZES } from "../constants/ui-constants.js";
import { storeMeetingsData } from "../routes/ui-routes.js";
import { getServerBaseUrl } from "../index.js";

/**
 * Register UI-enhanced event tools with the MCP server
 */
export function registerUIEventTools(server: McpServer): void {
  // Register show upcoming meetings tool with UI
  registerTool(
    server,
    "show-upcoming-meetings",
    "Show upcoming meetings in an interactive UI. Displays the next 5 meetings by default.",
    {
      count: z.number().optional().describe("Number of upcoming meetings to show (default: 5, max: 10)"),
    },
    async ({ count }) => {
      const { graph, userEmail, authError } = await getGraphConfig();

      if (authError) {
        return {
          content: [{ type: "text", text: `🔐 Authentication Required\n\n${authError}\n\nPlease complete the authentication and try again.` }]
        };
      }

      // Determine number of meetings to fetch
      const meetingCount = Math.min(count || DEFAULT_UPCOMING_MEETINGS_COUNT, 10);

      // Get upcoming meetings (from now onwards)
      const now = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

      const params = {
        startDateTime: now.toISOString(),
        endDateTime: oneMonthLater.toISOString(),
        top: meetingCount,
      };

      // Call the Graph API to list events
      const result = await graph.listEvents(userEmail, params);
      
      if (!result || !result.value) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve upcoming meetings. Check the logs for details.",
            },
          ],
        };
      }
      
      const meetings = result.value;
      
      if (meetings.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "🎉 You have no upcoming meetings scheduled!",
            },
          ],
        };
      }

      // Get base URL for HTTP mode
      const baseUrl = getServerBaseUrl();
      
      let uiResource;
      
      if (baseUrl) {
        // HTTP mode - use external URL with actual HTTP endpoint
        const dataId = storeMeetingsData(meetings);
        const uiUrl = `${baseUrl}/ui/upcoming-meetings?id=${dataId}`;
        
        uiResource = createUIResource({
          uri: UI_RESOURCE_URIS.UPCOMING_MEETINGS,
          content: { type: "externalUrl", iframeUrl: uiUrl },
          encoding: "text",
          uiMetadata: {
            "preferred-frame-size": PREFERRED_FRAME_SIZES.UPCOMING_MEETINGS,
          },
        });
      } else {
        // stdio mode - use data URL (fallback for non-HTTP environments)
        // Note: This may not work in all UI clients
        const { generateUpcomingMeetingsListHTML } = await import("../utils/html/meetings-list.js");
        const htmlContent = generateUpcomingMeetingsListHTML(meetings);
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        
        uiResource = createUIResource({
          uri: UI_RESOURCE_URIS.UPCOMING_MEETINGS,
          content: { type: "externalUrl", iframeUrl: dataUrl },
          encoding: "text",
          uiMetadata: {
            "preferred-frame-size": PREFERRED_FRAME_SIZES.UPCOMING_MEETINGS,
          },
        });
      }

      // Also provide text summary
      const meetingsSummary = meetings.map((meeting: any, index: number) => {
        const startTime = meeting.start?.dateTime || "No start time";
        const subject = meeting.subject || "No subject";
        return `${index + 1}. ${subject} - ${startTime}`;
      }).join("\n");

      const textSummary = `
📅 Your Next ${meetings.length} Upcoming Meeting${meetings.length !== 1 ? 's' : ''}:

${meetingsSummary}

View the interactive panel above for more details about each meeting.
      `.trim();

      return {
        content: [
          uiResource,
          {
            type: "text",
            text: textSummary,
          },
        ],
      };
    }
  );
}
