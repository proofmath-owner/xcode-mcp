# Contributing to Xcode MCP

Thank you for your interest in contributing to Xcode MCP! 🎉

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include:

- **Clear and descriptive title**
- **Steps to reproduce** the issue
- **Expected behavior** vs what actually happened
- **Screenshots** if applicable
- **Environment details** (macOS version, Xcode version, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

- **Use case** - why this enhancement would be useful
- **Proposed solution** - how it should work
- **Alternatives considered**
- **Additional context** - mockups, examples, etc.

### Pull Requests

1. Fork the repo and create your branch from `main`
2. Run `npm install` to install dependencies
3. Make your changes
4. Add tests if applicable
5. Ensure tests pass with `npm test`
6. Run `npm run build` to ensure it builds
7. Commit your changes with clear messages
8. Push to your fork and submit a pull request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/proofmath-owner/xcode-mcp.git
cd xcode-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Watch mode for development
npm run watch
```

## Project Structure

```
xcode-mcp/
├── src/
│   ├── index.ts        # Main entry point
│   ├── tools/          # Tool implementations
│   └── utils/          # Utility functions
├── build/              # Compiled output (git ignored)
├── test/               # Test files
└── docs/               # Documentation
```

## Coding Standards

- Use TypeScript for all new code
- Follow existing code style
- Add JSDoc comments for public APIs
- Write meaningful commit messages
- Keep functions small and focused
- Handle errors gracefully

## Testing

- Write tests for new features
- Run existing tests before submitting PR
- Test with different Xcode versions if possible
- Test error cases, not just happy paths

## Documentation

- Update README.md if adding new features
- Add JSDoc comments to your code
- Include usage examples
- Document any breaking changes

## Questions?

Feel free to open an issue for any questions about contributing!

Thank you for contributing to Xcode MCP! 🚀
