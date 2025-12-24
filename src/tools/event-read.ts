import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createUIResource } from "@mcp-ui/server";
import { registerTool } from "../utils/tool-registration.js";
import { getGraphConfig } from "../utils/graph-config.js";
import { createEventsUIUrl } from "../resources/ui-resources.js";

/**
 * Register event retrieval tools with the MCP server
 */
export function registerEventReadTools(server: McpServer): void {
  // Register get event details tool
  registerTool(
    server,
    "get-event",
    "Get details of a calendar event by its ID",
    {
      eventId: z.string().describe("ID of the event to retrieve"),
    },
    async ({ eventId }) => {
      const { graph, userEmail, authError } = await getGraphConfig();

      if (authError) {
        return {
          content: [{ type: "text", text: `🔐 Authentication Required\n\n${authError}\n\nPlease complete the authentication and try again.` }]
        };
      }
  
      // Retrieve the event
      const event = await graph.getEvent(eventId, userEmail);
      
      if (!event) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve the event. The event might not exist or there was an error. Check the logs for details.",
            },
          ],
        };
      }
  
      // Format the result for response
      const eventUrl = event.webLink || "No event URL available";
      const startTime = event.start?.dateTime || "No start time available";
      const endTime = event.end?.dateTime || "No end time available";
      const timeZone = event.start?.timeZone || "No time zone information";
      const location = event.location?.displayName || "No location specified";
      
      // Format attendees if they exist
      let attendeesList = "None";
      if (event.attendees && event.attendees.length > 0) {
        attendeesList = event.attendees.map((a: any) => {
          const name = a.emailAddress?.name || 'No name';
          const email = a.emailAddress?.address || 'No email';
          const type = a.type || 'required';
          return `${name} (${email}) - ${type}`;
        }).join("\n                ");
      }
      
      const successMessage = `
Calendar event details:

Event ID: ${eventId}
Subject: ${event.subject || "No subject"}
Start: ${startTime}
End: ${endTime}
Time Zone: ${timeZone}
Location: ${location}
User: ${userEmail}
Attendees: 
${attendeesList}
Event URL: ${eventUrl}
                    `;
  
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

  // Register list events tool
  registerTool(
    server,
    "list-events",
    "List calendar events with optional filtering",
    {
      subject: z.string().optional().describe("Filter events by subject containing this text"),
      startDate: z.string().optional().describe("Start date in ISO format (e.g. 2025-04-20T00:00:00) to filter events from"),
      endDate: z.string().optional().describe("End date in ISO format (e.g. 2025-04-20T23:59:59) to filter events until"),
      maxResults: z.number().optional().describe("Maximum number of events to return"),
    },
    async ({ subject, startDate, endDate, maxResults }) => {
      const { graph, userEmail, authError } = await getGraphConfig();

      if (authError) {
        return {
          content: [{ type: "text", text: `🔐 Authentication Required\n\n${authError}\n\nPlease complete the authentication and try again.` }]
        };
      }
  
      // Set up parameters for listing events
      const params: any = {};
      if (subject) {
        params.subject = subject;
      }
      if (startDate) {
        params.startDateTime = startDate;
      }
      if (endDate) {
        params.endDateTime = endDate;
      }
      if (maxResults) {
        params.top = maxResults;
      }
  
      // Call the Graph API to list events
      const result = await graph.listEvents(userEmail, params);
      
      if (!result || !result.value) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve calendar events. Check the logs for details.",
            },
          ],
        };
      }
      
      const events = result.value;
      
      if (events.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No events found matching your criteria.",
            },
          ],
        };
      }

      // Add photos to meeting attendees using the proven method
      const eventsWithPhotos = await graph.addAttendeesPhotosToMeetings(events);

      // Enrich events for UI (simplified structure with photos)
      const enrichedEvents = eventsWithPhotos.map((event: any) => {
        const attendeesWithPhotos = event.attendees?.map((attendee: any) => {
          return {
            name: attendee.emailAddress?.name || 'Unknown',
            email: attendee.emailAddress?.address,
            photoDataUrl: attendee.photoDataUrl || null,
          };
        }) || [];

        return {
          id: event.id,
          subject: event.subject,
          start: event.start,
          end: event.end,
          location: event.location?.displayName ? { displayName: event.location.displayName } : undefined,
          attendees: attendeesWithPhotos,
        };
      });
  
      // Format the events for the response
      let eventsList = events.map((event: any, index: number) => {
        const startTime = event.start?.dateTime || "No start time";
        const endTime = event.end?.dateTime || "No end time";
        const location = event.location?.displayName || "No location";
        const attendeeCount = event.attendees?.length || 0;
        
        return `${index + 1}. ${event.subject}
   - When: ${startTime} to ${endTime}
   - Location: ${location}
   - Attendees: ${attendeeCount}
   - Event ID: ${event.id}`;
      }).join("\n\n");
      
      // Create UI resource for visual display (using enriched events with photos)
      const uiUrl = createEventsUIUrl(enrichedEvents);
      const uiResource = createUIResource({
        uri: "ui://outlook-meetings/upcoming-events",
        content: { type: 'externalUrl', iframeUrl: uiUrl },
        encoding: 'text',
        uiMetadata: {
          'preferred-frame-size': ['100%', '700px'],
        },
      });
      
      const successMessage = `Here are your upcoming meetings (interactive view):

Summary (next events found: ${events.length})

${eventsList}

Would you like me to open details for any meeting, reschedule or cancel one, or create a new meeting?`;
  
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
