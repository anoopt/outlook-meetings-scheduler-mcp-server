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
                    return peopleResult.value;
                }

                // If no results from /people, try searching in the directory
                logger.info(`⌛ No results from people API, searching directory...`);
                const usersResult = await client
                    .api(`/users`)
                    .filter(`startswith(displayName,'${searchTerm}')`)
                    .select('displayName,mail,userPrincipalName')
                    .top(5)
                    .get();

                if (usersResult && usersResult.value && usersResult.value.length > 0) {
                    logger.info(`✅ Found ${usersResult.value.length} matching users from directory`);
                    return usersResult.value;
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