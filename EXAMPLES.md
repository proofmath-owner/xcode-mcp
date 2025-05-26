# Xcode MCP Usage Examples

## Basic Project Operations

### Build a project
```
"Build my iOS app located at /path/to/MyApp.xcodeproj"
```

### Clean build artifacts
```
"Clean the build folder for MyApp"
```

### List available schemes
```
"What schemes are available in MyApp.xcworkspace?"
```

## Simulator Management

### List simulators
```
"Show me all available iOS simulators"
```

### Boot and use simulator
```
"Boot iPhone 15 Pro simulator and install MyApp"
```

### Launch app
```
"Launch com.example.myapp on the booted simulator"
```

## Swift Code Operations

### Analyze code quality
```
"Run SwiftLint on my Swift files in /src"
```

### Format code
```
"Format all Swift files in the current directory"
```

### Run tests
```
"Run unit tests for the MyAppTests scheme"
```

## Project Creation

### Create new project
```
"Create a new iOS app called TodoList with SwiftUI"
```

### Create Swift file
```
"Create a new SwiftUI view called ProfileView"
```

### Add dependencies
```
"Add Alamofire package to my project"
```

## Complex Workflows

### Full build and test
```
"Build MyApp in Debug configuration, then run all unit tests"
```

### Simulator workflow
```
"Boot iPhone 15 Pro, build and install MyApp, then launch it"
```

### Code quality check
```
"Analyze my Swift code, fix any auto-correctable issues, then format it"
```

## Tips

1. **Be specific with paths** - Use full paths when possible
2. **Name your schemes** - Specify exact scheme names for builds
3. **Check simulator names** - Use exact simulator device names
4. **Combine operations** - Claude can chain multiple operations

## Common Issues

### "Scheme not found"
List schemes first to see available options:
```
"List schemes in MyApp.xcodeproj"
```

### "Simulator not available"
Check available simulators:
```
"Show me all iOS simulators"
```

### "Build failed"
Check build settings and clean first:
```
"Clean and rebuild MyApp with Debug configuration"
```
