#!/bin/bash

# Sync VS Code upstream changes
# This script should be run regularly to keep our fork up to date

set -e  # Exit on error

echo "🔄 Starting VS Code upstream sync..."

# Save current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VSCODE_DIR="$SCRIPT_DIR/../../vscode"

# Check if vscode directory exists
if [ ! -d "$VSCODE_DIR" ]; then
    echo "❌ VS Code directory not found at $VSCODE_DIR"
    echo "Please run clone-vscode.sh first"
    exit 1
fi

cd "$VSCODE_DIR"

echo "📥 Fetching upstream changes..."
git fetch upstream

echo "🔀 Switching to main branch..."
git checkout main
git pull upstream main

echo "🌿 Switching to sciencestudio-main..."
git checkout sciencestudio-main

echo "🔗 Merging upstream changes..."
if git merge main --no-ff -m "Merge upstream VS Code changes $(date +%Y-%m-%d)"; then
    echo "✅ Successfully merged upstream changes"
else
    echo "⚠️  Merge conflicts detected. Please resolve them manually."
    echo "After resolving conflicts, run: git commit"
    exit 1
fi

echo "📊 Summary of changes:"
git log --oneline -10

echo "✨ Upstream sync complete!"
echo ""
echo "Next steps:"
echo "1. Test the build: cd $VSCODE_DIR && yarn && yarn watch"
echo "2. Push changes: git push origin sciencestudio-main"