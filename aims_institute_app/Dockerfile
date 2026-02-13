# 1. Base Image
FROM node:20-alpine

# 2. Set Working Directory
WORKDIR /app

# 3. Copy Dependencies
COPY package*.json ./

# 4. Install Dependencies
# We explicitly install the animation libraries here to ensure they exist
RUN npm install
# CRITICAL FIX: Install Prisma 5.19.1 explicitly to prevent v7 breaking changes
RUN npm install three postprocessing @types/three prisma@5.19.1 @prisma/client@5.19.1

# 5. Copy Prisma Schema explicitly
# This is CRITICAL for the next step
COPY prisma ./prisma/

# 6. Generate Prisma Client INSIDE the container
# This fixes "Module not found: Can't resolve '@prisma/client'"
RUN npx prisma generate

# 7. Copy Source Code
COPY . .

# --- BUILD ARGUMENTS ---
# Capture the API URL from docker-compose
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# -----------------------

# 8. Build the Next.js App
# Disable linting during build to prevent minor style errors from stopping deployment
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 9. Expose Port
EXPOSE 3000

# 10. Start Command
CMD ["npm", "start"]