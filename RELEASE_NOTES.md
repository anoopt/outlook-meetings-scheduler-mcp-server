# Release Notes

## v0.2.0 (Upcoming) - Interactive Authentication Support
Thank you [Lokka](https://lokka.dev/)

### 🎉 Major Features

#### Interactive Authentication Mode (Zero Configuration)
- **Default authentication mode** is now `interactive` for new users
- **Built-in multi-tenant Azure AD app** - no setup required
- **Browser-based authentication** with automatic fallback to device code
- **Works for users from any organization** - no tenant restrictions

#### Smart Authentication Mode Detection
- **Automatic mode detection** based on environment variables
- **100% backward compatible** - existing `client_credentials` setups work unchanged
- **CLIENT_SECRET presence** → automatically uses `client_credentials` mode
- **ACCESS_TOKEN presence** → automatically uses `client_provided_token` mode
- **No variables** → defaults to `interactive` mode

#### Enhanced Token Management
- **Persistent token caching** with OS-level encryption
  - Windows: Windows Data Protection API (DPAPI)
  - macOS: Keychain
  - Linux: libsecret (with unencrypted fallback)
- **Automatic token refresh** when expired
- **No re-authentication** needed between sessions

#### User Experience Improvements
- **USER_EMAIL auto-detection** from signed-in user profile
- **Device code visible in MCP client chat** for easy access
- **Clear authentication flow** with helpful error messages
- **Zero configuration** examples for quick start

### 🔧 Technical Improvements

#### Authentication Architecture
- **Migrated from @azure/msal-node to @azure/identity** for better multi-flow support
- **Added @azure/identity-cache-persistence** for secure token storage
- **AuthManager class** supporting multiple authentication modes
- **TokenCredentialAuthProvider** for Graph API integration

#### Dependencies
- **Added**: @azure/identity v4.12.0
- **Added**: @azure/identity-cache-persistence v1.2.0
- **Added**: jsonwebtoken v9.0.2
- **Removed**: @azure/msal-node

#### API & Permissions
- **Delegated permissions** for interactive mode: Calendars.ReadWrite, People.Read, User.Read
- **Application permissions** for client credentials: Calendars.ReadWrite, People.Read.All, User.ReadBasic.All
- **Explicit scope handling** for better permission management

### 📚 Documentation

#### New Documentation
- **AUTHENTICATION_MODES.md** - Comprehensive guide to all authentication modes
- **TROUBLESHOOTING_INTERACTIVE_AUTH.md** - Interactive authentication troubleshooting
- **Updated README.md** with all authentication modes and examples

#### Configuration Examples
- **Zero configuration** interactive mode examples
- **All authentication modes** documented with VS Code and Claude Desktop
- **Environment variable tables** organized by authentication mode
- **Token acquisition methods** for client provided token mode

### 🛠️ Breaking Changes

#### None for Existing Users
- **Existing configurations work unchanged** due to smart mode detection
- **CLIENT_SECRET presence** automatically enables client_credentials mode
- **No migration required** for current deployments

#### New Default Behavior
- **New installations default to interactive mode** (when no CLIENT_SECRET present)
- **AUTH_MODE environment variable** is now optional (auto-detected)

### 🔒 Security Enhancements

#### Token Security
- **OS-level token encryption** where supported
- **Secure cache storage** with platform-specific implementations
- **Token scope validation** for better security

#### Authentication Security
- **Public client flows** properly configured for interactive mode
- **Redirect URI validation** using localhost without specific ports
- **Multi-tenant app** with proper permission scoping

### 🐛 Bug Fixes

#### Authentication Issues
- **Fixed device code visibility** - now appears in MCP client chat
- **Resolved public client errors** with proper Azure AD app configuration
- **Fixed token caching issues** on Linux systems without libsecret

#### Error Handling
- **Improved error messages** with actionable guidance
- **Better authentication failure detection** and recovery
- **Clear logging** for authentication mode selection

### 📦 Migration Guide

#### From v0.1.x to v0.2.0

**No action required** for existing users:
```json
{
  "env": {
    "CLIENT_ID": "your-id",
    "CLIENT_SECRET": "your-secret", 
    "TENANT_ID": "your-tenant",
    "USER_EMAIL": "user@example.com"
  }
}
```
This will automatically use `client_credentials` mode.

**For new interactive setup**:
```json
{
  "env": {
    "AUTH_MODE": "interactive"
  }
}
```
Or simply omit all environment variables for zero-config setup.

### 🙏 Acknowledgments

Special thanks to the community for feedback on authentication flows and the need for simpler setup experiences.

---

## v0.1.2 (Previous) - Foundation Release

### Features
- Client credentials authentication mode
- Calendar event CRUD operations
- People search functionality
- Microsoft Graph API integration
- Docker support
- VS Code and Claude Desktop compatibility

### Dependencies
- @azure/msal-node for authentication
- @microsoft/microsoft-graph-client for API calls
- @modelcontextprotocol/sdk for MCP integration

---

## v0.1.1 and Earlier

See Git history for detailed changes in earlier versions.