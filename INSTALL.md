# Xcode MCP Installation Guide

## Quick Start

```bash
# 1. Navigate to the project directory
cd /Users/Sangbinna/mcp/xcode-mcp

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Test the installation
npm test
```

## Add to Claude Desktop

1. Open Claude Desktop configuration:
   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Add the Xcode MCP server configuration:
   ```json
   {
     "mcpServers": {
       "xcode": {
         "command": "node",
         "args": ["/Users/Sangbinna/mcp/xcode-mcp/build/index.js"],
         "env": {
           "LOG_LEVEL": "1"
         }
       }
     }
   }
   ```

3. Save the file and restart Claude Desktop

## Verify Installation

After restarting Claude, you should be able to use Xcode tools:

```
User: "List available Xcode tools"
Claude: *shows all 40+ available tools*

User: "Find Xcode projects on my system"
Claude: *searches and lists projects*

User: "Create a new iOS app called TestApp"
Claude: *creates complete Xcode project*
```

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Ensure TypeScript is installed globally:
   ```bash
   npm install -g typescript
   ```

2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

3. Delete node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Runtime Errors

1. Check Xcode installation:
   ```bash
   xcode-select -p
   ```

2. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```

3. Enable verbose logging by setting LOG_LEVEL=0 in the config

## Optional Enhancements

### Install SwiftLint
```bash
brew install swiftlint
```

### Install SwiftFormat
```bash
brew install swiftformat
```

### Install Documentation Tools
```bash
gem install jazzy
```

## Development Mode

For development with auto-reload:

```bash
# Terminal 1: Watch TypeScript changes
npm run watch

# Terminal 2: Run Claude with the development build
# Update your config to point to the build directory
```

## Testing

Run the test suite:

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Support

If you encounter issues:

1. Check the logs in Claude Desktop's developer console
2. Enable debug logging (LOG_LEVEL=0)
3. Run the diagnostic command:
   ```bash
   node /Users/Sangbinna/mcp/xcode-mcp/build/index.js --version
   ```

## Success! 🎉

You now have a fully-featured Xcode integration in Claude!

Enjoy building iOS apps with AI assistance!
