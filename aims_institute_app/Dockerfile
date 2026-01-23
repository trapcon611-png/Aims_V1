# Use Node.js 20 LTS (Required for newer Next.js versions)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# --- CRITICAL CONFIGURATION ---
# 1. Accept the argument passed from docker-compose.yml
ARG NEXT_PUBLIC_API_URL

# 2. Set it as an environment variable so Next.js can see it during 'npm run build'
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# ------------------------------

# Build Next.js app (This "bakes" the API URL into the HTML/JS)
RUN npm run build

# Expose Frontend port
EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]