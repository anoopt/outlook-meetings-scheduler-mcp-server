import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Event, Attendee } from "@microsoft/microsoft-graph-types";
import { format } from 'date-fns';
import { registerTool } from "../utils/tool-registration.js";
import { getGraphConfig } from "../utils/graph-config.js";

/**
 * Register event update tools with the MCP server
 */
export function registerEventUpdateTools(server: McpServer): void {
  // Register update event tool
  registerTool(
    server,
    "update-event",
    "Update an existing calendar event",
    {
      eventId: z.string().describe("ID of the event to update"),
      subject: z.string().optional().describe("New subject for the calendar event"),
      body: z.string().optional().describe("New content/body for the calendar event"),
      start: z.string().optional().describe("New start time in ISO format (e.g. 2025-04-20T12:00:00)"),
      end: z.string().optional().describe("New end time in ISO format (e.g. 2025-04-20T13:00:00)"),
      timeZone: z.string().optional().describe("New time zone for the event"),
      location: z.string().optional().describe("New location for the event"),
      attendees: z.array(
        z.object({
          email: z.string().describe("Email address of the attendee"),
          name: z.string().optional().describe("Name of the attendee"),
          type: z.enum(["required", "optional"]).optional().describe("Type of attendee: required or optional")
        })
      ).optional().describe("List of attendees to add or update for the event"),
    },
    async ({ eventId, subject, body, start, end, timeZone, location, attendees }) => {
      const { graph, userEmail, authError } = await getGraphConfig();

      if (authError) {
        return {
          content: [{ type: "text", text: `🔐 Authentication Required\n\n${authError}\n\nPlease complete the authentication and try again.` }]
        };
      }
  
      // Create the event update object with only properties that should be updated
      const eventUpdates: Partial<Event> = {};
      
      if (subject) {
        eventUpdates.subject = subject;
      }
      
      if (body) {
        eventUpdates.body = {
          contentType: "html",
          content: `${body}<br/>Updated around ${format(new Date(), 'dd-MMM-yyyy HH:mm')}`
        };
      }
      
      if (start) {
        eventUpdates.start = {
          dateTime: start,
          timeZone: timeZone || undefined
        };
      }
      
      if (end) {
        eventUpdates.end = {
          dateTime: end,
          timeZone: timeZone || undefined
        };
      }
      
      if (location) {
        eventUpdates.location = {
          displayName: location
        };
      }
      
      // Handle attendees if provided
      if (attendees && attendees.length > 0) {
        // First get the current event to merge with existing attendees
        const currentEvent = await graph.getEvent(eventId, userEmail);
        
        if (!currentEvent || !currentEvent.attendees) {
          // If no current attendees, just use the new ones
          const formattedAttendees: Attendee[] = attendees.map((attendee: any) => ({
            emailAddress: {
              address: attendee.email,
              name: attendee.name || attendee.email
            },
            type: attendee.type || "required"
          }));
          
          eventUpdates.attendees = formattedAttendees;
        } else {
          // Merge with existing attendees, avoiding duplicates
          const existingAttendees = currentEvent.attendees || [];
          const existingEmails = new Set(
            existingAttendees
              .filter((a: Attendee) => a.emailAddress?.address)
              .map((a: Attendee) => a.emailAddress!.address!.toLowerCase())
          );
          
          // Format new attendees
          const newAttendees: Attendee[] = attendees
            .filter((a: any) => !existingEmails.has(a.email.toLowerCase()))
            .map((attendee: any) => ({
              emailAddress: {
                address: attendee.email,
                name: attendee.name || attendee.email
              },
              type: attendee.type || "required"
            }));
          
          // Combine existing and new attendees
          eventUpdates.attendees = [...existingAttendees, ...newAttendees];
        }
      }
  
      // First get the current event to show what's being updated
      const currentEvent = await graph.getEvent(eventId, userEmail);
      
      if (!currentEvent) {
        return {
          content: [
            {
              type: "text",
              text: "Could not find the event to update. Please check the event ID.",
            },
          ],
        };
      }
      
      // Call the Graph API to update the event
      const result = await graph.updateEvent(eventId, eventUpdates, userEmail);
      
      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to update calendar event. Check the logs for details.",
            },
          ],
        };
      }
  
      // Format the result for response
      const eventUrl = result.webLink || "No event URL available";
      const successMessage = `
Calendar event updated successfully!

Event ID: ${eventId}
${subject ? `New Subject: ${subject}\nPrevious: ${currentEvent.subject || "No subject"}` : ''}
${start ? `New Start: ${start}\nPrevious: ${currentEvent.start?.dateTime || "No start time"}` : ''}
${end ? `New End: ${end}\nPrevious: ${currentEvent.end?.dateTime || "No end time"}` : ''}
${location ? `New Location: ${location}\nPrevious: ${currentEvent.location?.displayName || "No location"}` : ''}
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

  // Register update event attendees tool
  registerTool(
    server,
    "update-event-attendees",
    "Add or remove attendees from a calendar event",
    {
      eventId: z.string().describe("ID of the event to update"),
      addAttendees: z.array(
        z.object({
          email: z.string().describe("Email address of the attendee to add"),
          name: z.string().optional().describe("Name of the attendee"),
          type: z.enum(["required", "optional"]).optional().describe("Type of attendee: required or optional")
        })
      ).optional().describe("List of attendees to add to the event"),
      removeAttendees: z.array(
        z.string().describe("Email addresses of attendees to remove from the event")
      ).optional().describe("List of email addresses to remove from the event"),
    },
    async ({ eventId, addAttendees, removeAttendees }) => {
      const { graph, userEmail, authError } = await getGraphConfig();

      if (authError) {
        return {
          content: [{ type: "text", text: `🔐 Authentication Required\n\n${authError}\n\nPlease complete the authentication and try again.` }]
        };
      }
  
      // First get the current event to get existing attendees
      const currentEvent = await graph.getEvent(eventId, userEmail);
      
      if (!currentEvent) {
        return {
          content: [
            {
              type: "text",
              text: "Could not find the event to update. Please check the event ID.",
            },
          ],
        };
      }
      
      // Get current attendees or initialize empty array
      const currentAttendees = currentEvent.attendees || [];
      
      // Process attendee removals if any
      let updatedAttendees = [...currentAttendees];
      let removedAttendeesList: string[] = [];
      
      if (removeAttendees && removeAttendees.length > 0) {
        // Create a set of lowercase email addresses to remove for case-insensitive matching
        const emailsToRemove = new Set(removeAttendees.map((email: string) => email.toLowerCase()));
        
        // Filter out attendees that should be removed
        updatedAttendees = currentAttendees.filter((attendee: Attendee) => {
          const email = attendee.emailAddress?.address?.toLowerCase() || '';
          const shouldRemove = emailsToRemove.has(email);
          if (shouldRemove) {
            removedAttendeesList.push(attendee.emailAddress?.address || email);
          }
          return !shouldRemove;
        });
      }
      
      // Process attendee additions if any
      let addedAttendeesList: string[] = [];
      
      if (addAttendees && addAttendees.length > 0) {
        // Get existing email addresses to avoid duplicates
        const existingEmails = new Set(
          updatedAttendees
            .filter((a: Attendee) => a.emailAddress?.address)
            .map((a: Attendee) => a.emailAddress!.address!.toLowerCase())
        );
        
        // Create new attendee objects for those that don't already exist
        const newAttendees: Attendee[] = addAttendees
          .filter((a: any) => !existingEmails.has(a.email.toLowerCase()))
          .map((attendee: any) => {
            addedAttendeesList.push(attendee.email);
            return {
              emailAddress: {
                address: attendee.email,
                name: attendee.name || attendee.email
              },
              type: attendee.type || "required"
            };
          });
        
        // Add new attendees to the list
        updatedAttendees = [...updatedAttendees, ...newAttendees];
      }
      
      // Only update if there are changes
      if ((addAttendees && addAttendees.length > 0) || (removeAttendees && removeAttendees.length > 0)) {
        // Update the event with only the attendees property
        const eventUpdates: Partial<Event> = {
          attendees: updatedAttendees
        };
        
        // Call the Graph API to update the event
        const result = await graph.updateEvent(eventId, eventUpdates, userEmail);
        
        if (!result) {
          return {
            content: [
              {
                type: "text",
                text: "Failed to update event attendees. Check the logs for details.",
              },
            ],
          };
        }
        
        // Format the result for response
        const eventUrl = result.webLink || "No event URL available";
        let successMessage = `Calendar event attendees updated successfully!\n\n`;
        successMessage += `Event: ${currentEvent.subject || "No subject"}\n`;
        
        if (addedAttendeesList.length > 0) {
          successMessage += `\nAdded attendees:\n${addedAttendeesList.join('\n')}\n`;
        }
        
        if (removedAttendeesList.length > 0) {
          successMessage += `\nRemoved attendees:\n${removedAttendeesList.join('\n')}\n`;
        }
        
        successMessage += `\nEvent URL: ${eventUrl}`;
        
        return {
          content: [
            {
              type: "text",
              text: successMessage,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "No changes to attendees were specified.",
            },
          ],
        };
      }
    }
  );
}
