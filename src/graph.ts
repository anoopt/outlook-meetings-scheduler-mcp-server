// import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import { Event } from "@microsoft/microsoft-graph-types";
import { AuthManager } from "./auth.js";
import { logger } from "./logger.js";

export default class Graph {

    private authManager: AuthManager;

    constructor(authManager: AuthManager) {
        this.authManager = authManager;
    }

    async createEvent(event: Event, userEmail: string): Promise<any> {
        const client: Client | null = await this.getClient();

        if (client) {
            logger.progress("⌛ Creating event...");
            try {
                const result: any = await client
                    .api(`/users/${userEmail}/calendar/events`)
                    .post(event);

                if (result) {
                    logger.info("✅ Event created", result);
                } else {
                    logger.info("⚠️ There was an error creating the event");
                }
                return result;
            } catch (error) {
                logger.error("🚨 Error in createEvent function.", error);
                return null;
            }
        }
        return null;
    };

    async searchPeople(searchTerm: string, userEmail: string): Promise<any> {
        const client: Client | null = await this.getClient();

        if (client) {
            logger.progress(`⌛ Searching for people matching "${searchTerm}"...`);
            try {
                // Try the /people endpoint first as it's most likely to have recent contacts
                const peopleResult = await client
                    .api(`/users/${userEmail}/people`)
                    .search(`"${searchTerm}"`)
                    .get();

                if (peopleResult && peopleResult.value && peopleResult.value.length > 0) {
                    logger.info(`✅ Found ${peopleResult.value.length} matching contacts from people API`);
                    // Fetch photos for each person
                    const peopleWithPhotos = await this.addPhotosToResults(client, peopleResult.value);
                    return peopleWithPhotos;
                }

                // If no results from /people, try searching in the directory
                logger.info(`⌛ No results from people API, searching directory...`);
                const usersResult = await client
                    .api(`/users`)
                    .filter(`startswith(displayName,'${searchTerm}')`)
                    .select('displayName,mail,userPrincipalName,jobTitle,officeLocation,id')
                    .top(5)
                    .get();

                if (usersResult && usersResult.value && usersResult.value.length > 0) {
                    logger.info(`✅ Found ${usersResult.value.length} matching users from directory`);
                    // Fetch photos for each user
                    const usersWithPhotos = await this.addPhotosToResults(client, usersResult.value);
                    return usersWithPhotos;
                }

                logger.info(`⚠️ No matching people found for "${searchTerm}"`);
                return [];
            } catch (error) {
                logger.error("🚨 Error in searchPeople function.", error);
                return null;
            }
        }
        return null;
    };

    /**
     * Fetch a user's profile photo by email/userId and return as base64 data URL
     * @param client - Graph client instance
     * @param emailOrId - Email address or user ID
     * @returns Base64 data URL of the photo, or null if not available
     */
    private async getPhotoByEmail(client: Client, emailOrId: string): Promise<string | null> {
        try {
            const photoBlob = await client
                .api(`/users/${emailOrId}/photo/$value`)
                .get();

            if (photoBlob) {
                const buffer = Buffer.from(await photoBlob.arrayBuffer());
                const base64Photo = buffer.toString('base64');
                const mimeType = photoBlob.type || 'image/jpeg';
                return `data:${mimeType};base64,${base64Photo}`;
            }
        } catch (error) {
            // Photo not available
        }
        return null;
    }

    /**
     * Fetch photos for an array of people/users and add them as base64 data URLs
     * Can be used for people search results or meeting attendees
     */
    async addPhotosToResults(client: Client, people: any[]): Promise<any[]> {
        const results = await Promise.all(
            people.map(async (person) => {
                const userId = person.id || person.userPrincipalName || person.mail;
                if (!userId) return person;

                const photoDataUrl = await this.getPhotoByEmail(client, userId);
                if (photoDataUrl) {
                    return { ...person, photoDataUrl };
                }
                return person;
            })
        );
        return results;
    };

    /**
     * Add photos to meeting attendees
     * @param meetings - Array of meeting objects from Graph API
     * @returns Meetings with attendee photos added
     */
    async addAttendeesPhotosToMeetings(meetings: any[]): Promise<any[]> {
        const client: Client | null = await this.getClient();
        if (!client) return meetings;

        const results = await Promise.all(
            meetings.map(async (meeting) => {
                if (!meeting.attendees || meeting.attendees.length === 0) {
                    return meeting;
                }

                const attendeesWithPhotos = await Promise.all(
                    meeting.attendees.map(async (attendee: any) => {
                        const email = attendee.emailAddress?.address;
                        if (!email) return attendee;

                        const photoDataUrl = await this.getPhotoByEmail(client, email);
                        if (photoDataUrl) {
                            return { ...attendee, photoDataUrl };
                        }
                        return attendee;
                    })
                );

                return { ...meeting, attendees: attendeesWithPhotos };
            })
        );
        return results;
    };

    async getEvent(eventId: string, userEmail: string): Promise<any> {
        const client: Client | null = await this.getClient();

        if (client) {
            logger.progress(`⌛ Getting event with ID ${eventId}...`);
            try {
                const result: any = await client
                    .api(`/users/${userEmail}/calendar/events/${eventId}`)
                    .get();

                if (result) {
                    logger.info("✅ Event retrieved", result);
                } else {
                    logger.info("⚠️ No event found with that ID");
                }
                return result;
            } catch (error) {
                logger.error("🚨 Error in getEvent function.", error);
                return null;
            }
        }
        return null;
    };

    async updateEvent(eventId: string, eventUpdates: Partial<Event>, userEmail: string): Promise<any> {
        const client: Client | null = await this.getClient();

        if (client) {
            logger.progress(`⌛ Updating event with ID ${eventId}...`);
            try {
                const result: any = await client
                    .api(`/users/${userEmail}/calendar/events/${eventId}`)
                    .update(eventUpdates);

                if (result) {
                    logger.info("✅ Event updated", result);
                } else {
                    logger.info("⚠️ There was an issue updating the event");
                }
                return result;
            } catch (error) {
                logger.error("🚨 Error in updateEvent function.", error);
                return null;
            }
        }
        return null;
    };

    async deleteEvent(eventId: string, userEmail: string): Promise<boolean> {
        const client: Client | null = await this.getClient();

        if (client) {
            logger.progress(`⌛ Deleting event with ID ${eventId}...`);
            try {
                await client
                    .api(`/users/${userEmail}/calendar/events/${eventId}`)
                    .delete();

                logger.info("✅ Event deleted");
                return true;
            } catch (error) {
                logger.error("🚨 Error in deleteEvent function.", error);
                return false;
            }
        }
        return false;
    };

    async listEvents(userEmail: string, params: {startDateTime?: string, endDateTime?: string, filter?: string, top?: number, subject?: string} = {}): Promise<any> {
        const client: Client | null = await this.getClient();

        if (client) {
            logger.progress("⌛ Listing calendar events...");
            try {
                let request = client.api(`/users/${userEmail}/calendar/events`);
                
                // Apply query parameters if provided
                if (params.startDateTime && params.endDateTime) {
                    request = request.filter(`start/dateTime ge '${params.startDateTime}' and end/dateTime le '${params.endDateTime}'`);
                } else if (params.filter) {
                    request = request.filter(params.filter);
                } else if (params.subject) {
                    // Filter by subject containing specific text
                    request = request.filter(`contains(subject, '${params.subject}')`);
                }
                
                if (params.top) {
                    request = request.top(params.top);
                } else {
                    // Default to top 10 events
                    request = request.top(10);
                }

                // Order by start date ascending to show upcoming meetings in chronological order
                request = request.orderby('start/dateTime');

                const result = await request.get();

                if (result && result.value) {
                    logger.info(`✅ Retrieved ${result.value.length} events`);
                } else {
                    logger.info("⚠️ No events found or error retrieving events");
                }
                return result;
            } catch (error) {
                logger.error("🚨 Error in listEvents function.", error);
                return null;
            }
        }
        return null;
    };

    private async getClient(): Promise<Client | null> {
        try {
            const authProvider = this.authManager.getGraphAuthProvider();
            
            logger.progress("⌛ Getting Graph client...");
            const client = Client.initWithMiddleware({
                authProvider: authProvider
            });
            logger.info("✅ Got Graph client");
            return client;
        } catch (error) {
            logger.error("🚨 Error getting Graph client", error);
            return null;
        }
    };
}