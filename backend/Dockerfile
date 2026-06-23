# Use official Node.js light image
FROM node:20-slim

# Create and define the working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Expose the API port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the application
CMD [ "npm", "start" ]
```
