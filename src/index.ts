import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Event, Attendee } from "@microsoft/microsoft-graph-types";
import { addBusinessDays, format } from 'date-fns';
import Graph from './graph.js';

// Create server instance
const server = new McpServer({
  name: "outlook-meetings-scheduler-mcp",
  version: "1.0.0",
});

// Register find person tool
server.tool(
  "find-person",
  "Find a person's email address by their name",
  {
    name: z.string().describe("Name or partial name of the person to find"),
  },
  async ({ name }) => {
    const clientId = process.env.CLIENT_ID || "";
    const clientSecret = process.env.CLIENT_SECRET || "";
    const tenantId = process.env.TENANT_ID || "";
    const userEmail = process.env.USER_EMAIL || "";

    try {
      const graph = new Graph(
        clientId,
        clientSecret,
        tenantId
      );
  
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
                
                You can use these email addresses to create a calendar event.
                    `;
  
      return {
        content: [
          {
            type: "text",
            text: successMessage,
          },
        ],
      };
    } catch (error) {
      console.error("Error searching for people:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error searching for people: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);

// Register calendar event creation tool
server.tool(
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

    const clientId = process.env.CLIENT_ID || "";
    const clientSecret = process.env.CLIENT_SECRET || "";
    const tenantId = process.env.TENANT_ID || "";
    const userEmail = process.env.USER_EMAIL || "";

    try {
      const graph = new Graph(
        clientId,
        clientSecret,
        tenantId
      );
  
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
    } catch (error) {
      console.error("Error creating calendar event:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);


// Register calendar event creation with attendees tool
server.tool(
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

    const clientId = process.env.CLIENT_ID || "";
    const clientSecret = process.env.CLIENT_SECRET || "";
    const tenantId = process.env.TENANT_ID || "";
    const userEmail = process.env.USER_EMAIL || "";

    try {
      const graph = new Graph(
        clientId,
        clientSecret,
        tenantId
      );
  
      // Calculate default times if not provided
      const nextDay: string = format(addBusinessDays(new Date(), 1), 'yyyy-MM-dd');
      const startTime: string = start ? start : `${nextDay}T12:00:00`;
      const endTime: string = end ? end : `${nextDay}T13:00:00`;
  
      // Format attendees for the event
      const formattedAttendees: Attendee[] = attendees.map(attendee => ({
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
      const attendeesList = formattedAttendees.map(a => {
        const name = a.emailAddress?.name || 'No name';
        const email = a.emailAddress?.address || 'No email';
        const type = a.type || 'required';
        return `${name} (${email}) - ${type}`;
      }).join("\n                ");
      
      const successMessage = `
                Calendar event created successfully!

                Subject: ${subject}
                Start: ${startTime}
                End: ${endTime}
                Time Zone: ${timeZone}
                ${location ? `Location: ${location}\n                ` : ''}User: ${userEmail}
                Attendees: 
                ${attendeesList}
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
    } catch (error) {
      console.error("Error creating calendar event:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);


// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Calendar Event MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});