# Base image with Node.js
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript project
RUN npm run build

# Expose port if needed (MCP servers typically communicate via stdin/stdout)
# EXPOSE 3000

# Set non-sensitive environment variables
ENV CLIENT_ID=""
ENV TENANT_ID=""
ENV USER_EMAIL=""
# CLIENT_SECRET should be passed at runtime and not stored in the image

# Set the entrypoint to the built application
CMD ["node", "build/index.js"]
