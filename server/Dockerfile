FROM node:22-alpine

# Use the pre-existing node user for better security
RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app
RUN mkdir -p /usr/src/shared && chown -R node:node /usr/src/shared

WORKDIR /usr/src/app

# Copy server dependencies first
COPY --chown=node:node server/package*.json ./
RUN npm ci --only=production

# Copy server code
COPY --chown=node:node server/ .

# Copy shared directory
COPY --chown=node:node shared /usr/src/shared

EXPOSE 3000

ENV NODE_ENV=production

# Switch to the non-root node user
USER node

CMD ["node", "index.js"]
