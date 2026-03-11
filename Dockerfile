# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx tsc

# Production Stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src/swagger.yaml ./dist/swagger.yaml
RUN npm install --production
COPY .env .env

EXPOSE 3000
CMD ["node", "dist/main.js"]