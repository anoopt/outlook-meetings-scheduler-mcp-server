/**
 * Default values for interactive authentication
 * Uses a multi-tenant Azure AD app that allows users from any organization to authenticate
 * App: "Outlook Meetings Scheduler MCP Server" registered in anoopccdev1.onmicrosoft.com
 * Users will see a consent prompt on first use (no admin consent required for delegated permissions)
 */

// Default multi-tenant app for interactive authentication
// App Name: "Outlook Meetings Scheduler MCP Server"
// Registered in: anoopccdev1.onmicrosoft.com (supports any organization)
export const DEFAULT_CLIENT_ID = "ca696137-503f-4489-bdf4-7cb76e272639";

// Default tenant ID (common for multi-tenant)
export const DEFAULT_TENANT_ID = "common";

// Default redirect URI for local interactive auth (no port required)
export const DEFAULT_REDIRECT_URI = "http://localhost";
