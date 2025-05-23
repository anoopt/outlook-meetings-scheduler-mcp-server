# Outlook Meetings Scheduler MCP Server

MCP Server for scheduling meetings in Microsoft Outlook using Microsoft Graph API.

This MCP server allows you to create calendar events, create events with attendees (including finding their email addresses).
It integrates seamlessly with other MCP servers, such as the GitHub MCP server, to enhance your workflow.

<a href="https://glama.ai/mcp/servers/@anoopt/outlook-meetings-scheduler-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@anoopt/outlook-meetings-scheduler-mcp-server/badge" alt="Outlook Meetings Scheduler Server MCP server" />
</a>

## Sample queries

- Schedule a meeting with Sarah for tomorrow at 3 PM.
- Create a meeting called "Project Kickoff" for tomorrow at 2 PM. Add Megan and John as required attendees.

### Usage with GitHub MCP Server
- Create an issue in the organization/repo repository titled "Fix pagination bug in user dashboard" with the description "Users report seeing duplicate entries when navigating between pages." Then schedule a calendar reminder for me to review this issue tomorrow at 3 PM.

## Demo
![Demo](./assets/demo.gif)

## Tools

1. `find-person`
   - Find a person's email address by their name
   - Input: `name` (string)
   - Returns: List of matching people with names and email addresses

2. `create-event`
   - Create a calendar event using Microsoft Graph API
   - Inputs:
     - `subject` (string): Subject of the calendar event
     - `body` (string): Content/body of the calendar event
     - `start` (optional): ISO format datetime (e.g., 2025-04-20T12:00:00)
     - `end` (optional): ISO format datetime (e.g., 2025-04-20T13:00:00)
     - `timeZone` (optional): Time zone for the event (default: "GMT Standard Time")
   - Returns: Event details including URL and ID

3. `create-event-with-attendees`
   - Create a calendar event with attendees using Microsoft Graph API
   - Inputs:
     - `subject` (string): Subject of the calendar event
     - `body` (string): Content/body of the calendar event
     - `start` (optional): ISO format datetime (e.g., 2025-04-20T12:00:00)
     - `end` (optional): ISO format datetime (e.g., 2025-04-20T13:00:00)
     - `timeZone` (optional): Time zone for the event (default: "GMT Standard Time")
     - `location` (optional): Location of the event
     - `attendees`: Array of { email, name (optional), type (optional) }
   - Returns: Event details including URL, ID, and attendees list

4. `get-event`
   - Get details of a calendar event by its ID
   - Input:
     - `eventId` (string): ID of the event to retrieve
   - Returns: Detailed event information including subject, time, attendees, and URL

5. `list-events`
   - List calendar events with optional filtering
   - Inputs:
     - `subject` (optional): Filter events by subject containing this text
     - `startDate` (optional): Start date in ISO format (e.g., 2025-04-20T00:00:00) to filter events from
     - `endDate` (optional): End date in ISO format (e.g., 2025-04-20T23:59:59) to filter events until
     - `maxResults` (optional): Maximum number of events to return
   - Returns: List of calendar events with basic information and IDs

6. `delete-event`
   - Delete a calendar event
   - Input:
     - `eventId` (string): ID of the event to delete
   - Returns: Confirmation of event deletion

7. `update-event`
   - Update an existing calendar event
   - Inputs:
     - `eventId` (string): ID of the event to update
     - `subject` (optional): New subject for the calendar event
     - `body` (optional): New content/body for the calendar event
     - `start` (optional): New start time in ISO format (e.g., 2025-04-20T12:00:00)
     - `end` (optional): New end time in ISO format (e.g., 2025-04-20T13:00:00)
     - `timeZone` (optional): New time zone for the event
     - `location` (optional): New location for the event
     - `attendees` (optional): Array of { email, name (optional), type (optional) }
   - Returns: Updated event details showing changes

8. `update-event-attendees`
   - Add or remove attendees from a calendar event
   - Inputs:
     - `eventId` (string): ID of the event to update
     - `addAttendees` (optional): Array of attendees to add: { email, name (optional), type (optional) }
     - `removeAttendees` (optional): Array of email addresses to remove from the event
   - Returns: Updated event attendee information

## Setup

### Microsoft Graph API Setup
1. Register an application in the [Microsoft Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Create a client secret
3. Grant necessary permissions (Microsoft Graph API > Application permissions > Calendars.ReadWrite, People.Read.All, User.ReadBasic.All)
4. Note your Client ID, Client Secret, and Tenant ID

### Usage with VS Code

#### Local Node.js

You can run the MCP server directly with Node.js from your local build:

1. Clone the repository and build the project:
```bash
git clone https://github.com/anoopt/outlook-meetings-scheduler-mcp-server.git
cd outlook-meetings-scheduler-mcp-server
npm install
npm run build
```

2. For manual installation, add the following JSON block to your User Settings (JSON) file in VS Code. You can do this by pressing `Ctrl + Shift + P` and typing Preferences: `Open User Settings (JSON)`.

Optionally, you can add it to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others:

```json
{
  "mcpServers": {
    "outlook-meetings-scheduler": {
      "command": "node",
      "args": [
        "/path/to/outlook-meetings-scheduler-mcp-server/build/index.js"
      ],
      "env": {
        "CLIENT_ID": "<YOUR_CLIENT_ID>",
        "CLIENT_SECRET": "<YOUR_CLIENT_SECRET>",
        "TENANT_ID": "<YOUR_TENANT_ID>",
        "USER_EMAIL": "<YOUR_EMAIL>"
      }
    }
  }
}
```

Replace `/path/to/outlook-meetings-scheduler-mcp-server` with the absolute path to your cloned repository.

#### Docker

Run the MCP server using Docker locally. Build the Docker image with the following command: 

``` bash
docker build -t mcp/outlook-meetings-scheduler .
```

For manual installation, add the following JSON block to your User Settings (JSON) file in VS Code. You can do this by pressing `Ctrl + Shift + P` and typing Preferences: `Open User Settings (JSON)`.

Optionally, you can add it to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others.

```json
{
     "inputs": [
      {
        "type": "promptString",
        "id": "client_secret",
        "description": "Enter the client secret",
        "password": true
      }
    ],
    "servers": {
        "outlook-meetings-scheduler": {
            "command": "docker",
            "args": [
                "run",
                "-i",
                "--rm",
                "-e",
                "CLIENT_ID",
                "-e",
                "CLIENT_SECRET",
                "-e",
                "TENANT_ID",
                "-e",
                "USER_EMAIL",
                "mcp/outlook-meetings-scheduler"
            ],
            "env": {
                "USER_EMAIL": "<YOUR_EMAIL>",
                "CLIENT_ID": "<YOUR_CLIENT_ID>",
                "CLIENT_SECRET": "${input:client_secret}",
                "TENANT_ID": "<YOUR_TENANT_ID>"
            }
        }
    }
}
```

#### NPX

```json
{
  "mcpServers": {
    "outlook-meetings-scheduler": {
      "command": "npx",
      "args": [
        "-y",
        "outlook-meetings-scheduler"
      ],
      "env": {
        "CLIENT_ID": "<YOUR_CLIENT_ID>",
        "CLIENT_SECRET": "<YOUR_CLIENT_SECRET>",
        "TENANT_ID": "<YOUR_TENANT_ID>",
        "USER_EMAIL": "<YOUR_EMAIL>"
      }
    }
  }
}
```

### Usage with Claude Desktop

#### Docker

1. Run the MCP server using Docker locally. Build the Docker image with the following command: 

``` bash
docker build -t mcp/outlook-meetings-scheduler .
```

2. Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "outlook-meetings-scheduler": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "CLIENT_ID",
        "-e",
        "CLIENT_SECRET",
        "-e",
        "TENANT_ID",
        "-e",
        "USER_EMAIL",
        "mcp/outlook-meetings-scheduler"
      ],
      "env": {
        "CLIENT_ID": "<YOUR_CLIENT_ID>",
        "CLIENT_SECRET": "<YOUR_CLIENT_SECRET>",
        "TENANT_ID": "<YOUR_TENANT_ID>",
        "USER_EMAIL": "<YOUR_EMAIL>"
      }
    }
  }
}
```

#### NPX

```json
{
  "mcpServers": {
    "outlook-meetings-scheduler": {
      "command": "npx",
      "args": [
        "-y",
        "outlook-meetings-scheduler"
      ],
      "env": {
        "CLIENT_ID": "<YOUR_CLIENT_ID>",
        "CLIENT_SECRET": "<YOUR_CLIENT_SECRET>",
        "TENANT_ID": "<YOUR_TENANT_ID>",
        "USER_EMAIL": "<YOUR_EMAIL>"
      }
    }
  }
}
```

## Example Scenarios

### Integration with GitHub MCP Server

You can combine this MCP server with other MCP servers like the GitHub MCP server for powerful workflows.

#### Create an Issue and Schedule a Follow-up Review
```
Create an issue in the organization/repo repository titled "Fix pagination bug in user dashboard" with the description "Users report seeing duplicate entries when navigating between pages." Then schedule a calendar reminder for me to review this issue tomorrow at 3 PM.
```

This will:
1. Use the GitHub MCP server to create the issue
2. Use the Outlook Meetings Scheduler MCP server to create a calendar event for the review

#### Schedule a Code Review Meeting Based on a Pull Request
```
Find the open PR about the authentication feature in the organization/app-backend repository and schedule a code review meeting with the contributors for tomorrow morning.
```

This will:
1. Use GitHub MCP server to find the pull request and identify contributors
2. Use the Outlook Meetings Scheduler MCP server to schedule a meeting with those team members

## Configuration for Multi-MCP Setup

To use both GitHub and Outlook MCP servers together :

```json
{
  "mcpServers": {
    "outlook-meetings-scheduler": {
      "command": "npx",
      "args": [
        "-y",
        "outlook-meetings-scheduler"
      ],
      "env": {
        "CLIENT_ID": "<YOUR_CLIENT_ID>",
        "CLIENT_SECRET": "<YOUR_CLIENT_SECRET>",
        "TENANT_ID": "<YOUR_TENANT_ID>",
        "USER_EMAIL": "<YOUR_EMAIL>"
      }
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/github-mcp"
      ],
      "env": {
        "GITHUB_TOKEN": "<YOUR_GITHUB_TOKEN>"
      }
    }
  }
}
```

### Direct Usage

#### Finding a Colleague's Email
```
I need to schedule a meeting with John Smith. Can you find his email address?
```

#### Creating a Simple Calendar Event
```
Schedule a meeting titled "Weekly Team Sync" for next Monday at 10 AM with the following agenda:
- Project updates
- Resource allocation
- Questions and concerns
```

#### Scheduling a Meeting with Single Attendee
```
Schedule a 1:1 meeting with Sarah for tomorrow at 3 PM.
```
This will find Sarah's email address and create a calendar event.
To find Sarah's email address, the MCP server will use the `find-person` tool - which uses the Microsoft Graph API to find relevant people for `USER_EMAIL` or searches for the name in the organization.

#### Scheduling a Meeting with Multiple Attendees
```
Create a meeting called "Project Kickoff" for tomorrow at 2 PM. 
Add sarah.jones@example.com and mike.thompson@example.com as required attendees.
The agenda is:
1. Project overview
2. Timeline discussion
3. Role assignments
4. Next steps
```

## Build

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Docker build
docker build -t mcp/outlook-meetings-scheduler .
```

## License

This MCP server is licensed under the ISC License. For more details, please see the LICENSE file in the project repository.

## Disclaimer

This MCP server is not affiliated with Microsoft or Microsoft Graph API. Use at your own risk. Ensure you comply with your organization's policies and guidelines when using this tool.