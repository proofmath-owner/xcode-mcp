# Contributing to Xcode MCP

We love your input! We want to make contributing to Xcode MCP as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Pull Request Process

1. Update the README.md with details of changes to the interface
2. Update the CHANGELOG.md with your changes
3. Increase version numbers in package.json following [SemVer](http://semver.org/)
4. The PR will be merged once you have the sign-off of at least one maintainer

## Any contributions you make will be under the MIT Software License

When you submit code changes, your submissions are understood to be under the same [MIT License](LICENSE) that covers the project.

## Report bugs using GitHub's [issue tracker](https://github.com/yourusername/xcode-mcp/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/yourusername/xcode-mcp/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/xcode-mcp.git
cd xcode-mcp

# Add upstream remote
git remote add upstream https://github.com/original/xcode-mcp.git

# Install dependencies
npm install

# Create a branch
git checkout -b my-feature

# Make changes and test
npm run dev
npm test

# Commit with conventional commits
git commit -m "feat: add amazing feature"
```

## Code Style

- We use TypeScript with strict mode enabled
- ESLint and Prettier are configured - run `npm run lint:fix` before committing
- Follow the existing code style
- Use meaningful variable names
- Add comments for complex logic
- Write tests for new features

### TypeScript Guidelines

- Always use explicit types for function parameters and return values
- Avoid `any` type - use `unknown` if type is truly unknown
- Use interfaces for object shapes
- Use enums for fixed sets of values
- Leverage TypeScript's type inference where appropriate

### Testing Guidelines

- Write unit tests for all new functionality
- Aim for >80% code coverage
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies

## Adding New Tools

When adding a new tool:

1. Define types in `src/types.ts`
2. Implement the tool in the appropriate file under `src/tools/`
3. Add the tool to the tool list in the class
4. Write tests for the new tool
5. Update documentation with usage examples

Example:

```typescript
// In types.ts
export interface MyNewToolArgs {
  param1: string;
  param2?: number;
}

// In appropriate tool file
{
  name: 'my_new_tool',
  description: 'Does something amazing',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'First parameter',
      },
      param2: {
        type: 'number',
        description: 'Optional second parameter',
      },
    },
    required: ['param1'],
  },
}

// Implementation
private async myNewTool(args: MyNewToolArgs): Promise<ToolResponse> {
  // Implementation here
}
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, missing semicolons, etc)
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvements
- `test:` Adding missing tests
- `chore:` Changes to build process or auxiliary tools

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Questions?

Feel free to open an issue with the `question` label or reach out to the maintainers directly.

Thank you for contributing! 🎉
