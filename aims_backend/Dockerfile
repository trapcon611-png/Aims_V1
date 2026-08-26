# 1. Base Image: Use 'slim' (Debian) to match Frontend & fix OpenSSL issues
FROM node:20-slim

# 2. Set working directory
WORKDIR /app

# 3. Install System Dependencies (OpenSSL for Prisma + Chromium for WhatsApp)
RUN apt-get update -y && apt-get install -y \
    openssl \
    ca-certificates \
    postgresql-client \
    chromium \
    libnss3 \
    libxss1 \
    libasound2 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the installed Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 4. Copy package files
COPY package*.json ./

# 5. Install dependencies
RUN npm install
# Explicitly install stable Prisma to prevent version conflicts (Preserved)
RUN npm install prisma@5.19.1 @prisma/client@5.19.1
# Install web-push for Notifications (Critical for new features)
RUN npm install web-push @types/web-push
# Explicitly install Razorpay as a safety net
RUN npm install razorpay
# ✨ NEW: Install native WhatsApp dependencies directly in the container
RUN npm install whatsapp-web.js qrcode @types/qrcode

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