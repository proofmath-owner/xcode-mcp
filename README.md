# Xcode MCP Server 🚀

A powerful and comprehensive Model Context Protocol (MCP) server for Xcode integration with AI assistants. This enhanced version provides complete project lifecycle management, from creation to deployment.

## 🌟 What's New in v2.0

- **Full TypeScript Support**: Complete type safety and better developer experience
- **Real Swift Package Management**: Actually add, remove, and manage packages
- **Project Creation**: Generate complete, valid Xcode projects from scratch
- **Enhanced Tools**: 40+ tools for every aspect of iOS development
- **Better Error Handling**: Detailed, actionable error messages
- **Performance Optimized**: Faster execution with caching and parallel processing

## ✨ Features

### 🔨 Build & Project Management
- **Create Projects**: Generate complete Xcode projects with proper structure
- **Build Projects**: Compile with custom configurations and destinations
- **Clean Artifacts**: Remove build products and derived data
- **Manage Schemes**: List, create, and manage build schemes
- **Archive & Export**: Create archives and export IPAs
- **Code Signing**: Manage certificates and provisioning profiles

### 📱 Simulator Control
- **Full Lifecycle**: Create, boot, shutdown, and delete simulators
- **App Management**: Install, launch, and uninstall apps
- **Media Capture**: Take screenshots and record videos
- **Device Management**: Reset to factory settings, manage multiple devices
- **Advanced Controls**: Custom runtime selection, state management

### 🧹 Swift Development Tools
- **Code Analysis**: SwiftLint integration with auto-correction
- **Code Formatting**: SwiftFormat with custom configurations
- **Test Execution**: Run unit tests with coverage reporting
- **File Generation**: Create Swift files from templates
- **Package Creation**: Initialize new Swift packages
- **Documentation**: Generate documentation from code

### 📦 Dependency Management
- **Swift Packages**: Add, remove, list, and update packages
- **Version Control**: Specify exact versions, branches, or ranges
- **Dependency Analysis**: Detect CocoaPods, Carthage, and SPM
- **Package Resolution**: Automatic version resolution

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- Xcode 15+ (install from App Store)
- Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

### Optional Tools

For full functionality, install these additional tools:

```bash
# SwiftLint for code analysis
brew install swiftlint

# SwiftFormat for code formatting
brew install swiftformat

# Jazzy for documentation generation
gem install jazzy
```

### Install Xcode MCP

```bash
# Clone the repository
git clone https://github.com/yourusername/xcode-mcp.git
cd xcode-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## ⚙️ Configuration

### Claude Desktop

Add to your Claude Desktop config:
`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "xcode": {
      "command": "node",
      "args": ["/path/to/xcode-mcp/build/index.js"],
      "env": {
        "LOG_LEVEL": "1"
      }
    }
  }
}
```

### Other MCP Clients

```bash
# Run the server directly
node /path/to/xcode-mcp/build/index.js
```

## 📚 Usage Examples

### Create a New iOS App

```
User: "Create a new iOS app called MyAwesomeApp with SwiftUI"
Claude: *creates complete Xcode project with SwiftUI template*
```

### Build and Test

```
User: "Build the project and run tests"
Claude: *builds project, runs tests, shows results with coverage*
```

### Manage Simulators

```
User: "Create an iPhone 15 Pro simulator and take a screenshot"
Claude: *creates simulator, boots it, captures screenshot*
```

### Add Dependencies

```
User: "Add Alamofire package to my project"
Claude: *adds Swift Package with proper version resolution*
```

## 🔧 Available Tools

### Build Tools
| Tool | Description |
|------|-------------|
| `build_project` | Build an Xcode project with options |
| `clean_project` | Clean build artifacts |
| `archive_project` | Create archive for distribution |
| `manage_signing` | Configure code signing |

### Simulator Tools
| Tool | Description |
|------|-------------|
| `list_simulators` | Show available simulators |
| `boot_simulator` | Start a simulator |
| `install_app` | Install app on simulator |
| `capture_screenshot` | Take simulator screenshot |
| `record_video` | Record simulator screen |

### Swift Tools
| Tool | Description |
|------|-------------|
| `analyze_swift_code` | Run SwiftLint analysis |
| `format_swift_code` | Format with SwiftFormat |
| `run_swift_tests` | Execute unit tests |
| `create_swift_file` | Generate Swift files |

### Project Tools
| Tool | Description |
|------|-------------|
| `create_xcode_project` | Create new Xcode project |
| `analyze_project_structure` | Analyze project dependencies |
| `add_swift_package` | Add Swift Package |
| `list_swift_packages` | Show installed packages |

## 📊 Performance

- **Caching**: Intelligent caching reduces redundant operations
- **Parallel Processing**: Build multiple targets simultaneously
- **Optimized Parsing**: Fast analysis of build outputs
- **Minimal Overhead**: Direct integration with xcodebuild

## 🔍 Troubleshooting

### Xcode Not Found

```bash
# Verify Xcode installation
xcode-select -p

# Set Xcode path if needed
sudo xcode-select -s /Applications/Xcode.app
```

### SwiftLint/SwiftFormat Missing

```bash
# Install via Homebrew
brew install swiftlint swiftformat
```

### Permission Issues

```bash
# Reset permissions
sudo xcode-select --reset
```

### Build Failures

1. Clean derived data: `clean_project` tool
2. Reset package cache: `swift package reset`
3. Check scheme settings: `list_schemes` tool

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

## 📈 Monitoring

Enable detailed logging:

```json
{
  "env": {
    "LOG_LEVEL": "0"  // 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Install dev dependencies
npm install

# Run in watch mode
npm run watch

# Run linter
npm run lint:fix
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- MCP SDK team for the excellent framework
- Xcode team for comprehensive CLI tools
- SwiftLint and SwiftFormat communities
- All contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/xcode-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/xcode-mcp/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/xcode-mcp/wiki)

---

Made with ❤️ for iOS developers using AI assistants
