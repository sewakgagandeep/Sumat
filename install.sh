#!/usr/bin/env bash
# Sumat — Ubuntu Install Script
# Run: curl -sSL https://raw.githubusercontent.com/your-repo/sumat/main/install.sh | bash
set -euo pipefail

echo "🚀 Installing Sumat AI Agent Framework..."

# Check Node.js
if ! command -v node &> /dev/null || [ "$(node -e 'console.log(parseInt(process.versions.node))')" -lt 20 ]; then
    echo "📦 Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js $(node -v)"

# Clone or update
INSTALL_DIR="$HOME/sumat"
if [ -d "$INSTALL_DIR" ]; then
    echo "📁 Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "📥 Cloning Sumat..."
    git clone https://github.com/your-repo/sumat.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build
echo "🔨 Building..."
npm run build

# Create symlink
echo "🔗 Creating sumat command..."
sudo ln -sf "$INSTALL_DIR/dist/cli/index.js" /usr/local/bin/sumat
sudo chmod +x "$INSTALL_DIR/dist/cli/index.js"

# Create systemd service
if [ ! -f /etc/systemd/system/sumat.service ]; then
    echo "⚙️  Creating systemd service..."
    sudo tee /etc/systemd/system/sumat.service > /dev/null << EOF
[Unit]
Description=Sumat AI Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    echo "   Start with: sudo systemctl start sumat"
    echo "   Enable on boot: sudo systemctl enable sumat"
fi

echo ""
echo "✅ Sumat installed to $INSTALL_DIR"
echo ""
echo "Next steps:"
echo "  1. Run 'sumat onboard' to configure your API keys"
echo "  2. Run 'sumat doctor' to verify setup"
echo "  3. Run 'sumat start' to launch"
echo ""
