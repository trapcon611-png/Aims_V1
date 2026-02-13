# 1. Base Image
FROM node:20-alpine

# 2. Set Working Directory
WORKDIR /app

# 3. Copy Dependencies
COPY package*.json ./

# 4. Install Dependencies & System Libraries
# CRITICAL FIX: Install openssl for Prisma Engine on Alpine Linux
RUN apk add --no-cache openssl

# Install npm packages
RUN npm install
RUN npm install three postprocessing @types/three prisma@5.19.1 @prisma/client@5.19.1

# 5. Copy Prisma Schema explicitly
COPY prisma ./prisma/

# 6. Generate Prisma Client INSIDE the container
RUN ./node_modules/.bin/prisma generate

# 7. Copy Source Code
COPY . .

# --- BUILD ARGUMENTS ---
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# -----------------------

# 8. Build the Next.js App
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 9. Expose Port
EXPOSE 3000

# 10. Start Command
CMD ["npm", "start"]