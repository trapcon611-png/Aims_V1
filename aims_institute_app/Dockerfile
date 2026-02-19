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

# 6. Install Landing Page Visual Dependencies & Specific Prisma Version
# Preserving this as requested for the Neural/3D components
RUN npm install three postprocessing @types/three prisma@5.19.1 @prisma/client@5.19.1

# 7. Copy Prisma Schema
COPY prisma ./prisma/

# 8. Generate Prisma Client INSIDE the container
# This ensures the 'linux-glibc-openssl-3.0.x' engine is generated for this container
RUN npx prisma generate

# 9. Copy Source Code
COPY . .

# --- BUILD ARGUMENTS ---
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# -----------------------

# 10. Build the Next.js App
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 11. Expose Port
EXPOSE 3000

# 12. Start Command
CMD ["npm", "start"]