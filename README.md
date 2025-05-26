# Xcode MCP Server

🚀 MCP (Model Context Protocol) server for Xcode integration with AI assistants.

## Features

### 🔨 Build & Project Management
- Build Xcode projects
- Clean build artifacts
- List and manage schemes
- Create new projects from templates
- Analyze project structure

### 📱 Simulator Control
- List available iOS simulators
- Boot/shutdown simulators
- Install and launch apps
- Manage simulator states

### 🧹 Swift Code Tools
- Analyze code with SwiftLint
- Format code with SwiftFormat
- Run unit tests
- Create Swift files from templates

### 📦 Dependency Management
- Add Swift Package dependencies
- Detect CocoaPods/SPM usage
- Project dependency analysis

## Installation

```bash
# Install dependencies
cd /Users/sangbinna/mcp/xcode-mcp
npm install

# Build the project
npm run build
```

### Prerequisites

- Node.js 16+
- Xcode installed
- Optional: SwiftLint (`brew install swiftlint`)
- Optional: SwiftFormat (`brew install swiftformat`)

## Configuration

### Claude Desktop

Add to your Claude Desktop config file:
`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "xcode": {
      "command": "node",
      "args": ["/Users/sangbinna/mcp/xcode-mcp/build/index.js"]
    }
  }
}
```

### Other MCP Clients

```bash
# Run the server directly
node /Users/sangbinna/mcp/xcode-mcp/build/index.js
```

## Available Tools

### Build Tools
- `build_project` - Build an Xcode project
- `clean_project` - Clean build artifacts
- `open_in_xcode` - Open file/project in Xcode
- `list_schemes` - List available schemes

### Simulator Tools
- `list_simulators` - List iOS simulators
- `boot_simulator` - Boot a simulator
- `shutdown_simulator` - Shutdown simulators
- `install_app` - Install app on simulator
- `launch_app` - Launch app on simulator

### Swift Tools
- `analyze_swift_code` - Run SwiftLint analysis
- `format_swift_code` - Format with SwiftFormat
- `run_swift_tests` - Execute unit tests
- `create_swift_file` - Create Swift file from template

### Project Tools
- `create_xcode_project` - Create new project
- `find_xcode_projects` - Find projects in directory
- `analyze_project_structure` - Analyze project
- `add_swift_package` - Add SPM dependency

## Usage Examples

### With Claude

```
User: "Build my iOS app"
Claude: *uses build_project tool*

User: "Run tests for MyApp scheme"
Claude: *uses run_swift_tests tool*

User: "Create a new SwiftUI view called ProfileView"
Claude: *uses create_swift_file tool*
```

### Direct Tool Usage

```json
// Build project
{
  "tool": "build_project",
  "arguments": {
    "projectPath": "/path/to/MyApp.xcodeproj",
    "scheme": "MyApp",
    "configuration": "Debug"
  }
}

// Boot simulator
{
  "tool": "boot_simulator",
  "arguments": {
    "device": "iPhone 15 Pro"
  }
}
```

## Development

```bash
# Watch mode for development
npm run watch

# Run in development
npm run dev
```

## Troubleshooting

### "xcodebuild: command not found"
Make sure Xcode is installed and command line tools are set up:
```bash
xcode-select --install
```

### "SwiftLint not installed"
Install via Homebrew:
```bash
brew install swiftlint swiftformat
```

### Simulator issues
Reset simulators if having issues:
```bash
xcrun simctl shutdown all
xcrun simctl erase all
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT