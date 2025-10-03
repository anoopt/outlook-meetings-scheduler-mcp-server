# Authentication Modes for Outlook Meetings Scheduler MCP Server

This document provides detailed information about the authentication modes available in the Outlook Meetings Scheduler MCP Server.

## Overview

The MCP server supports three authentication modes, with **Interactive** as the default for zero-config setup:

1. **Interactive (Delegated)** - Default mode, user authentication (uses built-in multi-tenant app)
2. **Client Credentials (App-Only)** - Automated scenarios
3. **Client Provided Token** - Custom token management

## Authentication Modes

**Backward Compatibility**: If `AUTH_MODE` is not explicitly specified, the server automatically detects the mode:

- ✅ **CLIENT_SECRET present** → `client_credentials` mode (maintains compatibility with existing setups)
- ✅ **ACCESS_TOKEN present** → `client_provided_token` mode  
- ✅ **Neither present** → `interactive` mode (default for new users)

### 1. Interactive (Delegated) - `interactive` - **DEFAULT**

**Use Case:** User impersonation, accessing user-specific data with user consent (most common scenario)

**How it works:**
- Prompts the user to sign in interactively
- Uses Delegated permissions (user context)
- Attempts browser-based login first
- Falls back to device code flow if browser auth unavailable
- The app acts on behalf of the signed-in user
- **No configuration required** - works out of the box
- Uses built-in multi-tenant Azure AD app (ID: `ca696137-503f-4489-bdf4-7cb76e272639`)

**Built-in Multi-Tenant App Details:**
- **App Name**: "Outlook Meetings Scheduler MCP Server"  
- **Publisher**: Registered in `anoopccdev1.onmicrosoft.com` tenant
- **Supported Accounts**: Any organizational directory (multi-tenant)
- **Permissions**: Calendars.ReadWrite, People.Read, User.Read (delegated)
- **Redirect URI**: `http://localhost`
- **User Experience**: Users from any organization see: "*Outlook Meetings Scheduler MCP Server* would like to access your calendar and contacts"

**Required Environment Variables:**
- `AUTH_MODE=interactive` (or omit - this is the default)
- `USER_EMAIL` (optional) - Automatically detected from signed-in user. Only specify to access a different user's calendar
- `CLIENT_ID` (optional) - Your custom Azure AD Application ID (uses multi-tenant default if not specified)
- `TENANT_ID` (optional) - Your Azure AD Tenant ID (uses "common" if not specified)
- `REDIRECT_URI` (optional) - Custom redirect URI (default: http://localhost)
- Prompts the user to sign in interactively
- Uses Delegated permissions (user context)
- Attempts browser-based login first
- Falls back to device code flow if browser auth unavailable
- The app acts on behalf of the signed-in user

**Required Environment Variables:**
- `AUTH_MODE=interactive`
- `USER_EMAIL` (optional) - Automatically detected from signed-in user. Only specify to access a different user's calendar
- `CLIENT_ID` (optional) - Your custom Azure AD Application ID (uses multi-tenant default if not specified)
- `TENANT_ID` (optional) - Your Azure AD Tenant ID (uses "common" if not specified)
- `REDIRECT_URI` (optional) - Custom redirect URI (default: http://localhost)

**Quick Start (Zero Configuration):**
```json
{
  "mcpServers": {
    "outlook-meetings-scheduler": {
      "command": "node",
      "args": ["./build/index.js"]
    }
  }
}
```

> **What happens:**
> - Uses a built-in multi-tenant Azure AD app (ID: ca696137-503f-4489-bdf4-7cb76e272639)
> - Users from **any organization** can authenticate
> - First-time users see a consent screen: "Outlook Meetings Scheduler MCP Server would like to access your calendar"
> - No Azure AD app registration required
> - Works immediately with zero configuration

**Custom Azure AD App (Optional):**

The built-in multi-tenant app should work for most users. You only need your own app if you want:
- Custom branding (your organization name in consent screen)
- Tenant restrictions (single-tenant only)
- Additional permissions beyond calendar and contacts

To use your own app:

1. Register an app in Azure Portal
2. Add redirect URI: `http://localhost` (Mobile and desktop applications platform)
3. **Enable "Allow public client flows" to YES** in Authentication settings
4. Grant **Delegated permissions**: Calendars.ReadWrite, People.Read, User.Read
5. Set to multi-tenant if you want to support users from other organizations
6. No client secret needed

**Example Configuration (Custom App):**
```json
{
  "env": {
    "AUTH_MODE": "interactive",
    "CLIENT_ID": "your-client-id",
    "TENANT_ID": "your-tenant-id-or-common"
  }
}
```

> **Note:** USER_EMAIL is automatically obtained from the authenticated user's profile. You only need to specify it if you want to access a different user's calendar (requires appropriate permissions).

**Authentication Flow:**
1. User initiates an action requiring authentication
2. **Browser window opens automatically** for sign-in (preferred method)
3. If browser authentication unavailable, falls back to device code flow
4. User signs in with their credentials
5. User consents to permissions (first time only)
6. Token is acquired and **cached persistently** on the local system
7. Subsequent requests use the cached token (no re-authentication needed)
8. Token is automatically refreshed when it expires

**Token Caching:**
- Tokens are stored securely on your system using OS-specific encryption (when available)
- **Windows**: Windows Data Protection API (DPAPI) - always encrypted
- **macOS**: Keychain - always encrypted
- **Linux**: `~/.IdentityService` 
  - Encrypted if `libsecret` is installed
  - Falls back to unencrypted storage if `libsecret` is not available (acceptable for dev/test)
- Cache survives MCP server restarts
- No need to re-authenticate unless token is revoked or cache is cleared

**Security Note for Linux:**
- For production use, install `libsecret` for encrypted token storage
- Without `libsecret`, tokens are stored unencrypted in `~/.IdentityService` (development/testing only)
- Ensure proper file permissions on the cache directory

### 2. Client Credentials (App-Only) - `client_credentials`

**Use Case:** Automated scenarios, server-to-server communication, background jobs

**How it works:**
- Uses Azure AD application credentials (Client ID + Client Secret)
- Authenticates using Application permissions
- No user interaction required
- The app acts on its own behalf, not as a user

**Required Environment Variables:**
- `AUTH_MODE=client_credentials`
- `CLIENT_ID` - Your Azure AD Application ID
- `CLIENT_SECRET` - Your Azure AD Client Secret
- `TENANT_ID` - Your Azure AD Tenant ID
- `USER_EMAIL` - Email of the user whose calendar to access

**Azure AD Setup:**
1. Register an app in Azure Portal
2. Create a client secret
3. Grant **Application permissions**: Calendars.ReadWrite, People.Read.All, User.ReadBasic.All
4. Admin consent required

**Example Configuration:**
```json
{
  "env": {
    "AUTH_MODE": "client_credentials",
    "CLIENT_ID": "your-client-id",
    "CLIENT_SECRET": "your-client-secret",
    "TENANT_ID": "your-tenant-id",
    "USER_EMAIL": "user@example.com"
  }
}
```

### 3. Client Provided Token - `client_provided_token`

**Use Case:** Custom token management, integration with existing authentication systems

**How it works:**
- Uses a pre-acquired access token
- No authentication flow is initiated by the MCP server
- Token refresh must be handled externally
- Useful for integrations where token is obtained elsewhere

**Required Environment Variables:**
- `AUTH_MODE=client_provided_token`
- `ACCESS_TOKEN` - Your pre-acquired access token
- `USER_EMAIL` - Email of the user

**Optional Environment Variables:**
- `TOKEN_EXPIRES_ON` - Token expiration date in ISO format (e.g., 2025-10-03T12:00:00Z)
  - If not provided, assumes token is valid for 1 hour from server start time
  - Helps prevent API calls with expired tokens
  - Better error handling and logging

**Example Configuration (Minimal):**
```json
{
  "env": {
    "AUTH_MODE": "client_provided_token",
    "ACCESS_TOKEN": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "USER_EMAIL": "user@example.com"
  }
}
```

**Example Configuration (With Expiration):**
```json
{
  "env": {
    "AUTH_MODE": "client_provided_token",
    "ACCESS_TOKEN": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "TOKEN_EXPIRES_ON": "2025-10-03T12:00:00Z",
    "USER_EMAIL": "user@example.com"
  }
}
```

**Note:** You are responsible for:
- Obtaining a valid token
- Refreshing the token before expiration
- Updating the `ACCESS_TOKEN` environment variable

## Comparison Table

| Feature | Client Credentials | Interactive | Client Provided Token |
|---------|-------------------|-------------|----------------------|
| **Setup Required** | Azure AD app + secret | None (uses built-in app) | Token acquisition |
| **User Interaction** | None | Required (first time) | None |
| **Permission Type** | Application | Delegated | Depends on token |
| **Admin Consent** | Required | Not required | Depends on token |
| **Client Secret** | Required | Not required | Not required |
| **Token Management** | Automatic | Automatic | Manual |
| **USER_EMAIL** | Required (specify mailbox) | Auto-detected | Required |
| **Best For** | Automation | User scenarios (DEFAULT) | Custom integrations |

## Switching Between Modes

To switch authentication modes, simply change the `AUTH_MODE` environment variable and provide the required credentials for that mode.

### From Client Credentials to Interactive:
1. Change `AUTH_MODE` to `interactive`
2. Remove `CLIENT_SECRET` (not needed)
3. Optionally provide custom `CLIENT_ID` and `TENANT_ID`

### From Interactive to Client Credentials:
1. Change `AUTH_MODE` to `client_credentials`
2. Add `CLIENT_SECRET`
3. Ensure application has required Application permissions

## Troubleshooting

### Interactive Mode Issues

**Problem:** Browser doesn't open for authentication
- **Solution:** The server will automatically fall back to device code flow. Follow the instructions in the console to authenticate.

**Problem:** Asked to sign in every time
- **Solution:** Ensure token cache persistence is working:
  - Check console for "Token cache persistence enabled" message
  - On Linux without `libsecret`: Tokens are cached but unencrypted in `~/.IdentityService` (still works, just less secure)
  - On Linux with root access, install `libsecret` for encrypted caching: `sudo apt-get install libsecret-1-dev`
  - Check cache location exists and is writable:
    - Windows: `%LOCALAPPDATA%\.IdentityService`
    - macOS: Keychain (check Keychain Access app)
    - Linux: `~/.IdentityService`

**Problem:** Need to clear cached tokens
- **Solution:**
  - **Windows**: Delete folder `%LOCALAPPDATA%\.IdentityService\outlook-mcp-cache`
  - **macOS**: Open Keychain Access, search for "outlook-mcp-cache", delete items
  - **Linux**: `rm -rf ~/.IdentityService/outlook-mcp-cache`

**Problem:** Permission denied errors
- **Solution:** Ensure your Azure AD app has the correct Delegated permissions: Calendars.ReadWrite, People.Read, User.Read

**Problem:** Token expired
- **Solution:** The server will automatically prompt for re-authentication when the token expires.

### Client Credentials Issues

**Problem:** "Insufficient privileges" error
- **Solution:** Ensure Application permissions are granted and admin consent is provided in Azure AD.

**Problem:** "Invalid client secret" error
- **Solution:** Verify the client secret is correct and not expired. Generate a new one if needed.

### Client Provided Token Issues

**Problem:** "Access token is not available or has expired"
- **Solution:** Ensure you're providing a valid, non-expired token. Implement token refresh logic in your system.

## Security Considerations

1. **Client Credentials Mode:**
   - Store client secrets securely
   - Never commit secrets to version control
   - Use environment variables or secure vaults
   - Rotate secrets periodically

2. **Interactive Mode:**
   - Tokens are cached by Azure Identity library
   - Cache location is managed by the library
   - Ensure the environment is secure

3. **Client Provided Token Mode:**
   - Implement secure token storage
   - Handle token refresh securely
   - Monitor token expiration

## Architecture Changes

The authentication system has been updated from MSAL Node to Azure Identity:

### Previous Implementation (MSAL Node):
- Used `@azure/msal-node`
- Only supported Client Credentials flow
- Custom authentication provider for Graph client

### Current Implementation (Azure Identity):
- Uses `@azure/identity`
- Supports multiple authentication flows
- `TokenCredential` interface for all auth modes
- Unified authentication provider for Graph client

### Key Components:

1. **AuthManager** (`src/auth.ts`)
   - Manages different authentication modes
   - Initializes appropriate credential types
   - Provides token validation and status

2. **Graph Client** (`src/graph.ts`)
   - Updated to use `TokenCredentialAuthProvider`
   - Works with any `TokenCredential` implementation

3. **Configuration** (`src/utils/graph-config.ts`)
   - Singleton pattern for auth initialization
   - Mode selection based on environment variables
   - Lazy initialization on first use

4. **Constants** (`src/constants.ts`)
   - Default values for interactive authentication
   - Public client ID for scenarios without custom app

## Migration Guide

If you're upgrading from a previous version:

### For Existing Users (Client Credentials):
No changes required! The default mode is still client credentials. Your existing configuration will continue to work.

### To Enable Interactive Mode:
1. Remove all environment variables (AUTH_MODE, CLIENT_ID, CLIENT_SECRET, etc.)
2. Interactive mode is now the default - no configuration needed!
3. (Optional) Add `AUTH_MODE=interactive` for explicit clarity
4. (Optional) Add custom `CLIENT_ID` and `TENANT_ID` if using your own Azure AD app
5. That's it! Users will authenticate on first use with the built-in multi-tenant app

## Examples

### VS Code Configuration Examples

**Interactive (Zero Config - Recommended for Quick Start):**
```json
{
  "mcpServers": {
    "outlook-meetings-scheduler": {
      "command": "node",
      "args": ["./build/index.js"]
    }
  }
}
```

**Interactive with Custom App:**
```json
{
  "mcpServers": {
    "outlook-meetings-scheduler": {
      "command": "node",
      "args": ["./build/index.js"],
      "env": {
        "AUTH_MODE": "interactive",
        "CLIENT_ID": "your-app-client-id",
        "TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```

**Client Credentials (Traditional):**
```json
{
  "mcpServers": {
    "outlook-meetings-scheduler": {
      "command": "node",
      "args": ["./build/index.js"],
      "env": {
        "AUTH_MODE": "client_credentials",
        "CLIENT_ID": "your-app-client-id",
        "CLIENT_SECRET": "your-client-secret",
        "TENANT_ID": "your-tenant-id",
        "USER_EMAIL": "user@company.com"
      }
    }
  }
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review the troubleshooting section
3. Open an issue on GitHub
4. Check Azure AD authentication logs in Azure Portal
