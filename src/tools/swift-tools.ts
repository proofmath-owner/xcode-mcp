import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

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
            description: 'Template type: class, struct, enum, protocol, swiftui, uikit',
            default: 'class',
          },
          name: {
            type: 'string',
            description: 'Name of the type to create',
          },
        },
        required: ['filePath', 'name'],
      },
    },
  ];

  getTools() {
    return this.tools;
  }

  canHandle(toolName: string): boolean {
    return this.tools.some(tool => tool.name === toolName);
  }

  async execute(toolName: string, args: any) {
    switch (toolName) {
      case 'analyze_swift_code':
        return await this.analyzeSwiftCode(args);
      case 'format_swift_code':
        return await this.formatSwiftCode(args);
      case 'run_swift_tests':
        return await this.runSwiftTests(args);
      case 'create_swift_file':
        return await this.createSwiftFile(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async analyzeSwiftCode(args: any) {
    const { path: codePath, autoCorrect = false } = args;
    
    try {
      // SwiftLint 확인
      await execAsync('which swiftlint');
      
      const command = autoCorrect
        ? `swiftlint autocorrect --path "${codePath}"`
        : `swiftlint lint --path "${codePath}" --reporter json`;
      
      const { stdout } = await execAsync(command);
      
      if (autoCorrect) {
        return {
          content: [
            {
              type: 'text',
              text: `Swift code auto-corrected successfully\n${stdout}`,
            },
          ],
        };
      }
      
      const violations = JSON.parse(stdout);
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
      if (error.message.includes('command not found')) {
        return {
          content: [
            {
              type: 'text',
              text: 'SwiftLint is not installed. Install it with: brew install swiftlint',
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: `Analysis failed: ${error.message}`,
          },
        ],
      };
    }
  }

  private async formatSwiftCode(args: any) {
    const { path: codePath } = args;
    
    try {
      // SwiftFormat 확인
      await execAsync('which swiftformat');
      
      await execAsync(`swiftformat "${codePath}"`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Swift code formatted successfully`,
          },
        ],
      };
    } catch (error: any) {
      if (error.message.includes('command not found')) {
        return {
          content: [
            {
              type: 'text',
              text: 'SwiftFormat is not installed. Install it with: brew install swiftformat',
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: `Formatting failed: ${error.message}`,
          },
        ],
      };
    }
  }

  private async runSwiftTests(args: any) {
    const { projectPath, scheme, testName } = args;
    
    try {
      const isWorkspace = projectPath.endsWith('.xcworkspace');
      const projectFlag = isWorkspace ? '-workspace' : '-project';
      
      let command = `xcodebuild test ${projectFlag} "${projectPath}" -scheme "${scheme}" -destination 'platform=iOS Simulator,name=iPhone 15'`;
      
      if (testName) {
        command += ` -only-testing:${testName}`;
      }
      
      const { stdout } = await execAsync(command);
      
      // 테스트 결과 파싱
      const testsPassed = stdout.includes('TEST SUCCEEDED');
      const testMatches = stdout.match(/Test Case .* (passed|failed)/g) || [];
      const passed = testMatches.filter(m => m.includes('passed')).length;
      const failed = testMatches.filter(m => m.includes('failed')).length;
      
      return {
        content: [
          {
            type: 'text',
            text: `Test Results:\n` +
                  `Status: ${testsPassed ? '✅ Passed' : '❌ Failed'}\n` +
                  `Passed: ${passed}\n` +
                  `Failed: ${failed}\n\n` +
                  `${failed > 0 ? 'Failed tests:\n' + testMatches.filter(m => m.includes('failed')).join('\n') : ''}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Test execution failed: ${error.message}`,
          },
        ],
      };
    }
  }

  private async createSwiftFile(args: any) {
    const { filePath, template = 'class', name } = args;
    
    try {
      const content = this.getSwiftTemplate(template, name);
      
      // 디렉토리 생성
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // 파일 생성
      await fs.writeFile(filePath, content, 'utf8');
      
      return {
        content: [
          {
            type: 'text',
            text: `Created Swift file: ${filePath}\n\nContent:\n${content}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create file: ${error.message}`,
          },
        ],
      };
    }
  }

  private getSwiftTemplate(template: string, name: string): string {
    const date = new Date().toLocaleDateString();
    const header = `//\n//  ${name}.swift\n//  Created on ${date}\n//\n\n`;
    
    switch (template) {
      case 'class':
        return `${header}import Foundation\n\nclass ${name} {\n    \n    init() {\n        \n    }\n    \n}\n`;
      
      case 'struct':
        return `${header}import Foundation\n\nstruct ${name} {\n    \n}\n`;
      
      case 'enum':
        return `${header}import Foundation\n\nenum ${name} {\n    \n}\n`;
      
      case 'protocol':
        return `${header}import Foundation\n\nprotocol ${name} {\n    \n}\n`;
      
      case 'swiftui':
        return `${header}import SwiftUI\n\nstruct ${name}: View {\n    var body: some View {\n        Text("Hello, World!")\n    }\n}\n\n#Preview {\n    ${name}()\n}\n`;
      
      case 'uikit':
        return `${header}import UIKit\n\nclass ${name}: UIViewController {\n    \n    override func viewDidLoad() {\n        super.viewDidLoad()\n        \n        setupUI()\n    }\n    \n    private func setupUI() {\n        view.backgroundColor = .systemBackground\n    }\n}\n`;
      
      default:
        return `${header}import Foundation\n\n// TODO: Implement ${name}\n`;
    }
  }

  private summarizeViolations(violations: any[]): string {
    if (violations.length === 0) {
      return '✅ No SwiftLint violations found!';
    }
    
    const byType: { [key: string]: number } = {};
    const bySeverity: { [key: string]: number } = {};
    
    violations.forEach(violation => {
      byType[violation.rule_id] = (byType[violation.rule_id] || 0) + 1;
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
    });
    
    let summary = `SwiftLint Analysis Results:\n\n`;
    summary += `Total violations: ${violations.length}\n\n`;
    
    summary += `By severity:\n`;
    Object.entries(bySeverity).forEach(([severity, count]) => {
      summary += `  ${severity}: ${count}\n`;
    });
    
    summary += `\nTop violations:\n`;
    Object.entries(byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([rule, count]) => {
        summary += `  ${rule}: ${count}\n`;
      });
    
    return summary;
  }
}