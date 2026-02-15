# 1. Base Image: Use 'slim' (Debian) to match Frontend & fix OpenSSL issues
FROM node:20-slim

# 2. Set working directory
WORKDIR /app

# 3. Install System Dependencies (OpenSSL is required for Prisma)
RUN apt-get update -y && apt-get install -y openssl ca-certificates

# 4. Copy package files
COPY package*.json ./

# 5. Install dependencies
RUN npm install
# Explicitly install stable Prisma to prevent version conflicts
RUN npm install prisma@5.19.1 @prisma/client@5.19.1

# 6. Copy source code
COPY . .

# 7. Generate Prisma Client
# Use local binary to ensure we use v5.19.1
RUN ./node_modules/.bin/prisma generate

# 8. Build the NestJS app
RUN npm run build

# 9. Expose API port
EXPOSE 3001

# 10. Start Production Server
CMD ["node", "dist/main"]