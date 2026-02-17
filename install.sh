#!/usr/bin/env bash
# Sumat — System Install Script
# Usage: curl -sSL https://raw.githubusercontent.com/sewakgagandeep/Sumat/main/install.sh | bash

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Sumat AI Agent Installer${NC}"
echo "================================="

# 1. Check Prerequisites
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed.${NC}"
    echo "Install with: sudo apt install git"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed.${NC}"
    echo "Install with: sudo apt install curl"
    exit 1
fi

# Check Node.js (Version 20+)
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo -e "${YELLOW}Node.js version $NODE_VERSION is too old. Upgrading to 22...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo -e "${GREEN}✓ Node.js $(node -v) is ready.${NC}"
    fi
fi

# 2. Clone/Update Repository
echo -e "\n${YELLOW}Step 2: Downloading Sumat...${NC}"
INSTALL_DIR="$HOME/sumat"

if [ -d "$INSTALL_DIR/.git" ]; then
    echo "Updating existing installation in $INSTALL_DIR..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "Cloning to $INSTALL_DIR..."
    git clone https://github.com/sewakgagandeep/Sumat.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 3. Setup Dependencies & Build
echo -e "\n${YELLOW}Step 3: Building project...${NC}"
if [ ! -f ".env" ]; then
    echo "Creating .env from example..."
    cp .env.example .env
fi

echo "Installing npm dependencies..."
npm ci --silent

echo "Compiling TypeScript..."
npm run build

# 4. Global Command Setup
echo -e "\n${YELLOW}Step 4: Scheduling global command...${NC}"
# Create a wrapper script to handle node execution context
sudo tee /usr/local/bin/sumat > /dev/null << EOF
#!/bin/bash
cd "$INSTALL_DIR"
GLOBAL_ execution=1 node dist/cli/index.js "\$@"
EOF
sudo chmod +x /usr/local/bin/sumat
echo -e "${GREEN}✓ 'sumat' command installed.${NC}"

# 5. Systemd Service (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]] && command -v systemctl &> /dev/null; then
    echo -e "\n${YELLOW}Step 5: Setting up background service...${NC}"
    
    SERVICE_FILE="/etc/systemd/system/sumat.service"
    CURRENT_USER=$(whoami)
    NODE_PATH=$(which node)

    # Ask user if they want to install the service
    read -p "Do you want to install Sumat as a systemd service? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Sumat AI Agent
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_PATH dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
# Load environment from .env if needed, though application loads it internally
# EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        sudo systemctl enable sumat
        echo -e "${GREEN}✓ Service installed. Start with: sudo systemctl start sumat${NC}"
    fi
fi

# 6. Final Instructions
echo -e "\n${GREEN}=================================${NC}"
echo -e "${GREEN}   Sumat Installed Successfully! ${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Configure your keys:  ${YELLOW}sumat onboard${NC}"
echo -e "  2. Start the agent:      ${YELLOW}sumat start${NC}"
echo -e "  3. Get help:             ${YELLOW}sumat --help${NC}"
echo ""
