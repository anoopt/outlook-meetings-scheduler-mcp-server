import { AuthenticationResult, ClientCredentialRequest, ConfidentialClientApplication, Configuration } from "@azure/msal-node";
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
        console.info("\u001b[93m⌛ Getting access token...");

        try{
            const clientCredentialRequest: ClientCredentialRequest = {
                scopes: ["https://graph.microsoft.com/.default"],
                skipCache: true
            };
            const response: AuthenticationResult | null = await this.cca.acquireTokenByClientCredential(clientCredentialRequest);
            const accessToken: string | undefined = response?.accessToken;
            console.info("\u001b[32m✅ Got access token");
            return accessToken || null;
        } catch (error) {
            console.error("\u001b[91m🚨 Error in getAccessToken function.");
            console.error(error);
            return null;
        }
    }
}