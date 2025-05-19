# backend.Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN yarn install

# Copy the entire backend source
COPY backend .

# Build TypeScript to dist/
RUN yarn run build

EXPOSE 8080

# Run built server
CMD ["yarn", "start"]
