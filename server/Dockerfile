FROM node:22-alpine

WORKDIR /usr/src/app

# Copy server dependencies first
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server/ .

# Copy shared directory to /usr/src/shared (resolves "../../shared/constants")
COPY shared /usr/src/shared

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "index.js"]
