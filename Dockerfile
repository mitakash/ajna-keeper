# Use Node.js v22 as base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies using yarn without frozen lockfile
RUN yarn install

# Copy the rest of the application
COPY . .

# Make scripts executable
RUN chmod +x /app/docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production

# Default command to run the keeper
# Note: Config file should be mounted as a volume
ENTRYPOINT ["/app/docker-entrypoint.sh"]
