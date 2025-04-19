// import "isomorphic-fetch";
import { AuthProvider, Client, Options } from "@microsoft/microsoft-graph-client";
import { Event } from "@microsoft/microsoft-graph-types";
import Auth from "./auth.js";

export default class Graph {

    private auth: Auth;

    constructor(clientId: string, clientSecret: string, tenantId: string) {
        this.auth = new Auth(clientId, clientSecret, tenantId);
    };

    async createEvent(event: Event, userEmail: string): Promise<any> {
        const client: Client | null = await this.getClient();

        if (client) {
            console.info("\u001b[93m⌛ Creating event...");
            try {
                const result: any = await client
                    .api(`/users/${userEmail}/calendar/events`)
                    .post(event);

                if (result) {
                    console.info("\u001b[32m✅ Event created");
                    console.log(result);
                } else {
                    console.warn("\u001b[33m⚠️ There was an error creating the event");
                }
                return result;
            } catch (error) {
                console.error("\u001b[91m🚨 Error in createEvent function.");
                console.error(error);
                return null;
            }
        }
        return null;
    };

    async searchPeople(searchTerm: string, userEmail: string): Promise<any> {
        const client: Client | null = await this.getClient();

        if (client) {
            console.info(`\u001b[93m⌛ Searching for people matching "${searchTerm}"...`);
            try {
                // Try the /people endpoint first as it's most likely to have recent contacts
                const peopleResult = await client
                    .api(`/users/${userEmail}/people`)
                    .search(`"${searchTerm}"`)
                    .get();

                if (peopleResult && peopleResult.value && peopleResult.value.length > 0) {
                    console.info(`\u001b[32m✅ Found ${peopleResult.value.length} matching contacts from people API`);
                    return peopleResult.value;
                }

                // If no results from /people, try searching in the directory
                console.info(`\u001b[93m⌛ No results from people API, searching directory...`);
                const usersResult = await client
                    .api(`/users`)
                    .filter(`startswith(displayName,'${searchTerm}')`)
                    .select('displayName,mail,userPrincipalName')
                    .top(5)
                    .get();

                if (usersResult && usersResult.value && usersResult.value.length > 0) {
                    console.info(`\u001b[32m✅ Found ${usersResult.value.length} matching users from directory`);
                    return usersResult.value;
                }

                console.warn(`\u001b[33m⚠️ No matching people found for "${searchTerm}"`);
                return [];
            } catch (error) {
                console.error("\u001b[91m🚨 Error in searchPeople function.");
                console.error(error);
                return null;
            }
        }
        return null;
    };

    private async getClient(): Promise<Client | null> {
        const accessToken: string | null = await this.auth.getAccessToken();
        if (accessToken) {
            console.info("\u001b[93m⌛ Getting Graph client...");
            const authProvider: AuthProvider = (done) => {
                done(null, accessToken)
            };
            const options: Options = {
                authProvider
            };
            const client: Client = Client.init(options);
            console.info("\u001b[32m✅ Got Graph client");
            return client;
        }
        return null;
    };
}