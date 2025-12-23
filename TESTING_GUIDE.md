# Testing Guide: MCP Server with React UI and Nanobot

This guide walks you through testing the Outlook Meetings Scheduler MCP server with the new React UI using nanobot as the MCP client.

## Prerequisites

- Node.js 18+ installed
- Docker installed (for nanobot)
- Azure AD credentials (see main README for setup)

## Step-by-Step Testing Instructions

### Step 1: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your Azure AD credentials:
   ```bash
   AUTHENTICATION_MODE=interactive
   TENANT_ID=your-tenant-id-here
   CLIENT_ID=your-client-id-here
   USER_EMAIL=your-email@example.com
   UI_SERVER_URL=http://localhost:5173
   ```

   > **Note for GitHub Codespaces**: After starting the UI server (step 3), Codespaces will provide a forwarded URL. Update `UI_SERVER_URL` to use that URL (e.g., `https://your-codespace-name-5173.app.github.dev`)

### Step 2: Build the MCP Server

```bash
# Install dependencies
npm install

# Build the MCP server
npm run build
```

Expected output:
```
> outlook-meetings-scheduler@0.2.0 build
> tsc && chmod 755 build/*.js
```

### Step 3: Start the React UI Server

Open a **new terminal window/tab** and run:

```bash
# Navigate to ui-app directory
cd ui-app

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

Expected output:
```
VITE v7.3.0  ready in 175 ms

➜  Local:   http://localhost:5173/
➜  Network: http://10.1.0.89:5173/
```

**Keep this terminal running** - the UI server must stay active for the MCP server to display UIs.

> **For GitHub Codespaces**: When the dev server starts, Codespaces will show a notification about port 5173. Click "Open in Browser" to get the forwarded URL, then update `UI_SERVER_URL` in your `.env` file with this URL.

### Step 4: Start Nanobot MCP Client

Open a **third terminal window/tab** (keeping the UI server running in the second).

#### Option A: Local Machine

```bash
docker run -it --rm --network host \
  -v $(pwd)/nanobot.yaml:/nanobot.yaml \
  --env-file .env \
  ghcr.io/nanobot-ai/nanobot:latest run /nanobot.yaml
```

#### Option B: GitHub Codespaces

```bash
docker run -it --rm --network host \
  -v /workspaces/outlook-meetings-scheduler-mcp-server/nanobot.yaml:/nanobot.yaml \
  --env-file /workspaces/outlook-meetings-scheduler-mcp-server/.env \
  ghcr.io/nanobot-ai/nanobot:latest run /nanobot.yaml
```

### Step 5: Test the Functionality

Once nanobot starts, you can test the MCP server:

#### Test 1: List Available Tools

Ask nanobot:
```
What tools are available?
```

You should see tools like:
- `find-person`
- `create-event`
- `list-events`
- `get-event`
- etc.

#### Test 2: View Upcoming Events UI

Ask nanobot to access the UI resource:
```
Show me the upcoming events UI
```

Or directly reference the resource:
```
Access ui://outlook-meetings/upcoming-events
```

Nanobot should display a UI showing your upcoming calendar events in cards with:
- Event subject
- Date and time
- Location
- Number of attendees

#### Test 3: Search for People

Ask nanobot:
```
Search for people named John
```

Or use the UI resource directly:
```
Access ui://outlook-meetings/people/John
```

Nanobot should display a UI showing people cards with:
- Avatar with initials
- Name and job title
- Email address
- Phone number
- Department
- Office location

#### Test 4: Create a Calendar Event

Ask nanobot:
```
Create a meeting called "Team Sync" for tomorrow at 2 PM
```

The MCP server should create the event and return confirmation with the event details.

## Troubleshooting

### Issue: "Cannot connect to MCP server"

**Solution**: Ensure the MCP server is built:
```bash
npm run build
```

### Issue: "UI not displaying" or "Failed to load UI"

**Solution**: 
1. Check that the React UI server is running (`npm run dev` in ui-app directory)
2. Verify `UI_SERVER_URL` in `.env` matches the URL where the UI server is running
3. For Codespaces, make sure you're using the forwarded port URL

### Issue: "Authentication failed"

**Solution**:
1. Check your `.env` file has correct Azure AD credentials
2. For interactive mode, follow the device code flow when prompted
3. Ensure your Azure AD app has the required permissions (see main README)

### Issue: Docker command not found

**Solution**: Install Docker from [docker.com](https://www.docker.com/get-started)

### Issue: Port 5173 already in use

**Solution**: Stop any other processes using port 5173, or change the port in `ui-app/vite.config.ts` and update `UI_SERVER_URL` in `.env`

## Terminal Setup Summary

You should have **3 terminals running**:

1. **Terminal 1** (Project root): Builds completed, available for git commands
2. **Terminal 2** (ui-app directory): React dev server running (`npm run dev`)
3. **Terminal 3** (Project root): Nanobot client running (interactive)

## Stopping the Services

To stop all services:

1. **Stop Nanobot**: Press `Ctrl+C` in Terminal 3
2. **Stop UI Server**: Press `Ctrl+C` in Terminal 2
3. MCP server stops automatically when nanobot exits

## Quick Reference

### Build Commands
- `npm run build` - Build MCP server
- `npm run build:ui` - Build UI app for production
- `npm run build:all` - Build both MCP server and UI app

### Development Commands
- `npm run dev:ui` - Start UI dev server (shortcut from root)
- `cd ui-app && npm run dev` - Start UI dev server (manual)

### Testing Commands
- Local: `docker run -it --rm --network host -v $(pwd)/nanobot.yaml:/nanobot.yaml --env-file .env ghcr.io/nanobot-ai/nanobot:latest run /nanobot.yaml`
- Codespaces: `docker run -it --rm --network host -v /workspaces/outlook-meetings-scheduler-mcp-server/nanobot.yaml:/nanobot.yaml --env-file /workspaces/outlook-meetings-scheduler-mcp-server/.env ghcr.io/nanobot-ai/nanobot:latest run /nanobot.yaml`
