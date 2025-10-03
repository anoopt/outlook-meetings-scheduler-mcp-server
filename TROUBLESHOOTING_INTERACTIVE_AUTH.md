# Troubleshooting Interactive Authentication

## ✅ Good News: Zero Configuration Required!

Interactive mode now works **out of the box** with zero configuration. Just use:

```json
{
  "env": {
    "AUTH_MODE": "interactive"
  }
}
```

The server uses a built-in multi-tenant Azure AD app that works for users from any organization.

## When You Might Need Custom Configuration

### ✅ Use Built-in App (Recommended)
- Zero setup required
- Works for any organization  
- User sees: "Outlook Meetings Scheduler MCP Server would like to access your calendar"

### ⚠️ Use Custom App Only If You Need:
- Custom branding (your organization name in consent screen)
- Single-tenant restrictions
- Additional permissions beyond calendar and contacts

## Legacy Error: "client_assertion or client_secret required"

**This error should no longer occur** with the default built-in app. If you see this:

### If Using Default Configuration:
This shouldn't happen. Please file a bug report.

### If Using Custom App:
Your Azure AD app needs "Allow public client flows" enabled:

1. Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App registrations
2. Select your application  
3. Click **Authentication** > **Advanced settings**
4. Set **Allow public client flows** to **YES**
5. Click **Save**

## Token Caching (Working Automatically)

✅ **Token caching is enabled by default** - no configuration needed!

### How It Works:
- First authentication: Browser opens or device code shown
- Token stored securely on your system
- Subsequent requests: No re-authentication needed
- Automatic token refresh when expired

### Storage Locations:
- **Windows**: Encrypted using Windows Data Protection API (DPAPI)
- **macOS**: Encrypted using Keychain  
- **Linux**: `~/.IdentityService/outlook-mcp-cache` (encrypted if `libsecret` available, otherwise unencrypted)

### Clear Cache If Needed:
```bash
# Windows
# Delete folder: %LOCALAPPDATA%\.IdentityService\outlook-mcp-cache

# macOS  
# Open Keychain Access, search for "outlook-mcp-cache", delete items

# Linux
rm -rf ~/.IdentityService/outlook-mcp-cache
```

## Built-in Multi-Tenant App Details

The default configuration uses app ID: `ca696137-503f-4489-bdf4-7cb76e272639`

- **App Name**: "Outlook Meetings Scheduler MCP Server"
- **Registered in**: anoopccdev1.onmicrosoft.com
- **Supports**: Any organizational directory (multi-tenant)
- **Permissions**: Calendars.ReadWrite, People.Read, User.Read (delegated)
- **Redirect URI**: `http://localhost`

### User Experience:
Users from any organization will see a consent screen:
"*Outlook Meetings Scheduler MCP Server* would like to access your calendar and contacts"

## Authentication Flow

### Browser Flow (Preferred):
1. User triggers MCP command
2. Browser opens to Microsoft login
3. User signs in with their credentials  
4. User consents to permissions (first time only)
5. Browser redirects back
6. Token cached locally
7. Command executes

### Device Code Flow (Fallback):
1. Browser authentication fails
2. Device code displayed in MCP client chat:
   ```
   🔐 Authentication Required
   Please visit: https://microsoft.com/devicelogin
   Enter code: ABC-DEF-123
   ```
3. User completes authentication in browser
4. Token cached locally
5. Command executes

## Common Issues and Solutions

### Issue: Consent Screen Shows Different App Name

**Expected**: "Outlook Meetings Scheduler MCP Server"  
**If you see**: "Microsoft Azure CLI" or other name

**Cause**: You're using Azure CLI token or wrong app  
**Solution**: Use the default interactive mode without specifying CLIENT_ID

### Issue: Authentication Fails with Browser

**Symptoms**: Browser opens but shows error page

**Solutions**:
1. **Clear browser cache** - old auth cookies can interfere
2. **Try incognito/private mode**
3. **Check port availability** - ensure `http://localhost` isn't blocked
4. **Wait for device code fallback** - server will automatically switch

### Issue: "User email could not be determined"

**Cause**: Authentication succeeded but user profile couldn't be read  
**Solution**: Ensure the built-in app has `User.Read` permission (it should by default)

### Issue: Organization Blocks External Apps

**Symptoms**: "Admin consent required" or "Access denied"

**Solutions**:
1. Ask IT admin to allow the app: `ca696137-503f-4489-bdf4-7cb76e272639`
2. Or register your own app in your organization's tenant
3. Use client credentials mode if available

### Issue: Still Getting Public Client Errors

**If using default config** and still seeing "client_assertion" errors:
1. Clear token cache (see above)
2. Restart MCP server/client
3. File a bug report with error details

**If using custom app**:
- Enable "Allow public client flows" in Azure AD
- Use `http://localhost` as redirect URI (no port)
- Ensure delegated permissions are configured

## Custom Azure AD App Setup (Optional)

### When to Use Custom App:
- Need custom branding
- Single-tenant restrictions  
- Organization blocks external apps
- Additional permissions required

### Configuration:
1. **Name**: Your preferred app name
2. **Supported accounts**: Multi-tenant or single-tenant as needed
3. **Redirect URI**: `http://localhost` (Mobile and desktop applications)
4. **Allow public client flows**: **YES** ✅
5. **Delegated permissions**: Calendars.ReadWrite, People.Read, User.Read

### Environment Variables:
```json
{
  "env": {
    "AUTH_MODE": "interactive",
    "CLIENT_ID": "your-custom-app-id",
    "TENANT_ID": "your-tenant-id-or-common"
  }
}
```

## Testing Your Setup

### ✅ Quick Test:
1. Use minimal config:
   ```json
   {"env": {"AUTH_MODE": "interactive"}}
   ```
2. Trigger any MCP tool
3. Should see browser open or device code
4. Sign in with your account
5. Accept permissions
6. Tool should execute successfully

### ✅ Verify Token Caching:
1. Restart MCP server
2. Trigger another tool
3. Should execute immediately (no re-authentication)

### ❌ If Still Having Issues:
1. Check server logs for "Token cache persistence enabled"
2. Verify user email detection in logs
3. Clear cache and try fresh authentication
4. Try different browser or incognito mode

## Migration from Old Setup

### If You Had Custom App Configuration:
**Before** (required custom app):
```json
{
  "env": {
    "AUTH_MODE": "interactive", 
    "CLIENT_ID": "your-app-id",
    "TENANT_ID": "your-tenant-id"
  }
}
```

**After** (optional - use built-in):
```json
{
  "env": {
    "AUTH_MODE": "interactive"
  }
}
```

### Benefits of Using Built-in App:
- ✅ Zero setup required
- ✅ Works for any organization
- ✅ No Azure AD configuration needed
- ✅ Maintained and updated automatically

## Still Need Help?

1. **Clear token cache** and try fresh authentication
2. **Check logs** for specific error messages  
3. **Try incognito mode** to rule out browser issues
4. **File a GitHub issue** with:
   - Full error message
   - Your configuration (no secrets)
   - Steps to reproduce
   - MCP client being used (VS Code, Claude, etc.)
