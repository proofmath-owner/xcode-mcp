import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  CreateXcodeProjectArgs,
  FindXcodeProjectsArgs,
  AnalyzeProjectStructureArgs,
  AddSwiftPackageArgs,
  ToolResponse,
  XcodeProjectStructure,
  XcodeTarget,
  ProjectDependency,
  FileStats,
  XcodeMCPError,
  ErrorCode,
} from '../types.js';
import {
  isValidBundleId,
  isValidProjectPath,
  ensureDirectoryExists,
  findFilesRecursive,
  fileExists,
  logger,
  generateGitignore,
  resolveSwiftPackageVersion,
} from '../utils.js';
import {
  PBXProjGenerator,
  generateSwiftUIApp,
  generateContentView,
  generateUIKitApp,
  generateViewController,
} from '../pbxproj-generator.js';

const execAsync = promisify(exec);

export class ProjectTools {
  private tools = [
    {
      name: 'create_xcode_project',
      description: 'Create a new Xcode project',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Project name',
          },
          path: {
            type: 'string',
            description: 'Directory to create project in',
          },
          template: {
            type: 'string',
            description: 'Project template: ios-app, macos-app, swiftui, uikit, framework, game, ar',
            default: 'ios-app',
          },
          bundleId: {
            type: 'string',
            description: 'Bundle identifier (e.g., com.example.app)',
          },
          organizationName: {
            type: 'string',
            description: 'Organization name',
          },
          deploymentTarget: {
            type: 'string',
            description: 'iOS deployment target (e.g., 17.0)',
            default: '17.0',
          },
          platforms: {
            type: 'array',
            items: { type: 'string' },
            description: 'Target platforms: iOS, macOS, watchOS, tvOS',
            default: ['iOS'],
          },
        },
        required: ['name', 'path', 'bundleId'],
      },
    },
    {
      name: 'find_xcode_projects',
      description: 'Find all Xcode projects in a directory',
      inputSchema: {
        type: 'object',
        properties: {
          searchPath: {
            type: 'string',
            description: 'Directory to search in',
            default: '.',
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum search depth',
            default: 5,
          },
        },
      },
    },
    {
      name: 'analyze_project_structure',
      description: 'Analyze Xcode project structure and dependencies',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj',
          },
          detailed: {
            type: 'boolean',
            description: 'Include detailed file analysis',
            default: false,
          },
        },
        required: ['projectPath'],
      },
    },
    {
      name: 'add_swift_package',
      description: 'Add Swift Package dependency to project',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj',
          },
          packageUrl: {
            type: 'string',
            description: 'Swift Package repository URL',
          },
          version: {
            type: 'string',
            description: 'Version requirement (e.g., "1.0.0" or "main")',
          },
          branch: {
            type: 'string',
            description: 'Branch name (alternative to version)',
          },
          exactVersion: {
            type: 'string',
            description: 'Exact version to use',
          },
          target: {
            type: 'string',
            description: 'Target to add the package to',
          },
        },
        required: ['projectPath', 'packageUrl'],
      },
    },
    {
      name: 'remove_swift_package',
      description: 'Remove Swift Package dependency from project',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj',
          },
          packageUrl: {
            type: 'string',
            description: 'Swift Package repository URL to remove',
          },
        },
        required: ['projectPath', 'packageUrl'],
      },
    },
    {
      name: 'list_swift_packages',
      description: 'List all Swift Package dependencies in a project',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj',
          },
        },
        required: ['projectPath'],
      },
    },
    {
      name: 'update_project_settings',
      description: 'Update project build settings',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj',
          },
          settings: {
            type: 'object',
            description: 'Build settings to update',
          },
          target: {
            type: 'string',
            description: 'Specific target to update (optional)',
          },
        },
        required: ['projectPath', 'settings'],
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
      case 'create_xcode_project':
        return await this.createXcodeProject(args as CreateXcodeProjectArgs);
      case 'find_xcode_projects':
        return await this.findXcodeProjects(args as FindXcodeProjectsArgs);
      case 'analyze_project_structure':
        return await this.analyzeProjectStructure(args as AnalyzeProjectStructureArgs);
      case 'add_swift_package':
        return await this.addSwiftPackage(args as AddSwiftPackageArgs);
      case 'remove_swift_package':
        return await this.removeSwiftPackage(args);
      case 'list_swift_packages':
        return await this.listSwiftPackages(args);
      case 'update_project_settings':
        return await this.updateProjectSettings(args);
      default:
        throw new XcodeMCPError(`Unknown tool: ${toolName}`, ErrorCode.UNKNOWN_ERROR);
    }
  }

  async listProjects(): Promise<any[]> {
    try {
      const homeDir = process.env.HOME || '~';
      const searchPaths = [
        path.join(homeDir, 'Developer'),
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Projects'),
        path.join(homeDir, 'Code'),
      ];
      
      const projects: any[] = [];
      
      for (const searchPath of searchPaths) {
        try {
          await fs.access(searchPath);
          const projectPaths = await this.findProjectsRecursive(searchPath, '.xcodeproj', 3);
          
          for (const projectPath of projectPaths) {
            const name = path.basename(projectPath, '.xcodeproj');
            projects.push({
              name,
              path: projectPath,
              directory: path.dirname(projectPath),
            });
          }
        } catch {
          // Directory doesn't exist
        }
      }
      
      return projects;
    } catch (error) {
      logger.error('Failed to list projects', error);
      return [];
    }
  }

  private async createXcodeProject(args: CreateXcodeProjectArgs): Promise<ToolResponse> {
    const {
      name,
      path: projectPath,
      template = 'ios-app',
      bundleId,
      organizationName = '',
      deploymentTarget = '17.0',
      platforms = ['iOS'],
    } = args;
    
    try {
      logger.info(`Creating Xcode project: ${name}`);
      
      // Validate bundle ID
      if (!isValidBundleId(bundleId)) {
        throw new XcodeMCPError(
          'Invalid bundle identifier. Use format: com.example.app',
          ErrorCode.INVALID_ARGUMENTS
        );
      }
      
      // Create project directory
      const fullPath = path.join(projectPath, name);
      await ensureDirectoryExists(fullPath);
      
      // Create project structure
      const projectFile = path.join(fullPath, `${name}.xcodeproj`);
      await ensureDirectoryExists(projectFile);
      
      // Create source directories
      const sourcePath = path.join(fullPath, name);
      await ensureDirectoryExists(sourcePath);
      await ensureDirectoryExists(path.join(sourcePath, 'Assets.xcassets'));
      await ensureDirectoryExists(path.join(sourcePath, 'Preview Content'));
      
      // Generate project.pbxproj
      const pbxGenerator = new PBXProjGenerator(name, bundleId);
      const pbxContent = pbxGenerator.generate();
      
      await fs.writeFile(
        path.join(projectFile, 'project.pbxproj'),
        pbxContent,
        'utf8'
      );
      
      // Create xcshareddata
      const sharedDataPath = path.join(projectFile, 'project.xcworkspace', 'xcshareddata');
      await ensureDirectoryExists(sharedDataPath);
      
      // Create IDEWorkspaceChecks.plist
      const workspaceChecks = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>IDEDidComputeMac32BitWarning</key>
    <true/>
</dict>
</plist>`;
      
      await fs.writeFile(
        path.join(sharedDataPath, 'IDEWorkspaceChecks.plist'),
        workspaceChecks,
        'utf8'
      );
      
      // Create WorkspaceSettings.xcsettings
      const workspaceSettings = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>BuildLocationStyle</key>
    <string>UseAppPreferences</string>
    <key>CustomBuildLocationType</key>
    <string>RelativeToDerivedData</string>
    <key>DerivedDataLocationStyle</key>
    <string>Default</string>
    <key>ShowSharedSchemesAutomaticallyEnabled</key>
    <true/>
</dict>
</plist>`;
      
      await fs.writeFile(
        path.join(sharedDataPath, 'WorkspaceSettings.xcsettings'),
        workspaceSettings,
        'utf8'
      );
      
      // Create schemes directory
      const schemesPath = path.join(projectFile, 'xcshareddata', 'xcschemes');
      await ensureDirectoryExists(schemesPath);
      
      // Create Info.plist
      const infoPlist = this.getInfoPlistTemplate(name, bundleId, deploymentTarget);
      await fs.writeFile(
        path.join(sourcePath, 'Info.plist'),
        infoPlist,
        'utf8'
      );
      
      // Create source files based on template
      if (template === 'swiftui' || template === 'ios-app') {
        // App.swift
        await fs.writeFile(
          path.join(sourcePath, 'App.swift'),
          generateSwiftUIApp(name),
          'utf8'
        );
        
        // ContentView.swift
        await fs.writeFile(
          path.join(sourcePath, 'ContentView.swift'),
          generateContentView(name),
          'utf8'
        );
      } else if (template === 'uikit') {
        // AppDelegate.swift
        await fs.writeFile(
          path.join(sourcePath, 'AppDelegate.swift'),
          generateUIKitApp(name),
          'utf8'
        );
        
        // ViewController.swift
        await fs.writeFile(
          path.join(sourcePath, 'ViewController.swift'),
          generateViewController(),
          'utf8'
        );
      }
      
      // Create .gitignore
      await fs.writeFile(
        path.join(fullPath, '.gitignore'),
        generateGitignore(),
        'utf8'
      );
      
      // Create README.md
      const readme = `# ${name}

A new ${template} project created with Xcode MCP.

## Requirements

- iOS ${deploymentTarget}+
- Xcode 15.0+
- Swift 5.9+

## Installation

1. Open \`${name}.xcodeproj\` in Xcode
2. Select your target device or simulator
3. Press ⌘R to build and run

## Features

- ${template === 'swiftui' ? 'SwiftUI-based UI' : 'UIKit-based UI'}
- Modern Swift practices
- Ready for production

## License

Copyright © ${new Date().getFullYear()} ${organizationName || 'Your Organization'}. All rights reserved.
`;
      
      await fs.writeFile(
        path.join(fullPath, 'README.md'),
        readme,
        'utf8'
      );
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully created Xcode project!\n\n` +
                  `📱 Project: ${name}\n` +
                  `📁 Location: ${fullPath}\n` +
                  `🆔 Bundle ID: ${bundleId}\n` +
                  `📋 Template: ${template}\n` +
                  `🎯 Deployment Target: iOS ${deploymentTarget}\n` +
                  `🏢 Organization: ${organizationName || 'Not specified'}\n\n` +
                  `📂 Structure:\n` +
                  `  • ${name}.xcodeproj/\n` +
                  `  • ${name}/\n` +
                  `    • App.swift\n` +
                  `    • ContentView.swift\n` +
                  `    • Assets.xcassets/\n` +
                  `    • Info.plist\n` +
                  `  • README.md\n` +
                  `  • .gitignore\n\n` +
                  `🚀 Next steps:\n` +
                  `  1. Open in Xcode: open "${projectFile}"\n` +
                  `  2. Select a simulator or device\n` +
                  `  3. Press ⌘R to run`,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to create project: ${error.message}`);
      
      if (error.code) {
        throw error;
      }
      
      throw new XcodeMCPError(
        `Failed to create project: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async findXcodeProjects(args: FindXcodeProjectsArgs): Promise<ToolResponse> {
    const { searchPath = '.', maxDepth = 5 } = args;
    
    try {
      logger.info(`Searching for Xcode projects in: ${searchPath}`);
      
      const projectFiles = await this.findProjectsRecursive(searchPath, '.xcodeproj', maxDepth);
      const workspaceFiles = await this.findProjectsRecursive(searchPath, '.xcworkspace', maxDepth);
      
      const projects: Array<{ name: string; path: string; type: string }> = [];
      
      projectFiles.forEach(file => {
        projects.push({
          name: path.basename(file, '.xcodeproj'),
          path: file,
          type: 'project',
        });
      });
      
      workspaceFiles.forEach(file => {
        projects.push({
          name: path.basename(file, '.xcworkspace'),
          path: file,
          type: 'workspace',
        });
      });
      
      // Sort by name
      projects.sort((a, b) => a.name.localeCompare(b.name));
      
      let output = `🔍 Found ${projects.length} Xcode project(s)\n\n`;
      
      if (projects.length === 0) {
        output += '⚠️ No Xcode projects found in the specified directory.\n';
        output += `📁 Search path: ${path.resolve(searchPath)}\n`;
        output += `🔍 Max depth: ${maxDepth}`;
      } else {
        // Group by type
        const projectsByType = projects.reduce((acc, proj) => {
          if (!acc[proj.type]) acc[proj.type] = [];
          acc[proj.type].push(proj);
          return acc;
        }, {} as Record<string, typeof projects>);
        
        if (projectsByType.project) {
          output += `📘 Projects (.xcodeproj) - ${projectsByType.project.length}:\n`;
          projectsByType.project.forEach(proj => {
            const relativePath = path.relative(searchPath, proj.path);
            output += `  • ${proj.name}\n`;
            output += `    📁 ${relativePath}\n\n`;
          });
        }
        
        if (projectsByType.workspace) {
          output += `📙 Workspaces (.xcworkspace) - ${projectsByType.workspace.length}:\n`;
          projectsByType.workspace.forEach(proj => {
            const relativePath = path.relative(searchPath, proj.path);
            output += `  • ${proj.name}\n`;
            output += `    📁 ${relativePath}\n\n`;
          });
        }
      }
      
      logger.info(`Found ${projects.length} projects`);
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to find projects: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to find projects: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async analyzeProjectStructure(args: AnalyzeProjectStructureArgs): Promise<ToolResponse> {
    const { projectPath, detailed = false } = args;
    
    if (!isValidProjectPath(projectPath)) {
      throw new XcodeMCPError(
        'Invalid project path',
        ErrorCode.INVALID_ARGUMENTS
      );
    }
    
    try {
      logger.info(`Analyzing project: ${projectPath}`);
      
      // Get project info
      const { stdout: projectInfo } = await execAsync(
        `xcodebuild -project "${projectPath}" -list -json`
      );
      const projectData = JSON.parse(projectInfo);
      
      // Analyze directory structure
      const projectDir = path.dirname(projectPath);
      const files = await this.analyzeDirectory(projectDir);
      
      // Check for dependencies
      const dependencies = await this.detectDependencies(projectPath, projectDir);
      
      let output = `📊 Project Analysis\n\n`;
      output += `📱 Project: ${path.basename(projectPath, '.xcodeproj')}\n`;
      output += `📁 Location: ${projectDir}\n\n`;
      
      // Targets
      if (projectData.project?.targets && projectData.project.targets.length > 0) {
        output += `🎯 Targets (${projectData.project.targets.length}):\n`;
        projectData.project.targets.forEach((target: string) => {
          output += `  • ${target}\n`;
        });
        output += '\n';
      }
      
      // Schemes
      if (projectData.project?.schemes && projectData.project.schemes.length > 0) {
        output += `📋 Schemes (${projectData.project.schemes.length}):\n`;
        projectData.project.schemes.forEach((scheme: string) => {
          output += `  • ${scheme}\n`;
        });
        output += '\n';
      }
      
      // Configurations
      if (projectData.project?.configurations && projectData.project.configurations.length > 0) {
        output += `⚙️ Configurations (${projectData.project.configurations.length}):\n`;
        projectData.project.configurations.forEach((config: string) => {
          output += `  • ${config}\n`;
        });
        output += '\n';
      }
      
      // File statistics
      output += `📂 File Statistics:\n`;
      output += `  • Swift files: ${files.swift} 🔶\n`;
      output += `  • Objective-C: ${files.objc} 📘\n`;
      output += `  • Storyboards: ${files.storyboards} 🎨\n`;
      output += `  • XIBs: ${files.xibs} 📐\n`;
      output += `  • Assets: ${files.assets} 🖼️\n`;
      
      // Dependencies
      if (dependencies.length > 0) {
        output += `\n📦 Dependencies:\n`;
        dependencies.forEach(dep => {
          output += `  • ${dep.type}: ${dep.name}`;
          if (dep.version) output += ` (${dep.version})`;
          output += '\n';
        });
      }
      
      // Detailed file listing
      if (detailed) {
        output += `\n📄 Swift Files:\n`;
        const swiftFiles = await findFilesRecursive(projectDir, /\.swift$/);
        swiftFiles.slice(0, 20).forEach(file => {
          const relativePath = path.relative(projectDir, file);
          output += `  • ${relativePath}\n`;
        });
        if (swiftFiles.length > 20) {
          output += `  ... and ${swiftFiles.length - 20} more\n`;
        }
      }
      
      // Build settings info
      try {
        const { stdout: buildSettings } = await execAsync(
          `xcodebuild -project "${projectPath}" -showBuildSettings -json | head -100`
        );
        
        if (buildSettings) {
          const settings = JSON.parse(buildSettings);
          if (settings.length > 0 && settings[0].buildSettings) {
            const bs = settings[0].buildSettings;
            output += `\n🏗️ Key Build Settings:\n`;
            output += `  • SDK: ${bs.SDK_NAME || 'Not specified'}\n`;
            output += `  • Swift Version: ${bs.SWIFT_VERSION || 'Not specified'}\n`;
            output += `  • Deployment Target: ${bs.IPHONEOS_DEPLOYMENT_TARGET || 'Not specified'}\n`;
          }
        }
      } catch {
        // Ignore build settings errors
      }
      
      logger.info('Project analysis completed');
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to analyze project: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to analyze project: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async addSwiftPackage(args: AddSwiftPackageArgs): Promise<ToolResponse> {
    const { projectPath, packageUrl, version, branch, exactVersion, target } = args;
    
    if (!isValidProjectPath(projectPath)) {
      throw new XcodeMCPError(
        'Invalid project path',
        ErrorCode.INVALID_ARGUMENTS
      );
    }
    
    try {
      logger.info(`Adding Swift Package to project: ${packageUrl}`);
      
      // Resolve version requirement
      let versionRequirement = '';
      if (exactVersion) {
        versionRequirement = exactVersion;
      } else if (branch) {
        versionRequirement = branch;
      } else if (version) {
        versionRequirement = version;
      } else {
        versionRequirement = await resolveSwiftPackageVersion(packageUrl);
      }
      
      // Create Package.resolved directory if it doesn't exist
      const packageResolvedDir = path.join(
        projectPath,
        'project.xcworkspace',
        'xcshareddata',
        'swiftpm'
      );
      await ensureDirectoryExists(packageResolvedDir);
      
      // Use swift package command to add dependency
      const projectDir = path.dirname(projectPath);
      
      // First, check if Package.swift exists
      const packageSwiftPath = path.join(projectDir, 'Package.swift');
      const hasPackageSwift = await fileExists(packageSwiftPath);
      
      if (hasPackageSwift) {
        // Use swift package commands
        let addCommand = `cd "${projectDir}" && swift package add-dependency ${packageUrl}`;
        
        if (branch) {
          addCommand += ` --branch ${branch}`;
        } else if (exactVersion) {
          addCommand += ` --exact ${exactVersion}`;
        } else if (version) {
          addCommand += ` --from-version ${version}`;
        }
        
        await execAsync(addCommand);
        await execAsync(`cd "${projectDir}" && swift package resolve`);
      } else {
        // Use xcodebuild to resolve packages
        await execAsync(
          `xcodebuild -project "${projectPath}" -resolvePackageDependencies`
        );
      }
      
      // Read Package.resolved to confirm
      const packageResolvedPath = path.join(packageResolvedDir, 'Package.resolved');
      let addedPackages: string[] = [];
      
      if (await fileExists(packageResolvedPath)) {
        const resolvedContent = await fs.readFile(packageResolvedPath, 'utf8');
        const resolved = JSON.parse(resolvedContent);
        
        if (resolved.pins) {
          addedPackages = resolved.pins
            .filter((pin: any) => pin.location === packageUrl)
            .map((pin: any) => `${pin.identity} @ ${pin.state.version || pin.state.branch || 'unknown'}`);
        }
      }
      
      let output = `📦 Swift Package Management\n\n`;
      output += `✅ Successfully added package!\n\n`;
      output += `📍 Package URL: ${packageUrl}\n`;
      output += `🏷️ Version: ${versionRequirement}\n`;
      
      if (target) {
        output += `🎯 Target: ${target}\n`;
      }
      
      if (addedPackages.length > 0) {
        output += `\n📋 Resolved packages:\n`;
        addedPackages.forEach(pkg => {
          output += `  • ${pkg}\n`;
        });
      }
      
      output += `\n💡 Next steps:\n`;
      output += `  1. Open project in Xcode\n`;
      output += `  2. Wait for package resolution\n`;
      output += `  3. Import the package in your Swift files:\n`;
      output += `     import ${path.basename(packageUrl, '.git')}\n`;
      
      output += `\n📝 To use in your target:\n`;
      output += `  1. Select your target in Xcode\n`;
      output += `  2. Go to "Frameworks, Libraries, and Embedded Content"\n`;
      output += `  3. Click "+" and select the package product\n`;
      
      logger.info('Swift Package added successfully');
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to add Swift Package: ${error.message}`);
      
      // Provide helpful error messages
      if (error.message.includes('swift package')) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ Direct Swift Package manipulation requires manual steps:\n\n` +
                    `1. Open "${projectPath}" in Xcode\n` +
                    `2. Select File → Add Package Dependencies...\n` +
                    `3. Enter package URL: ${packageUrl}\n` +
                    `4. Choose version: ${version || branch || 'Up to Next Major'}\n` +
                    `5. Add to target: ${target || 'your app target'}\n\n` +
                    `Alternative: Convert to Swift Package project structure first.`,
            },
          ],
        };
      }
      
      throw new XcodeMCPError(
        `Failed to add Swift Package: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async removeSwiftPackage(args: any): Promise<ToolResponse> {
    const { projectPath, packageUrl } = args;
    
    try {
      logger.info(`Removing Swift Package: ${packageUrl}`);
      
      const projectDir = path.dirname(projectPath);
      const packageSwiftPath = path.join(projectDir, 'Package.swift');
      
      if (await fileExists(packageSwiftPath)) {
        // Use swift package remove
        await execAsync(
          `cd "${projectDir}" && swift package remove-dependency ${packageUrl}`
        );
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Package removed successfully!\n\n` +
                  `📦 Removed: ${packageUrl}\n\n` +
                  `💡 Note: You may need to:\n` +
                  `  1. Remove imports from your Swift files\n` +
                  `  2. Clean build folder (⇧⌘K in Xcode)\n` +
                  `  3. Resolve packages again`,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to remove package: ${error.message}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ To remove a Swift Package:\n\n` +
                  `1. Open "${projectPath}" in Xcode\n` +
                  `2. Select the project in the navigator\n` +
                  `3. Select "Package Dependencies" tab\n` +
                  `4. Select "${packageUrl}"\n` +
                  `5. Click the "-" button to remove`,
          },
        ],
      };
    }
  }

  private async listSwiftPackages(args: any): Promise<ToolResponse> {
    const { projectPath } = args;
    
    try {
      logger.info(`Listing Swift Packages for: ${projectPath}`);
      
      // Check Package.resolved
      const packageResolvedPath = path.join(
        projectPath,
        'project.xcworkspace',
        'xcshareddata',
        'swiftpm',
        'Package.resolved'
      );
      
      const packages: any[] = [];
      
      if (await fileExists(packageResolvedPath)) {
        const content = await fs.readFile(packageResolvedPath, 'utf8');
        const resolved = JSON.parse(content);
        
        if (resolved.pins) {
          resolved.pins.forEach((pin: any) => {
            packages.push({
              name: pin.identity,
              url: pin.location,
              version: pin.state.version || pin.state.branch || pin.state.revision || 'unknown',
            });
          });
        }
      }
      
      let output = `📦 Swift Packages\n\n`;
      
      if (packages.length === 0) {
        output += '⚠️ No Swift Packages found in this project.\n\n';
        output += 'To add packages:\n';
        output += '  1. Use the add_swift_package tool\n';
        output += '  2. Or open in Xcode → File → Add Package Dependencies';
      } else {
        output += `Found ${packages.length} package(s):\n\n`;
        
        packages.forEach((pkg, index) => {
          output += `${index + 1}. ${pkg.name}\n`;
          output += `   📍 URL: ${pkg.url}\n`;
          output += `   🏷️ Version: ${pkg.version}\n\n`;
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
    } catch (error: any) {
      logger.error(`Failed to list packages: ${error.message}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Could not read package information.\n\n` +
                  `This might be because:\n` +
                  `  • No packages are installed\n` +
                  `  • The project hasn't been opened in Xcode yet\n` +
                  `  • Package resolution hasn't been run\n\n` +
                  `Try opening the project in Xcode first.`,
          },
        ],
      };
    }
  }

  private async updateProjectSettings(args: any): Promise<ToolResponse> {
    const { projectPath, settings, target } = args;
    
    try {
      logger.info(`Updating project settings: ${projectPath}`);
      
      let output = `⚙️ Project Settings Update\n\n`;
      
      // Build xcodebuild command
      let command = `xcodebuild -project "${projectPath}"`;
      
      if (target) {
        command += ` -target "${target}"`;
      }
      
      // Add each setting
      const settingsList: string[] = [];
      for (const [key, value] of Object.entries(settings)) {
        command += ` ${key}="${value}"`;
        settingsList.push(`${key} = ${value}`);
      }
      
      output += `📝 Settings to apply:\n`;
      settingsList.forEach(setting => {
        output += `  • ${setting}\n`;
      });
      
      output += `\n💡 To apply these settings:\n\n`;
      output += `1. Using xcodebuild:\n`;
      output += `   \`\`\`bash\n   ${command}\n   \`\`\`\n\n`;
      
      output += `2. Using .xcconfig file:\n`;
      output += `   Create a file named "Config.xcconfig" with:\n`;
      output += `   \`\`\`\n${settingsList.join('\n')}\n   \`\`\`\n\n`;
      
      output += `3. In Xcode:\n`;
      output += `   • Select your project\n`;
      output += `   • Go to Build Settings\n`;
      output += `   • Search and update each setting\n`;
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to update settings: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to update settings: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async analyzeDirectory(dir: string): Promise<FileStats> {
    const stats: FileStats = {
      swift: 0,
      objc: 0,
      storyboards: 0,
      xibs: 0,
      assets: 0,
      total: 0,
      localizationFiles: 0,
      configFiles: 0,
    };
    
    try {
      const files = await findFilesRecursive(dir, /\.(swift|m|h|storyboard|xib|xcassets|strings|plist|xcconfig)$/);
      
      stats.total = files.length;
      stats.swift = files.filter(f => f.endsWith('.swift')).length;
      stats.objc = files.filter(f => f.endsWith('.m') || f.endsWith('.h')).length;
      stats.storyboards = files.filter(f => f.endsWith('.storyboard')).length;
      stats.xibs = files.filter(f => f.endsWith('.xib')).length;
      stats.assets = files.filter(f => f.endsWith('.xcassets')).length;
      stats.localizationFiles = files.filter(f => f.endsWith('.strings')).length;
      stats.configFiles = files.filter(f => f.endsWith('.xcconfig')).length;
    } catch (error) {
      logger.warn('Error analyzing directory', error);
    }
    
    return stats;
  }

  private async findProjectsRecursive(
    dir: string,
    extension: string,
    maxDepth: number = 5,
    currentDepth: number = 0
  ): Promise<string[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }
    
    const results: string[] = [];
    const ignoreDirs = [
      'node_modules',
      'Library',
      'Pods',
      '.git',
      'build',
      'DerivedData',
      '.Trash',
      'Applications',
      'System',
    ];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (entry.name.endsWith(extension)) {
            results.push(fullPath);
          } else if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            // Recursively search subdirectories
            const subResults = await this.findProjectsRecursive(
              fullPath,
              extension,
              maxDepth,
              currentDepth + 1
            );
            results.push(...subResults);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return results;
  }

  private async detectDependencies(
    projectPath: string,
    projectDir: string
  ): Promise<ProjectDependency[]> {
    const dependencies: ProjectDependency[] = [];
    
    // Check for Swift Packages
    const packageResolvedPath = path.join(
      projectPath,
      'project.xcworkspace',
      'xcshareddata',
      'swiftpm',
      'Package.resolved'
    );
    
    if (await fileExists(packageResolvedPath)) {
      try {
        const content = await fs.readFile(packageResolvedPath, 'utf8');
        const resolved = JSON.parse(content);
        
        if (resolved.pins) {
          resolved.pins.forEach((pin: any) => {
            dependencies.push({
              type: 'swiftPackage',
              name: pin.identity,
              version: pin.state.version || pin.state.branch || 'latest',
              source: pin.location,
            });
          });
        }
      } catch {
        // Ignore parsing errors
      }
    }
    
    // Check for CocoaPods
    const podfilePath = path.join(projectDir, 'Podfile');
    if (await fileExists(podfilePath)) {
      dependencies.push({
        type: 'cocoapods',
        name: 'CocoaPods',
        version: 'Podfile present',
      });
      
      // Try to parse Podfile.lock for actual pods
      const podfileLockPath = path.join(projectDir, 'Podfile.lock');
      if (await fileExists(podfileLockPath)) {
        try {
          const lockContent = await fs.readFile(podfileLockPath, 'utf8');
          const podMatches = lockContent.match(/^\s*- (\w+)\s*\((.+?)\)/gm);
          
          if (podMatches) {
            podMatches.slice(0, 5).forEach(match => {
              const [, name, version] = match.match(/^\s*- (\w+)\s*\((.+?)\)/) || [];
              if (name && version) {
                dependencies.push({
                  type: 'cocoapods',
                  name,
                  version,
                });
              }
            });
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
    
    // Check for Carthage
    const cartfilePath = path.join(projectDir, 'Cartfile');
    if (await fileExists(cartfilePath)) {
      dependencies.push({
        type: 'carthage',
        name: 'Carthage',
        version: 'Cartfile present',
      });
    }
    
    return dependencies;
  }

  private getInfoPlistTemplate(appName: string, bundleId: string, deploymentTarget: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>${bundleId}</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>${appName}</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <false/>
        <key>UISceneConfigurations</key>
        <dict>
            <key>UIWindowSceneSessionRoleApplication</key>
            <array>
                <dict>
                    <key>UISceneConfigurationName</key>
                    <string>Default Configuration</string>
                    <key>UISceneDelegateClassName</key>
                    <string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
                </dict>
            </array>
        </dict>
    </dict>
    <key>UILaunchScreen</key>
    <dict>
        <key>UIColorName</key>
        <string>AccentColor</string>
        <key>UIImageName</key>
        <string>AppIcon</string>
    </dict>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>armv7</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    <key>MinimumOSVersion</key>
    <string>${deploymentTarget}</string>
</dict>
</plist>`;
  }
}
