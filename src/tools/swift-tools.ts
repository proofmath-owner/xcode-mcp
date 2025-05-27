import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AnalyzeSwiftCodeArgs,
  FormatSwiftCodeArgs,
  RunSwiftTestsArgs,
  CreateSwiftFileArgs,
  ToolResponse,
  TestResult,
  TestFailure,
  XcodeMCPError,
  ErrorCode,
} from '../types.js';
import {
  parseTestOutput,
  fileExists,
  ensureDirectoryExists,
  logger,
  PerformanceMonitor,
} from '../utils.js';

const execAsync = promisify(exec);

export class SwiftTools {
  private tools = [
    {
      name: 'analyze_swift_code',
      description: 'Analyze Swift code with SwiftLint',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to Swift file or directory',
          },
          autoCorrect: {
            type: 'boolean',
            description: 'Auto-correct violations when possible',
            default: false,
          },
          config: {
            type: 'string',
            description: 'Path to SwiftLint configuration file',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'format_swift_code',
      description: 'Format Swift code with SwiftFormat',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to Swift file or directory',
          },
          config: {
            type: 'string',
            description: 'Path to SwiftFormat configuration file',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'run_swift_tests',
      description: 'Run Swift unit tests',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj or .xcworkspace',
          },
          scheme: {
            type: 'string',
            description: 'Test scheme name',
          },
          testName: {
            type: 'string',
            description: 'Specific test to run (optional)',
          },
          destination: {
            type: 'string',
            description: 'Test destination (default: iOS Simulator)',
          },
        },
        required: ['projectPath', 'scheme'],
      },
    },
    {
      name: 'create_swift_file',
      description: 'Create a new Swift file with template',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path for the new Swift file',
          },
          template: {
            type: 'string',
            description: 'Template type: class, struct, enum, protocol, swiftui, uikit, viewmodel, test',
            default: 'class',
          },
          name: {
            type: 'string',
            description: 'Name of the type to create',
          },
          imports: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional imports to include',
          },
        },
        required: ['filePath', 'name'],
      },
    },
    {
      name: 'create_swift_package',
      description: 'Create a new Swift Package',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to create the package',
          },
          name: {
            type: 'string',
            description: 'Package name',
          },
          type: {
            type: 'string',
            description: 'Package type: library, executable, plugin',
            default: 'library',
          },
        },
        required: ['path', 'name'],
      },
    },
    {
      name: 'generate_documentation',
      description: 'Generate documentation for Swift code',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to Swift file or directory',
          },
          format: {
            type: 'string',
            description: 'Documentation format: markdown, html, docset',
            default: 'markdown',
          },
          outputPath: {
            type: 'string',
            description: 'Output directory for documentation',
          },
        },
        required: ['path', 'outputPath'],
      },
    },
  ];

  getTools() {
    return this.tools;
  }

  canHandle(toolName: string): boolean {
    return this.tools.some(tool => tool.name === toolName);
  }

  async execute(toolName: string, args: any): Promise<ToolResponse> {
    switch (toolName) {
      case 'analyze_swift_code':
        return await this.analyzeSwiftCode(args as AnalyzeSwiftCodeArgs);
      case 'format_swift_code':
        return await this.formatSwiftCode(args as FormatSwiftCodeArgs);
      case 'run_swift_tests':
        return await this.runSwiftTests(args as RunSwiftTestsArgs);
      case 'create_swift_file':
        return await this.createSwiftFile(args as CreateSwiftFileArgs);
      case 'create_swift_package':
        return await this.createSwiftPackage(args);
      case 'generate_documentation':
        return await this.generateDocumentation(args);
      default:
        throw new XcodeMCPError(`Unknown tool: ${toolName}`, ErrorCode.UNKNOWN_ERROR);
    }
  }

  private async analyzeSwiftCode(args: AnalyzeSwiftCodeArgs): Promise<ToolResponse> {
    const { path: codePath, autoCorrect = false, config } = args;
    
    try {
      logger.info(`Analyzing Swift code: ${codePath}`);
      
      // Check if SwiftLint is installed
      try {
        await execAsync('which swiftlint');
      } catch {
        throw new XcodeMCPError(
          'SwiftLint is not installed. Install it with: brew install swiftlint',
          ErrorCode.SWIFT_TOOL_MISSING
        );
      }
      
      // Check if path exists
      if (!await fileExists(codePath)) {
        throw new XcodeMCPError(
          `Path not found: ${codePath}`,
          ErrorCode.PROJECT_NOT_FOUND
        );
      }
      
      let command = autoCorrect
        ? `swiftlint autocorrect --path "${codePath}"`
        : `swiftlint lint --path "${codePath}" --reporter json`;
      
      if (config) {
        command += ` --config "${config}"`;
      }
      
      const { stdout, stderr } = await execAsync(command);
      
      if (autoCorrect) {
        // Count fixed violations
        const fixedCount = (stdout.match(/Correcting/g) || []).length;
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Swift code auto-corrected successfully!\n\n` +
                    `🔧 Fixed ${fixedCount} violations\n` +
                    `📁 Path: ${codePath}`,
            },
          ],
        };
      }
      
      // Parse JSON output
      const violations = JSON.parse(stdout || '[]');
      const summary = this.summarizeViolations(violations);
      
      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Analysis failed: ${error.message}`);
      
      if (error.code) {
        throw error;
      }
      
      // If JSON parsing failed, return raw output
      if (error.message.includes('JSON')) {
        return {
          content: [
            {
              type: 'text',
              text: `SwiftLint Analysis:\n${error.stdout || error.message}`,
            },
          ],
        };
      }
      
      throw new XcodeMCPError(
        `Analysis failed: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async formatSwiftCode(args: FormatSwiftCodeArgs): Promise<ToolResponse> {
    const { path: codePath, config } = args;
    
    try {
      logger.info(`Formatting Swift code: ${codePath}`);
      
      // Check if SwiftFormat is installed
      try {
        await execAsync('which swiftformat');
      } catch {
        throw new XcodeMCPError(
          'SwiftFormat is not installed. Install it with: brew install swiftformat',
          ErrorCode.SWIFT_TOOL_MISSING
        );
      }
      
      // Check if path exists
      if (!await fileExists(codePath)) {
        throw new XcodeMCPError(
          `Path not found: ${codePath}`,
          ErrorCode.PROJECT_NOT_FOUND
        );
      }
      
      let command = `swiftformat "${codePath}" --verbose`;
      
      if (config) {
        command += ` --config "${config}"`;
      }
      
      const { stdout } = await execAsync(command);
      
      // Parse output for statistics
      const filesFormatted = (stdout.match(/Formatting .+\.swift/g) || []).length;
      const totalFiles = (stdout.match(/\.swift/g) || []).length;
      
      return {
        content: [
          {
            type: 'text',
            text: `✨ Swift code formatted successfully!\n\n` +
                  `📊 Statistics:\n` +
                  `  • Files processed: ${totalFiles}\n` +
                  `  • Files formatted: ${filesFormatted}\n` +
                  `  • Path: ${codePath}\n` +
                  config ? `  • Config: ${config}\n` : '',
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Formatting failed: ${error.message}`);
      
      if (error.code) {
        throw error;
      }
      
      throw new XcodeMCPError(
        `Formatting failed: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async runSwiftTests(args: RunSwiftTestsArgs): Promise<ToolResponse> {
    const { projectPath, scheme, testName, destination } = args;
    
    const monitor = new PerformanceMonitor();
    
    try {
      logger.info(`Running Swift tests: ${projectPath}`);
      monitor.mark('test-start');
      
      const isWorkspace = projectPath.endsWith('.xcworkspace');
      const projectFlag = isWorkspace ? '-workspace' : '-project';
      
      let command = `xcodebuild test ${projectFlag} "${projectPath}" -scheme "${scheme}"`;
      
      if (destination) {
        command += ` -destination "${destination}"`;
      } else {
        command += ` -destination "platform=iOS Simulator,name=iPhone 15"`;
      }
      
      if (testName) {
        command += ` -only-testing:${testName}`;
      }
      
      command += ' -resultBundlePath TestResults.xcresult';
      
      logger.debug(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      monitor.mark('test-complete');
      
      // Parse test results
      const testResult = parseTestOutput(stdout);
      const testTime = monitor.measure('test-time', 'test-start');
      
      let output = `🧪 Test Results\n\n`;
      output += `${testResult.totalTests === testResult.passedTests ? '✅' : '❌'} `;
      output += `${testResult.passedTests}/${testResult.totalTests} tests passed\n\n`;
      
      output += `📊 Summary:\n`;
      output += `  • Total: ${testResult.totalTests}\n`;
      output += `  • Passed: ${testResult.passedTests} ✅\n`;
      output += `  • Failed: ${testResult.failedTests} ❌\n`;
      output += `  • Duration: ${(testTime / 1000).toFixed(2)}s ⏱️\n`;
      
      if (testResult.failedTests > 0) {
        output += `\n❌ Failed Tests:\n`;
        testResult.failures.forEach(failure => {
          output += `  • ${failure.testName}\n`;
          output += `    ${failure.reason}\n`;
        });
      }
      
      // Coverage info if available
      const coverageMatch = stdout.match(/Test Coverage: ([\d.]+)%/);
      if (coverageMatch) {
        const coverage = parseFloat(coverageMatch[1]);
        output += `\n📈 Code Coverage: ${coverage}%`;
      }
      
      logger.info(`Tests completed in ${testTime}ms`);
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      monitor.mark('test-error');
      logger.error(`Test execution failed: ${error.message}`);
      
      // Extract any test results from error output
      const errorOutput = error.stdout || error.stderr || '';
      const testResult = parseTestOutput(errorOutput);
      
      if (testResult.totalTests > 0) {
        let output = `❌ Test execution failed\n\n`;
        output += `📊 Partial Results:\n`;
        output += `  • Passed: ${testResult.passedTests}/${testResult.totalTests}\n`;
        
        if (testResult.failures.length > 0) {
          output += `\n❌ Failures:\n`;
          testResult.failures.forEach(failure => {
            output += `  • ${failure.testName}: ${failure.reason}\n`;
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }
      
      throw new XcodeMCPError(
        `Test execution failed: ${error.message}`,
        ErrorCode.BUILD_FAILED
      );
    }
  }

  private async createSwiftFile(args: CreateSwiftFileArgs): Promise<ToolResponse> {
    const { filePath, template = 'class', name, imports = [] } = args;
    
    try {
      logger.info(`Creating Swift file: ${filePath}`);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await ensureDirectoryExists(dir);
      
      // Generate content based on template
      const content = this.getSwiftTemplate(template, name, imports);
      
      // Write file
      await fs.writeFile(filePath, content, 'utf8');
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Created Swift file: ${path.basename(filePath)}\n\n` +
                  `📁 Location: ${filePath}\n` +
                  `📝 Template: ${template}\n` +
                  `🏷️ Type: ${name}\n\n` +
                  `Content preview:\n\`\`\`swift\n${content.substring(0, 500)}${content.length > 500 ? '\n...' : ''}\n\`\`\``,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to create file: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to create file: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async createSwiftPackage(args: any): Promise<ToolResponse> {
    const { path: packagePath, name, type = 'library' } = args;
    
    try {
      logger.info(`Creating Swift Package: ${name}`);
      
      // Create package directory
      const fullPath = path.join(packagePath, name);
      await ensureDirectoryExists(fullPath);
      
      // Initialize Swift package
      let command = `cd "${fullPath}" && swift package init --type ${type} --name ${name}`;
      
      await execAsync(command);
      
      // Create additional structure for library packages
      if (type === 'library') {
        // Add example test
        const testContent = `import XCTest
@testable import ${name}

final class ${name}Tests: XCTestCase {
    func testExample() throws {
        // Example test
        XCTAssertEqual(${name}().text, "Hello, World!")
    }
}`;
        
        await fs.writeFile(
          path.join(fullPath, 'Tests', `${name}Tests`, `${name}Tests.swift`),
          testContent,
          'utf8'
        );
      }
      
      // Read Package.swift
      const packageSwiftPath = path.join(fullPath, 'Package.swift');
      const packageContent = await fs.readFile(packageSwiftPath, 'utf8');
      
      return {
        content: [
          {
            type: 'text',
            text: `📦 Swift Package created successfully!\n\n` +
                  `📁 Location: ${fullPath}\n` +
                  `📝 Type: ${type}\n` +
                  `🏷️ Name: ${name}\n\n` +
                  `📂 Structure:\n` +
                  `  • Package.swift\n` +
                  `  • Sources/${name}/\n` +
                  `  • Tests/${name}Tests/\n` +
                  `  • README.md\n\n` +
                  `Package.swift:\n\`\`\`swift\n${packageContent}\n\`\`\``,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to create package: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to create package: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async generateDocumentation(args: any): Promise<ToolResponse> {
    const { path: sourcePath, format = 'markdown', outputPath } = args;
    
    try {
      logger.info(`Generating documentation: ${sourcePath}`);
      
      // Ensure output directory exists
      await ensureDirectoryExists(outputPath);
      
      // For now, provide instructions on using documentation tools
      let output = `📚 Documentation Generation\n\n`;
      output += `Swift documentation can be generated using various tools:\n\n`;
      
      output += `1. **Swift-DocC** (Apple's official tool):\n`;
      output += `   \`\`\`bash\n`;
      output += `   swift-docc generate-documentation \\\n`;
      output += `     --source-path "${sourcePath}" \\\n`;
      output += `     --output-path "${outputPath}"\n`;
      output += `   \`\`\`\n\n`;
      
      output += `2. **Jazzy** (Popular third-party tool):\n`;
      output += `   \`\`\`bash\n`;
      output += `   # Install: gem install jazzy\n`;
      output += `   jazzy \\\n`;
      output += `     --source-directory "${sourcePath}" \\\n`;
      output += `     --output "${outputPath}" \\\n`;
      output += `     --theme apple\n`;
      output += `   \`\`\`\n\n`;
      
      output += `3. **SourceDocs** (Markdown generation):\n`;
      output += `   \`\`\`bash\n`;
      output += `   # Install: brew install sourcedocs\n`;
      output += `   sourcedocs generate \\\n`;
      output += `     --output-folder "${outputPath}" \\\n`;
      output += `     -- -workspace YourWorkspace.xcworkspace \\\n`;
      output += `     -scheme YourScheme\n`;
      output += `   \`\`\`\n\n`;
      
      output += `📝 Documentation Comments:\n`;
      output += `Use triple-slash comments (///) or /** */ for documentation:\n\n`;
      output += `\`\`\`swift\n`;
      output += `/// A simple greeting function\n`;
      output += `/// - Parameter name: The name to greet\n`;
      output += `/// - Returns: A greeting message\n`;
      output += `func greet(_ name: String) -> String {\n`;
      output += `    return "Hello, \\(name)!"\n`;
      output += `}\n`;
      output += `\`\`\``;
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to generate documentation: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to generate documentation: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private getSwiftTemplate(template: string, name: string, imports: string[]): string {
    const date = new Date().toLocaleDateString();
    const defaultImports = ['Foundation'];
    const allImports = [...new Set([...defaultImports, ...imports])];
    
    const header = `//
//  ${name}.swift
//  Created on ${date}
//

${allImports.map(imp => `import ${imp}`).join('\n')}\n\n`;
    
    switch (template) {
      case 'class':
        return `${header}/// ${name} class
public class ${name} {
    
    // MARK: - Properties
    
    // MARK: - Initialization
    
    public init() {
        
    }
    
    // MARK: - Public Methods
    
    // MARK: - Private Methods
}`;
      
      case 'struct':
        return `${header}/// ${name} struct
public struct ${name} {
    
    // MARK: - Properties
    
    // MARK: - Initialization
    
    public init() {
        
    }
    
    // MARK: - Public Methods
}`;
      
      case 'enum':
        return `${header}/// ${name} enumeration
public enum ${name} {
    
    // MARK: - Cases
    
    case example
    
    // MARK: - Properties
    
    // MARK: - Methods
}`;
      
      case 'protocol':
        return `${header}/// ${name} protocol
public protocol ${name} {
    
    // MARK: - Requirements
    
    // MARK: - Optional Requirements
}

// MARK: - Default Implementation

extension ${name} {
    
}`;
      
      case 'swiftui':
        return `//
//  ${name}.swift
//  Created on ${date}
//

import SwiftUI

struct ${name}: View {
    
    // MARK: - Properties
    
    @State private var isPresented = false
    
    // MARK: - Body
    
    var body: some View {
        VStack(spacing: 20) {
            Text("${name}")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Button("Tap me") {
                withAnimation {
                    isPresented.toggle()
                }
            }
            .buttonStyle(.borderedProminent)
            
            if isPresented {
                Text("Hello, SwiftUI!")
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .padding()
    }
}

// MARK: - Preview

#Preview {
    ${name}()
}`;
      
      case 'uikit':
        return `//
//  ${name}.swift
//  Created on ${date}
//

import UIKit

class ${name}: UIViewController {
    
    // MARK: - Properties
    
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "${name}"
        label.font = .systemFont(ofSize: 24, weight: .bold)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        setupConstraints()
    }
    
    // MARK: - Setup
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        view.addSubview(titleLabel)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
    
    // MARK: - Actions
    
    // MARK: - Private Methods
}`;
      
      case 'viewmodel':
        return `${header}import Combine

/// ${name} - ViewModel for handling business logic
final class ${name}: ObservableObject {
    
    // MARK: - Published Properties
    
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // MARK: - Properties
    
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        setupBindings()
    }
    
    // MARK: - Public Methods
    
    func loadData() {
        isLoading = true
        errorMessage = nil
        
        // TODO: Implement data loading
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
            self?.isLoading = false
        }
    }
    
    // MARK: - Private Methods
    
    private func setupBindings() {
        // Setup Combine bindings here
    }
}`;
      
      case 'test':
        return `//
//  ${name}.swift
//  Created on ${date}
//

import XCTest

final class ${name}: XCTestCase {
    
    // MARK: - Properties
    
    var sut: Any!
    
    // MARK: - Setup & Teardown
    
    override func setUp() {
        super.setUp()
        // Initialize system under test
    }
    
    override func tearDown() {
        sut = nil
        super.tearDown()
    }
    
    // MARK: - Tests
    
    func test_example() throws {
        // Given
        
        // When
        
        // Then
        XCTAssertTrue(true)
    }
    
    func test_performance() throws {
        measure {
            // Performance test
        }
    }
}`;
      
      default:
        return `${header}// TODO: Implement ${name}`;
    }
  }

  private summarizeViolations(violations: any[]): string {
    if (violations.length === 0) {
      return '✅ No SwiftLint violations found! Your code is clean! 🎉';
    }
    
    const byType: { [key: string]: number } = {};
    const bySeverity: { [key: string]: number } = {};
    const byFile: { [key: string]: number } = {};
    
    violations.forEach(violation => {
      // Count by rule
      byType[violation.rule_id] = (byType[violation.rule_id] || 0) + 1;
      
      // Count by severity
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
      
      // Count by file
      const fileName = path.basename(violation.file);
      byFile[fileName] = (byFile[fileName] || 0) + 1;
    });
    
    let summary = `📊 SwiftLint Analysis Results\n\n`;
    summary += `Total violations: ${violations.length}\n\n`;
    
    // Severity breakdown
    summary += `🚦 By Severity:\n`;
    Object.entries(bySeverity)
      .sort(([a], [b]) => {
        const order: { [key: string]: number } = { error: 0, warning: 1 };
        return (order[a] ?? 2) - (order[b] ?? 2);
      })
      .forEach(([severity, count]) => {
        const emoji = severity === 'error' ? '❌' : '⚠️';
        summary += `  ${emoji} ${severity}: ${count}\n`;
      });
    
    // Top violations
    summary += `\n📋 Top Violations:\n`;
    Object.entries(byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([rule, count]) => {
        summary += `  • ${rule}: ${count}\n`;
      });
    
    // Files with most violations
    if (Object.keys(byFile).length > 1) {
      summary += `\n📁 Files with Most Violations:\n`;
      Object.entries(byFile)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .forEach(([file, count]) => {
          summary += `  • ${file}: ${count}\n`;
        });
    }
    
    // Sample violations
    summary += `\n📝 Sample Violations:\n`;
    violations.slice(0, 3).forEach(violation => {
      const fileName = path.basename(violation.file);
      summary += `  • ${fileName}:${violation.line}:${violation.character}\n`;
      summary += `    ${violation.rule_id}: ${violation.reason}\n`;
    });
    
    summary += `\n💡 Run with autoCorrect: true to fix auto-correctable violations`;
    
    return summary;
  }
}
