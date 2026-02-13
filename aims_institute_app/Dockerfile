# 1. Base Image: Use 'slim' (Debian) instead of 'alpine'
# This fixes the "libssl.so.1.1" missing error by using standard glibc libraries
FROM node:20-slim

# 2. Set Working Directory
WORKDIR /app

# 3. Install System Dependencies (OpenSSL is required for Prisma)
RUN apt-get update -y && apt-get install -y openssl ca-certificates

# 4. Copy Dependencies
COPY package*.json ./

# 5. Install Dependencies
RUN npm install
# Explicitly install stable Prisma version
RUN npm install three postprocessing @types/three prisma@5.19.1 @prisma/client@5.19.1

# 6. Copy Prisma Schema
COPY prisma ./prisma/

# 7. Generate Prisma Client INSIDE the container
# This will now generate the 'linux-glibc' engine which is more stable than 'musl'
RUN ./node_modules/.bin/prisma generate

# 8. Copy Source Code
COPY . .

# --- BUILD ARGUMENTS ---
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# -----------------------

# 9. Build the Next.js App
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 10. Expose Port
EXPOSE 3000

# 11. Start Command
CMD ["npm", "start"]