FROM node:22-slim

# Install system deps for Playwright (optional)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory
RUN mkdir -p /root/.sumat

EXPOSE 18789

VOLUME ["/root/.sumat"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:18789/health || exit 1

CMD ["node", "dist/index.js"]
