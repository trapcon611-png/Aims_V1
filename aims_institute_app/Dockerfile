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

# Build Next.js app
RUN npm run build

# Expose Frontend port
EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]