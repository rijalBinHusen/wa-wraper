# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install ALL dependencies including types for the build
RUN npm install
COPY . .
RUN npx tsc

# Production Stage
FROM node:20-alpine
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy only production files
COPY --from=builder /app/package*.json ./
# Re-install ONLY production dependencies
RUN npm install --omit=dev

# Copy the compiled JS from the dist folder
COPY --from=builder /app/dist ./dist
# Explicitly copy the swagger file into the dist folder so main.js finds it
COPY --from=builder /app/src/swagger.yaml ./dist/swagger.yaml

EXPOSE 3000
CMD ["node", "dist/main.js"]