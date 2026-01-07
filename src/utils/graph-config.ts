import Graph from '../graph.js';
import { AuthManager, AuthMode } from '../auth.js';
import { logger } from '../logger.js';

// Singleton instances
let authManagerInstance: AuthManager | null = null;
let graphInstance: Graph | null = null;
let isInitialized = false;
let lastAuthError: string | null = null;

/**
 * Initialize authentication and graph client
 */
async function initializeAuth(): Promise<{ authManager: AuthManager; graph: Graph }> {
  if (isInitialized && authManagerInstance && graphInstance) {
    return { authManager: authManagerInstance, graph: graphInstance };
  }
  
  // Smart authentication mode detection for backward compatibility
  let authModeStr = process.env.AUTH_MODE;
  
  // If AUTH_MODE not explicitly set, detect based on environment variables
  if (!authModeStr) {
    if (process.env.CLIENT_SECRET) {
      // Presence of CLIENT_SECRET indicates client_credentials mode (backward compatibility)
      authModeStr = "client_credentials";
      logger.info("Detected client_credentials mode (CLIENT_SECRET present)");
    } else if (process.env.ACCESS_TOKEN) {
      // Presence of ACCESS_TOKEN indicates client_provided_token mode
      authModeStr = "client_provided_token";
      logger.info("Detected client_provided_token mode (ACCESS_TOKEN present)");
    } else {
      // Default to interactive mode for new users
      authModeStr = "interactive";
      logger.info("Defaulting to interactive mode");
    }
  } else {
    logger.info(`Using explicit AUTH_MODE: ${authModeStr}`);
  }
  
  const authMode = authModeStr as AuthMode;
  
  const clientId = process.env.CLIENT_ID || "";
  const clientSecret = process.env.CLIENT_SECRET || "";
  const tenantId = process.env.TENANT_ID || "";
  
  // Create AuthManager based on mode
  let authManager: AuthManager;
  
  switch (authMode) {
    case AuthMode.ClientCredentials:
      authManager = new AuthManager({
        mode: AuthMode.ClientCredentials,
        clientId,
        clientSecret,
        tenantId
      });
      break;
      
    case AuthMode.Interactive:
      authManager = new AuthManager({
        mode: AuthMode.Interactive,
        clientId: clientId || undefined, // Use default if not provided
        tenantId: tenantId || undefined, // Use default if not provided
        redirectUri: process.env.REDIRECT_URI
      });
      break;
      
    case AuthMode.ClientProvidedToken:
      authManager = new AuthManager({
        mode: AuthMode.ClientProvidedToken,
        accessToken: process.env.ACCESS_TOKEN,
        expiresOn: process.env.TOKEN_EXPIRES_ON ? new Date(process.env.TOKEN_EXPIRES_ON) : undefined
      });
      break;
      
    default:
      throw new Error(`Unsupported auth mode: ${authModeStr}. Supported modes: client_credentials, interactive, client_provided_token`);
  }
  
  // Initialize the auth manager
  try {
    await authManager.initialize();
    logger.info(`✅ AuthManager initialized with mode: ${authMode}`);
    lastAuthError = null;
    
    // Check if device code authentication is in progress
    const deviceCodeInfo = authManager.getDeviceCodeInfo();
    if (deviceCodeInfo) {
      const deviceCodeMessage = `🔐 Authentication Required\n\nPlease visit: ${deviceCodeInfo.verificationUri}\nEnter code: ${deviceCodeInfo.userCode}\n\nAfter completing authentication, try your request again.`;
      lastAuthError = deviceCodeMessage;
      throw new Error(deviceCodeMessage);
    }
  } catch (error: any) {
    lastAuthError = error.message || String(error);
    throw error;
  }
  
  const graph = new Graph(authManager);
  
  // Cache instances
  authManagerInstance = authManager;
  graphInstance = graph;
  isInitialized = true;
  
  return { authManager, graph };
}

/**
 * Creates a Graph client with environment variables
 * @returns Configuration object with Graph client and user email
 */
export async function getGraphConfig() {
  const authModeStr = process.env.AUTH_MODE || "interactive";
  const authMode = authModeStr as AuthMode;

  // For client_credentials mode, USER_EMAIL is required
  // For interactive mode, we'll get the email from the authenticated user
  let userEmail = process.env.USER_EMAIL || "";
  let userId = process.env.USER_ID || "";
  
  try {
    const { authManager, graph } = await initializeAuth();
    
    // If interactive mode and no USER_ID/USER_EMAIL specified, get them from the authenticated user
    if (authMode === AuthMode.Interactive && (!userEmail || !userId)) {
      try {
        // Get the authenticated user's profile
        const credential = authManager.getAzureCredential();
        const token = await credential.getToken("https://graph.microsoft.com/.default");

        if (token) {
          // Create a temporary client to get user info
          const Client = (await import("@microsoft/microsoft-graph-client")).Client;
          const tempClient = Client.initWithMiddleware({
            authProvider: authManager.getGraphAuthProvider()
          });

          const user = await tempClient.api('/me').select('id,mail,userPrincipalName,otherMails').get();
          logger.info(`User profile response: ${JSON.stringify(user)}`);

          if (!userId) {
            userId = user.id;
            logger.info(`✅ Using authenticated user ID: ${userId}`);
          }

          if (!userEmail) {
            userEmail = user.mail
              || (user.otherMails && user.otherMails.length > 0 ? user.otherMails[0] : null)
              || user.userPrincipalName;
            logger.info(`✅ Using authenticated user email: ${userEmail}`);
          }
        }
      } catch (error: any) {
        logger.error("Failed to get authenticated user profile", error);
        throw new Error("Failed to determine user ID/email. Please set USER_ID and USER_EMAIL environment variables.");
      }
    }
    
    // For client_credentials mode, USER_EMAIL must be provided
    if (authMode === AuthMode.ClientCredentials && !userEmail) {
      throw new Error("USER_EMAIL environment variable is required for client_credentials mode");
    }
    
    return { graph, userEmail, userId, authManager, authError: null };
  } catch (error: any) {
    // Return the error so tools can handle it gracefully
    return {
      graph: null as any,
      userEmail: userEmail || "",
      userId: userId || "",
      authManager: null as any,
      authError: error.message || String(error)
    };
  }
}
