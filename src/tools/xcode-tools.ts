import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export class XcodeTools {
  private tools = [
    {
      name: 'build_project',
      description: 'Build an Xcode project',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj or .xcworkspace file',
          },
          scheme: {
            type: 'string',
            description: 'Build scheme name (optional)',
          },
          configuration: {
            type: 'string',
            description: 'Build configuration (Debug/Release)',
            default: 'Debug',
          },
        },
        required: ['projectPath'],
      },
    },
    {
      name: 'clean_project',
      description: 'Clean Xcode project build artifacts',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj or .xcworkspace file',
          },
        },
        required: ['projectPath'],
      },
    },
    {
      name: 'open_in_xcode',
      description: 'Open a file or project in Xcode',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to file or project',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'list_schemes',
      description: 'List available schemes in a project',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj or .xcworkspace file',
          },
        },
        required: ['projectPath'],
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
      case 'build_project':
        return await this.buildProject(args);
      case 'clean_project':
        return await this.cleanProject(args);
      case 'open_in_xcode':
        return await this.openInXcode(args);
      case 'list_schemes':
        return await this.listSchemes(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async buildProject(args: any) {
    const { projectPath, scheme, configuration = 'Debug' } = args;
    
    try {
      const isWorkspace = projectPath.endsWith('.xcworkspace');
      const projectFlag = isWorkspace ? '-workspace' : '-project';
      
      let command = `xcodebuild ${projectFlag} "${projectPath}" -configuration ${configuration}`;
      
      if (scheme) {
        command += ` -scheme "${scheme}"`;
      }
      
      command += ' build';
      
      const { stdout, stderr } = await execAsync(command);
      
      // 빌드 결과 파싱
      const succeeded = stdout.includes('BUILD SUCCEEDED');
      const warnings = (stdout.match(/warning:/g) || []).length;
      const errors = (stdout.match(/error:/g) || []).length;
      
      return {
        content: [
          {
            type: 'text',
            text: `Build ${succeeded ? 'succeeded' : 'failed'}\n` +
                  `Warnings: ${warnings}\n` +
                  `Errors: ${errors}\n\n` +
                  `Output:\n${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Build failed: ${error.message}\n${error.stderr || ''}`,
          },
        ],
      };
    }
  }

  private async cleanProject(args: any) {
    const { projectPath } = args;
    
    try {
      const isWorkspace = projectPath.endsWith('.xcworkspace');
      const projectFlag = isWorkspace ? '-workspace' : '-project';
      
      const command = `xcodebuild ${projectFlag} "${projectPath}" clean`;
      const { stdout } = await execAsync(command);
      
      return {
        content: [
          {
            type: 'text',
            text: `Project cleaned successfully\n${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Clean failed: ${error.message}`,
          },
        ],
      };
    }
  }

  private async openInXcode(args: any) {
    const { path: filePath } = args;
    
    try {
      await execAsync(`open -a Xcode "${filePath}"`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Opened ${filePath} in Xcode`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to open in Xcode: ${error.message}`,
          },
        ],
      };
    }
  }

  private async listSchemes(args: any) {
    const { projectPath } = args;
    
    try {
      const isWorkspace = projectPath.endsWith('.xcworkspace');
      const projectFlag = isWorkspace ? '-workspace' : '-project';
      
      const command = `xcodebuild ${projectFlag} "${projectPath}" -list -json`;
      const { stdout } = await execAsync(command);
      
      const data = JSON.parse(stdout);
      const schemes = data.workspace?.schemes || data.project?.schemes || [];
      
      return {
        content: [
          {
            type: 'text',
            text: `Available schemes:\n${schemes.map((s: string) => `- ${s}`).join('\n')}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list schemes: ${error.message}`,
          },
        ],
      };
    }
  }
}