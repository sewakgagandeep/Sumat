# Sumat Deployment Guide

This guide covers how to deploy Sumat in a production environment.

## 1. HTTPS / TLS

The Gateway Server runs on HTTP/WS by default. For production, you should put it behind a reverse proxy that handles TLS termination.

### Option A: Caddy (Recommended)

Caddy automatically handles SSL certificates (Let's Encrypt).

`Caddyfile`:
```caddy
sumat.example.com {
    reverse_proxy localhost:3000
}
```

### Option B: Nginx

`nginx.conf` snippet:
```nginx
server {
    listen 80;
    server_name sumat.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name sumat.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 2. Systemd Service

Run Sumat as a systemd service on Linux.

`/etc/systemd/system/sumat.service`:

```ini
[Unit]
Description=Sumat AI Agent
After=network.target

[Service]
# Security hardening
User=sumat
Group=sumat
DynamicUser=yes
CapabilityBoundingSet=
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/sumat /var/lib/sumat

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/sumat/.env

# Execution
WorkingDirectory=/opt/sumat
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Setup:**
1.  Create user: `useradd -r -s /bin/false sumat`
2.  Copy code to `/opt/sumat`
3.  Install dependencies & build: `npm i && npm run build`
4.  enable service: `systemctl enable --now sumat`

## 3. Docker (Production)

`docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  sumat:
    build: .
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file: .env
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - ./data:/app/data
      - ./config.json:/app/config.json
      - ./RULES.md:/app/RULES.md
      - ./skills:/app/skills
    stop_signal: SIGTERM
```

**Run:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```
