# 1. Base Image
FROM node:20-alpine

# 2. Set working directory
WORKDIR /app

# 3. REQUIRED: Install OpenSSL for Prisma (Alpine specific)
RUN apk add --no-cache openssl

# 4. Copy package files
COPY package*.json ./

# 5. Install dependencies
RUN npm install
# CRITICAL FIX: Explicitly install stable Prisma to prevent version conflicts (v7 vs v5)
RUN npm install prisma@5.19.1 @prisma/client@5.19.1

# 6. Copy source code (includes /prisma/schema.prisma)
COPY . .

# 7. Generate Prisma Client
# Use local binary to ensure we use v5.19.1, not npx's latest default
RUN ./node_modules/.bin/prisma generate

# 8. Build the NestJS app
RUN npm run build

# 9. Expose API port
EXPOSE 3001

# 10. Start Production Server
CMD ["node", "dist/main"]