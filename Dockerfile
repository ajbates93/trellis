FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build
RUN npm run build

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Start
CMD ["node", ".output/server/index.mjs"]
