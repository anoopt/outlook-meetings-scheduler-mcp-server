import { AuthenticationResult, ClientCredentialRequest, ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { logger } from "./logger.js";

export default class Auth {
    private config: Configuration;
    private cca: ConfidentialClientApplication;

    constructor(clientId: string, clientSecret: string, tenantId: string) {
        this.config = {
            auth: {
                clientId,
                clientSecret,
                authority: `https://login.microsoftonline.com/${tenantId}/`
            }
        }
        this.cca = new ConfidentialClientApplication(this.config);
    }

    async getAccessToken(): Promise<string | null> {
        logger.progress("⌛ Getting access token...");

        try{
            const clientCredentialRequest: ClientCredentialRequest = {
                scopes: ["https://graph.microsoft.com/.default"],
                skipCache: true
            };
            const response: AuthenticationResult | null = await this.cca.acquireTokenByClientCredential(clientCredentialRequest);
            const accessToken: string | undefined = response?.accessToken;
            logger.info("✅ Got access token");
            return accessToken || null;
        } catch (error) {
            logger.error("🚨 Error in getAccessToken function.", error);
            return null;
        }
    }
}