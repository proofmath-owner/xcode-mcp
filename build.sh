#!/bin/bash

# Xcode MCP Build Script

echo "🚀 Building Xcode MCP v2.0..."

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required (current: $(node -v))"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build coverage node_modules

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Make executable
chmod +x build/index.js

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -ne 0 ]; then
    echo "⚠️  Some tests failed, but build completed"
fi

echo "✅ Build completed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Add to Claude Desktop config:"
echo "     ~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo "  2. Add this configuration:"
echo '     {
       "mcpServers": {
         "xcode": {
           "command": "node",
           "args": ["'$(pwd)'/build/index.js"]
         }
       }
     }'
echo ""
echo "  3. Restart Claude Desktop"
echo ""
echo "🎉 Enjoy enhanced Xcode integration!"
