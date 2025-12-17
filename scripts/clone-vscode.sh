#!/bin/bash

# Clone and set up VS Code fork for ScienceStudio
# This script should be run once to set up the development environment

set -e  # Exit on error

echo "🚀 Setting up VS Code fork for ScienceStudio..."

# Save current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PARENT_DIR="$SCRIPT_DIR/../../"
VSCODE_DIR="$PARENT_DIR/vscode"

# Check if vscode directory already exists
if [ -d "$VSCODE_DIR" ]; then
    echo "⚠️  VS Code directory already exists at $VSCODE_DIR"
    read -p "Do you want to remove it and clone fresh? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$VSCODE_DIR"
    else
        echo "Exiting without changes."
        exit 0
    fi
fi

cd "$PARENT_DIR"

echo "📥 Cloning VS Code repository (this may take a while)..."
git clone https://github.com/microsoft/vscode.git vscode

cd vscode

echo "🔧 Setting up remotes..."
git remote rename origin upstream
git remote add origin git@github.com:AIScienceStudio/vscode.git

echo "🌿 Creating ScienceStudio branch..."
git checkout -b sciencestudio-main

echo "📝 Creating initial ScienceStudio configuration..."
cat > sciencestudio.json << EOF
{
  "name": "ScienceStudio",
  "version": "0.1.0",
  "baseVSCodeVersion": "$(git describe --tags --abbrev=0)",
  "lastUpstreamSync": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "modifications": []
}
EOF

git add sciencestudio.json
git commit -m "Initial ScienceStudio setup

- Set up fork structure
- Add sciencestudio.json for tracking
- Configure remotes (upstream: Microsoft, origin: AIScienceStudio)"

echo "⬆️  Pushing to origin..."
echo "Note: This will fail if the repository doesn't exist on GitHub yet."
echo "Please create an empty repository at: https://github.com/AIScienceStudio/vscode"
read -p "Press Enter when ready to push (or Ctrl+C to skip)..."
git push -u origin sciencestudio-main

echo "📦 Installing dependencies..."
yarn

echo "✅ VS Code fork setup complete!"
echo ""
echo "📍 Location: $VSCODE_DIR"
echo "🌿 Branch: sciencestudio-main"
echo ""
echo "Next steps:"
echo "1. Run initial branding: cd $SCRIPT_DIR && ./brand-vscode.sh"
echo "2. Build VS Code: cd $VSCODE_DIR && yarn watch"
echo "3. Test it: cd $VSCODE_DIR && ./scripts/code.sh"