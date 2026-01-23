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

# --- CRITICAL FIX: Capture Build Arguments ---
# This reads the arg passed from docker-compose.yml
ARG NEXT_PUBLIC_API_URL
# This sets it as an environment variable so 'npm run build' can use it
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# ---------------------------------------------

# Build Next.js app
RUN npm run build

# Expose Frontend port
EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]