import { AccessToken, TokenCredential, ClientSecretCredential, InteractiveBrowserCredential, DeviceCodeCredential, DeviceCodeInfo, TokenCachePersistenceOptions } from "@azure/identity";
import { useIdentityPlugin } from "@azure/identity";
import { cachePersistencePlugin } from "@azure/identity-cache-persistence";
import { AuthenticationProvider } from "@microsoft/microsoft-graph-client";
import jwt from "jsonwebtoken";
import { logger } from "./logger.js";
import { DEFAULT_CLIENT_ID, DEFAULT_TENANT_ID, DEFAULT_REDIRECT_URI } from "./constants.js";

// Enable persistent token caching
let cachePluginEnabled = false;
function enablePersistentCache() {
  if (!cachePluginEnabled) {
    try {
      useIdentityPlugin(cachePersistencePlugin);
      cachePluginEnabled = true;
      logger.info("Token cache persistence enabled");
    } catch (error) {
      logger.error("Failed to enable token cache persistence", error);
    }
  }
}

// Constants
const ONE_HOUR_IN_MS = 60 * 60 * 1000; // One hour in milliseconds

// Helper function to parse JWT and extract scopes
function parseJwtScopes(token: string): string[] {
  try {
    // Decode JWT without verifying signature (we trust the token from Azure Identity)
    const decoded = jwt.decode(token) as any;

    if (!decoded || typeof decoded !== 'object') {
      logger.info("Failed to decode JWT token");
      return [];
    }

    // Extract scopes from the 'scp' claim (space-separated string)
    const scopesString = decoded.scp;
    if (typeof scopesString === 'string') {
      return scopesString.split(' ').filter(scope => scope.length > 0);
    }

    // Some tokens might have roles instead of scopes
    const roles = decoded.roles;
    if (Array.isArray(roles)) {
      return roles;
    }

    logger.info("No scopes found in JWT token");
    return [];
  } catch (error) {
    logger.error("Error parsing JWT token for scopes", error);
    return [];
  }
}

// Simple authentication provider that works with Azure Identity TokenCredential
export class TokenCredentialAuthProvider implements AuthenticationProvider {
  private credential: TokenCredential;
  private scopes: string[];

  constructor(credential: TokenCredential, scopes?: string[]) {
    this.credential = credential;
    this.scopes = scopes || ["https://graph.microsoft.com/.default"];
  }

  async getAccessToken(): Promise<string> {
    const token = await this.credential.getToken(this.scopes);
    if (!token) {
      throw new Error("Failed to acquire access token");
    }
    return token.token;
  }
}

export interface TokenBasedCredential extends TokenCredential {
  getToken(scopes: string | string[]): Promise<AccessToken | null>;
}

export class ClientProvidedTokenCredential implements TokenBasedCredential {
  private accessToken: string | undefined;
  private expiresOn: Date | undefined;

  constructor(accessToken?: string, expiresOn?: Date) {
    if (accessToken) {
      this.accessToken = accessToken;
      this.expiresOn = expiresOn || new Date(Date.now() + ONE_HOUR_IN_MS); // Default 1 hour
    } else {
      this.expiresOn = new Date(0); // Set to epoch to indicate no valid token
    }
  }

  async getToken(scopes: string | string[]): Promise<AccessToken | null> {
    if (!this.accessToken || !this.expiresOn || this.expiresOn <= new Date()) {
      logger.error("Access token is not available or has expired");
      return null;
    }

    return {
      token: this.accessToken,
      expiresOnTimestamp: this.expiresOn.getTime()
    };
  }

  updateToken(accessToken: string, expiresOn?: Date): void {
    this.accessToken = accessToken;
    this.expiresOn = expiresOn || new Date(Date.now() + ONE_HOUR_IN_MS);
    logger.info("Access token updated successfully");
  }

  isExpired(): boolean {
    return !this.expiresOn || this.expiresOn <= new Date();
  }

  getExpirationTime(): Date {
    return this.expiresOn || new Date(0);
  }

  // Getter for access token (for internal use by AuthManager)
  getAccessToken(): string | undefined {
    return this.accessToken;
  }
}

export enum AuthMode {
  ClientCredentials = "client_credentials",
  ClientProvidedToken = "client_provided_token",
  Interactive = "interactive"
}

export interface AuthConfig {
  mode: AuthMode;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  expiresOn?: Date;
  redirectUri?: string;
}

export class AuthManager {
  private credential: TokenCredential | null = null;
  private config: AuthConfig;
  private deviceCodeInfo: DeviceCodeInfo | null = null;
  private authPromise: Promise<void> | null = null;
  private isAuthenticating: boolean = false;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  getDeviceCodeInfo(): DeviceCodeInfo | null {
    return this.deviceCodeInfo;
  }

  isCurrentlyAuthenticating(): boolean {
    return this.isAuthenticating;
  }

  async initialize(): Promise<void> {
    // Enable persistent cache for interactive mode
    if (this.config.mode === AuthMode.Interactive) {
      enablePersistentCache();
    }

    switch (this.config.mode) {
      case AuthMode.ClientCredentials:
        if (!this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
          throw new Error("Client credentials mode requires tenantId, clientId, and clientSecret");
        }
        logger.info("Initializing Client Credentials authentication");
        this.credential = new ClientSecretCredential(
          this.config.tenantId,
          this.config.clientId,
          this.config.clientSecret
        );
        break;

      case AuthMode.ClientProvidedToken:
        logger.info("Initializing Client Provided Token authentication");
        this.credential = new ClientProvidedTokenCredential(
          this.config.accessToken,
          this.config.expiresOn
        );
        break;

      case AuthMode.Interactive:
        // Use defaults if not provided
        const tenantId = this.config.tenantId || DEFAULT_TENANT_ID;
        const clientId = this.config.clientId || DEFAULT_CLIENT_ID;

        logger.info(`Initializing Interactive authentication with tenant ID: ${tenantId}, client ID: ${clientId}`);

        // Token cache persistence options - allow unencrypted storage as fallback
        const tokenCachePersistenceOptions: TokenCachePersistenceOptions = {
          enabled: true,
          name: "outlook-mcp-cache",
          unsafeAllowUnencryptedStorage: true // Allow unencrypted storage on Linux without libsecret
        };

        // Try Interactive Browser first (opens browser automatically)
        try {
          this.credential = new InteractiveBrowserCredential({
            tenantId: tenantId,
            clientId: clientId,
            redirectUri: this.config.redirectUri || DEFAULT_REDIRECT_URI,
            tokenCachePersistenceOptions: tokenCachePersistenceOptions,
          });
          logger.info("Using interactive browser authentication");
        } catch (error) {
          // Fallback to Device Code flow if browser auth is not available
          logger.info("Browser authentication not available, using device code flow");
          this.credential = new DeviceCodeCredential({
            tenantId: tenantId,
            clientId: clientId,
            tokenCachePersistenceOptions: tokenCachePersistenceOptions,
            userPromptCallback: (info: DeviceCodeInfo) => {
              this.deviceCodeInfo = info; // Store for access by tools
              this.isAuthenticating = true;
              logger.info(`Device code authentication required: ${info.userCode} at ${info.verificationUri}`);
              // Don't use console.log - it interferes with MCP protocol
              return Promise.resolve();
            },
          });
        }
        break;

      default:
        throw new Error(`Unsupported authentication mode: ${this.config.mode}`);
    }

    // Test the credential
    await this.testCredential();
  }

  updateAccessToken(accessToken: string, expiresOn?: Date): void {
    if (this.config.mode === AuthMode.ClientProvidedToken && this.credential instanceof ClientProvidedTokenCredential) {
      this.credential.updateToken(accessToken, expiresOn);
    } else {
      throw new Error("Token update only supported in client provided token mode");
    }
  }

  private async testCredential(): Promise<void> {
    if (!this.credential) {
      throw new Error("Credential not initialized");
    }

    // Skip testing if ClientProvidedToken mode has no initial token
    if (this.config.mode === AuthMode.ClientProvidedToken && !this.config.accessToken) {
      logger.info("Skipping initial credential test as no token was provided at startup.");
      return;
    }

    try {
      const token = await this.credential.getToken("https://graph.microsoft.com/.default");
      if (!token) {
        throw new Error("Failed to acquire token");
      }
      logger.info("Authentication successful");
      this.isAuthenticating = false;
      this.deviceCodeInfo = null; // Clear after successful auth
    } catch (error: any) {
      logger.error("Authentication test failed", error);
      this.isAuthenticating = false;

      // Provide helpful error messages for common issues
      if (this.config.mode === AuthMode.Interactive) {
        if (error.message?.includes('client_secret') || error.message?.includes('client_assertion')) {
          const helpMessage = `Interactive authentication configuration error. Please ensure your Azure AD app has "Allow public client flows" enabled, or use the default public client by removing CLIENT_ID and TENANT_ID from your configuration.`;
          throw new Error(helpMessage);
        }
      }

      throw error;
    }
  }

  getGraphAuthProvider(): TokenCredentialAuthProvider {
    if (!this.credential) {
      throw new Error("Authentication not initialized");
    }

    // For interactive mode, use specific scopes; for app-only, use .default
    const scopes = this.config.mode === AuthMode.Interactive
      ? [
        "https://graph.microsoft.com/Calendars.ReadWrite",
        "https://graph.microsoft.com/People.Read",
        "https://graph.microsoft.com/User.Read"
      ]
      : ["https://graph.microsoft.com/.default"];

    return new TokenCredentialAuthProvider(this.credential, scopes);
  }

  getAzureCredential(): TokenCredential {
    if (!this.credential) {
      throw new Error("Authentication not initialized");
    }
    return this.credential;
  }

  getAuthMode(): AuthMode {
    return this.config.mode;
  }

  isClientCredentials(): boolean {
    return this.config.mode === AuthMode.ClientCredentials;
  }

  isClientProvidedToken(): boolean {
    return this.config.mode === AuthMode.ClientProvidedToken;
  }

  isInteractive(): boolean {
    return this.config.mode === AuthMode.Interactive;
  }

  async getTokenStatus(): Promise<{ isExpired: boolean; expiresOn?: Date; scopes?: string[] }> {
    if (this.credential instanceof ClientProvidedTokenCredential) {
      const tokenStatus = {
        isExpired: this.credential.isExpired(),
        expiresOn: this.credential.getExpirationTime()
      };

      // If we have a valid token, parse it to extract scopes
      if (!tokenStatus.isExpired) {
        const accessToken = this.credential.getAccessToken();
        if (accessToken) {
          try {
            const scopes = parseJwtScopes(accessToken);
            return {
              ...tokenStatus,
              scopes: scopes
            };
          } catch (error) {
            logger.error("Error parsing token scopes in getTokenStatus", error);
            return tokenStatus;
          }
        }
      }

      return tokenStatus;
    } else if (this.credential) {
      // For other credential types, try to get a fresh token and parse it
      try {
        const accessToken = await this.credential.getToken("https://graph.microsoft.com/.default");
        if (accessToken && accessToken.token) {
          const scopes = parseJwtScopes(accessToken.token);
          return {
            isExpired: false,
            expiresOn: new Date(accessToken.expiresOnTimestamp),
            scopes: scopes
          };
        }
      } catch (error) {
        logger.error("Error getting token for scope parsing", error);
      }
    }

    return { isExpired: false };
  }
}

// Legacy Auth class for backward compatibility (now uses AuthManager internally)
export default class Auth {
  private authManager: AuthManager;

  constructor(clientId: string, clientSecret: string, tenantId: string) {
    this.authManager = new AuthManager({
      mode: AuthMode.ClientCredentials,
      clientId,
      clientSecret,
      tenantId
    });
  }

  async getAccessToken(): Promise<string | null> {
    logger.progress("⌛ Getting access token...");

    try {
      // Initialize if not already done
      if (!this.authManager.getAzureCredential()) {
        await this.authManager.initialize();
      }

      const provider = this.authManager.getGraphAuthProvider();
      const accessToken = await provider.getAccessToken();
      logger.info("✅ Got access token");
      return accessToken || null;
    } catch (error) {
      logger.error("🚨 Error in getAccessToken function.", error);
      return null;
    }
  }
}