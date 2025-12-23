#!/bin/bash

# Development script that runs both the MCP server and nanobot
# Usage: ./scripts/dev-with-nanobot.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cleanup function to kill background processes
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    
    # Kill the MCP server process group if running
    if [ ! -z "$SERVER_PID" ]; then
        echo -e "${BLUE}Stopping MCP server (PID: $SERVER_PID)${NC}"
        # Kill the entire process group
        pkill -P $SERVER_PID 2>/dev/null
        kill $SERVER_PID 2>/dev/null
        # Also kill any tsx processes that might be orphaned
        pkill -f "tsx watch src/index.ts" 2>/dev/null
    fi
    
    echo -e "${GREEN}Cleanup complete${NC}"
    exit 0
}

# Set up trap for cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

# Check for required files
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found at $PROJECT_DIR/.env${NC}"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/nanobot.yaml" ]; then
    echo -e "${RED}Error: nanobot.yaml not found at $PROJECT_DIR/nanobot.yaml${NC}"
    exit 1
fi

echo -e "${GREEN}=== Starting Development Environment ===${NC}"
echo -e "${BLUE}Project directory: $PROJECT_DIR${NC}"
echo ""

# Start the MCP server in background with its own process group
echo -e "${YELLOW}Starting MCP server...${NC}"
cd "$PROJECT_DIR"

# Use setsid to run tsx watch in its own session so it doesn't receive signals from the terminal
setsid bash -c "HTTP_PORT=3000 npx tsx watch src/index.ts" &
SERVER_PID=$!

# Wait for server to be ready
echo -e "${BLUE}Waiting for MCP server to be ready...${NC}"
sleep 3

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}Error: MCP server failed to start${NC}"
    exit 1
fi

# Check if server is responding
for i in {1..10}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}MCP server is ready!${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}Error: MCP server not responding after 10 attempts${NC}"
        exit 1
    fi
    sleep 1
done

echo ""

# Start nanobot in foreground (interactive)
echo -e "${YELLOW}Starting nanobot...${NC}"
echo -e "${GREEN}=== Development environment is running ===${NC}"
echo -e "${BLUE}MCP Server: http://localhost:3000${NC}"
echo -e "${BLUE}Press Ctrl+C to stop both services${NC}"
echo ""

docker run -it --rm --network host \
    -v "$PROJECT_DIR/nanobot.yaml:/nanobot.yaml" \
    --env-file "$PROJECT_DIR/.env" \
    ghcr.io/nanobot-ai/nanobot:latest run /nanobot.yaml

# When nanobot exits, cleanup will be triggered
