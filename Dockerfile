FROM node:20-alpine
WORKDIR /app

# 1. Copy package files to install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# 2. Copy the already compiled JS from your local 'dist' folder
COPY dist ./dist
COPY node_modules ./node_modules

# 3. Copy the Swagger YAML (needed for the API docs)
COPY src/swagger.yaml ./dist/swagger.yaml

# 4. Copy .env if you want it baked in (optional, can be passed via Compose)
COPY .env .env

EXPOSE 7000
CMD ["node", "dist/main.js"]