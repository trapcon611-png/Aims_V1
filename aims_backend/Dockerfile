# Use Node.js 20 LTS (Alpine)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# REQUIRED: Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the NestJS app (Compiles TS to JS in /dist)
RUN npm run build

# Expose API port
EXPOSE 3001

# Start Production Server directly from dist
CMD ["node", "dist/main"]