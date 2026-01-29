#!/bin/bash

# ScienceStudio Extension Development Runner
# Usage: ./run-extension.sh [test-folder]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$SCRIPT_DIR/extensions/sciencestudio-core"
TEST_FOLDER="${1:-$SCRIPT_DIR/data}"
FILE_SERVER_PORT=8081

echo "=== ScienceStudio Extension Runner ==="
echo ""

# Clean up port conflicts
echo "[1/4] Checking for port conflicts..."
if lsof -ti :$FILE_SERVER_PORT > /dev/null 2>&1; then
    echo "  Port $FILE_SERVER_PORT is in use. Cleaning up..."
    # Kill processes using the port (usually old VS Code extension hosts)
    lsof -ti :$FILE_SERVER_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
    echo "  Port $FILE_SERVER_PORT is now free."
else
    echo "  Port $FILE_SERVER_PORT is available."
fi

# Compile the extension
echo "[2/4] Compiling extension..."
cd "$EXT_DIR"
npm run compile

# Ensure test folder exists
echo "[3/4] Preparing test folder: $TEST_FOLDER"
mkdir -p "$TEST_FOLDER"

# Create a test document if none exists
if [ ! -f "$TEST_FOLDER/test.docx" ]; then
    echo "  (No test.docx found - you can add one to test)"
fi

# Check OnlyOffice is running
echo "[4/4] Checking OnlyOffice status..."
if curl -s --max-time 2 http://localhost:8080/healthcheck > /dev/null 2>&1; then
    echo "  OnlyOffice is running."
else
    echo "  WARNING: OnlyOffice is not running!"
    echo "  Start it with: docker-compose up -d"
    echo ""
fi

# Launch VS Code with extension
echo ""
echo "Launching VS Code with extension..."
echo ""
echo "Tips:"
echo "  - Press Cmd+Shift+D to open diagnostic panel in .docx editor"
echo "  - Try different cursor offset strategies"
echo "  - Use 'Calibrate Offset' to measure the offset"
echo ""

code --extensionDevelopmentPath="$EXT_DIR" "$TEST_FOLDER"
