import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Event, Attendee } from "@microsoft/microsoft-graph-types";
import { addBusinessDays, format } from 'date-fns';
import { registerTool } from "../utils/tool-registration.js";
import { getGraphConfig } from "../utils/graph-config.js";

/**
 * Register event creation tools with the MCP server
 */
export function registerEventCreateTools(server: McpServer): void {
  // Register calendar event creation tool
  registerTool(
    server,
    "create-event",
    "Create a calendar event using Microsoft Graph API",
    {
      subject: z.string().describe("Subject of the calendar event"),
      body: z.string().describe("Content/body of the calendar event"),
      start: z.string().optional().describe("Start time in ISO format (e.g. 2025-04-20T12:00:00). Defaults to next business day at noon"),
      end: z.string().optional().describe("End time in ISO format (e.g. 2025-04-20T13:00:00). Defaults to next business day at 1PM"),
      timeZone: z.string().optional().describe("Time zone for the event. Defaults to GMT Standard Time"),
    },
    async ({ subject, body, start, end, timeZone = "GMT Standard Time" }) => {
      const { graph, userEmail } = getGraphConfig();
  
      // Calculate default times if not provided
      const nextDay: string = format(addBusinessDays(new Date(), 1), 'yyyy-MM-dd');
      const startTime: string = start ? start : `${nextDay}T12:00:00`;
      const endTime: string = end ? end : `${nextDay}T13:00:00`;
  
      // Create the event object
      const event: Event = {
        subject,
        body: {
          contentType: "html",
          content: `${body}<br/>Request submitted around ${format(new Date(), 'dd-MMM-yyyy HH:mm')}`
        },
        start: {
          dateTime: startTime,
          timeZone
        },
        end: {
          dateTime: endTime,
          timeZone
        }
      };
  
      // Call the Graph API to create the event
      const result = await graph.createEvent(event, userEmail);
      
      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to create calendar event. Check the logs for details.",
            },
          ],
        };
      }
  
      // Format the result for response
      const eventUrl = result.webLink || "No event URL available";
      const eventId = result.id || "No event ID available";
      const successMessage = `
Calendar event created successfully!

Subject: ${subject}
Start: ${startTime}
End: ${endTime}
Time Zone: ${timeZone}
User: ${userEmail}
Event ID: ${eventId}
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

  // Register calendar event creation with attendees tool
  registerTool(
    server,
    "create-event-with-attendees",
    "Create a calendar event with attendees using Microsoft Graph API",
    {
      subject: z.string().describe("Subject of the calendar event"),
      body: z.string().describe("Content/body of the calendar event"),
      start: z.string().optional().describe("Start time in ISO format (e.g. 2025-04-20T12:00:00). Defaults to next business day at noon"),
      end: z.string().optional().describe("End time in ISO format (e.g. 2025-04-20T13:00:00). Defaults to next business day at 1PM"),
      timeZone: z.string().optional().describe("Time zone for the event. Defaults to GMT Standard Time"),
      location: z.string().optional().describe("Location of the event"),
      attendees: z.array(
        z.object({
          email: z.string().describe("Email address of the attendee"),
          name: z.string().optional().describe("Name of the attendee"),
          type: z.enum(["required", "optional"]).optional().describe("Type of attendee: required or optional")
        })
      ).describe("List of attendees for the event")
    },
    async ({ subject, body, start, end, timeZone = "GMT Standard Time", location, attendees }) => {
      const { graph, userEmail } = getGraphConfig();
  
      // Calculate default times if not provided
      const nextDay: string = format(addBusinessDays(new Date(), 1), 'yyyy-MM-dd');
      const startTime: string = start ? start : `${nextDay}T12:00:00`;
      const endTime: string = end ? end : `${nextDay}T13:00:00`;
  
      // Format attendees for the event
      const formattedAttendees: Attendee[] = attendees.map((attendee: any) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name || attendee.email
        },
        type: attendee.type || "required"
      }));

      // Create the event object
      const event: Event = {
        subject,
        body: {
          contentType: "html",
          content: `${body}<br/>Request submitted around ${format(new Date(), 'dd-MMM-yyyy HH:mm')}`
        },
        start: {
          dateTime: startTime,
          timeZone
        },
        end: {
          dateTime: endTime,
          timeZone
        },
        attendees: formattedAttendees
      };

      // Add location if provided
      if (location) {
        event.location = {
          displayName: location
        };
      }
  
      // Call the Graph API to create the event
      const result = await graph.createEvent(event, userEmail);
      
      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to create calendar event. Check the logs for details.",
            },
          ],
        };
      }
  
      // Format the result for response
      const eventUrl = result.webLink || "No event URL available";
      const eventId = result.id || "No event ID available";
      const successMessage = `
Calendar event created successfully!

Subject: ${subject}
Start: ${startTime}
End: ${endTime}
Time Zone: ${timeZone}
${location ? `Location: ${location}\n                ` : ''}User: ${userEmail}
Attendees: 
${formattedAttendees.map(a => {
    const name = a.emailAddress?.name || 'No name';
    const email = a.emailAddress?.address || 'No email';
    const type = a.type || 'required';
    return `${name} (${email}) - ${type}`;
}).join("\n                ")}
Event ID: ${eventId}
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
}
