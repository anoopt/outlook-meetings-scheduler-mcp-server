# Outlook Meetings Scheduler - UI App

This is a React web application built with Fluent UI 2 that provides UI components for the Outlook Meetings Scheduler MCP server.

## Features

- **Upcoming Events View**: Display upcoming calendar events in a modern, card-based interface
- **People Card View**: Show people information with contact details
- Built with [Fluent UI 2](https://fluent2.microsoft.design/) for modern, accessible UI components
- TypeScript for type safety
- Vite for fast development and optimized builds

## Development

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Routes

- `/events?events=<encoded-json>` - Display upcoming events
- `/people?people=<encoded-json>` - Display people cards

## Usage with MCP Server

The MCP server will generate URLs that include the data as query parameters. The React app parses this data and displays it using Fluent UI 2 components.

