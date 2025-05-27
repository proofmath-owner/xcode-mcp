import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  BuildProjectArgs,
  CleanProjectArgs,
  OpenInXcodeArgs,
  ListSchemesArgs,
  ToolResponse,
  BuildResult,
  XcodeMCPError,
  ErrorCode,
  ArchiveProjectArgs,
  ManageSigningArgs,
} from '../types.js';
import {
  verifyXcodeInstallation,
  getProjectFlag,
  parseBuildOutput,
  isValidProjectPath,
  logger,
  PerformanceMonitor,
  getCodeSigningIdentities,
  getProvisioningProfiles,
} from '../utils.js';

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
          destination: {
            type: 'string',
            description: 'Build destination (e.g., "platform=iOS Simulator,name=iPhone 15")',
          },
          derivedDataPath: {
            type: 'string',
            description: 'Custom derived data path',
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
          scheme: {
            type: 'string',
            description: 'Scheme to clean (optional)',
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
    {
      name: 'archive_project',
      description: 'Archive an Xcode project for distribution',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj or .xcworkspace file',
          },
          scheme: {
            type: 'string',
            description: 'Scheme to archive',
          },
          archivePath: {
            type: 'string',
            description: 'Path to save the archive',
          },
          exportPath: {
            type: 'string',
            description: 'Path to export IPA (optional)',
          },
          exportOptionsPlist: {
            type: 'string',
            description: 'Path to export options plist (optional)',
          },
        },
        required: ['projectPath', 'scheme', 'archivePath'],
      },
    },
    {
      name: 'manage_signing',
      description: 'Manage code signing for a project',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: 'Path to .xcodeproj',
          },
          teamId: {
            type: 'string',
            description: 'Development team ID',
          },
          provisioningProfile: {
            type: 'string',
            description: 'Provisioning profile name or UUID',
          },
          codeSignIdentity: {
            type: 'string',
            description: 'Code signing identity',
          },
        },
        required: ['projectPath', 'teamId'],
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
    // Verify Xcode installation first
    await verifyXcodeInstallation();
    
    switch (toolName) {
      case 'build_project':
        return await this.buildProject(args as BuildProjectArgs);
      case 'clean_project':
        return await this.cleanProject(args as CleanProjectArgs);
      case 'open_in_xcode':
        return await this.openInXcode(args as OpenInXcodeArgs);
      case 'list_schemes':
        return await this.listSchemes(args as ListSchemesArgs);
      case 'archive_project':
        return await this.archiveProject(args as ArchiveProjectArgs);
      case 'manage_signing':
        return await this.manageSigning(args as ManageSigningArgs);
      default:
        throw new XcodeMCPError(`Unknown tool: ${toolName}`, ErrorCode.UNKNOWN_ERROR);
    }
  }

  private async buildProject(args: BuildProjectArgs): Promise<ToolResponse> {
    const { projectPath, scheme, configuration = 'Debug', destination, derivedDataPath } = args;
    
    // Validate project path
    if (!isValidProjectPath(projectPath)) {
      throw new XcodeMCPError(
        'Invalid project path. Must end with .xcodeproj or .xcworkspace',
        ErrorCode.INVALID_ARGUMENTS
      );
    }
    
    const monitor = new PerformanceMonitor();
    
    try {
      logger.info(`Building project: ${projectPath}`);
      monitor.mark('build-start');
      
      const projectFlag = getProjectFlag(projectPath);
      let command = `xcodebuild ${projectFlag} "${projectPath}" -configuration ${configuration}`;
      
      if (scheme) {
        command += ` -scheme "${scheme}"`;
      }
      
      if (destination) {
        command += ` -destination "${destination}"`;
      } else {
        // Default to iOS Simulator
        command += ` -destination "platform=iOS Simulator,name=iPhone 15"`;
      }
      
      if (derivedDataPath) {
        command += ` -derivedDataPath "${derivedDataPath}"`;
      }
      
      command += ' build -showBuildTimingSummary';
      
      logger.debug(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      monitor.mark('build-complete');
      
      // Parse build output
      const result = parseBuildOutput(stdout);
      const buildTime = monitor.measure('build-time', 'build-start');
      
      let outputMessage = `🔨 Build ${result.success ? '✅ SUCCEEDED' : '❌ FAILED'}\n\n`;
      outputMessage += `📊 Build Summary:\n`;
      outputMessage += `  • Configuration: ${configuration}\n`;
      outputMessage += `  • Warnings: ${result.warnings} ⚠️\n`;
      outputMessage += `  • Errors: ${result.errors} ❌\n`;
      outputMessage += `  • Duration: ${(buildTime / 1000).toFixed(2)}s ⏱️\n`;
      
      if (scheme) {
        outputMessage += `  • Scheme: ${scheme}\n`;
      }
      
      if (derivedDataPath) {
        outputMessage += `  • Derived Data: ${derivedDataPath}\n`;
        
        // Find build products
        try {
          const productsPath = path.join(derivedDataPath, 'Build', 'Products', `${configuration}-iphonesimulator`);
          const files = await fs.readdir(productsPath);
          const apps = files.filter(f => f.endsWith('.app'));
          
          if (apps.length > 0) {
            outputMessage += `\n📦 Build Products:\n`;
            apps.forEach(app => {
              outputMessage += `  • ${productsPath}/${app}\n`;
            });
          }
        } catch {
          // Ignore if products not found
        }
      }
      
      if (!result.success && stderr) {
        outputMessage += `\n❌ Build Errors:\n${stderr}`;
      }
      
      // Add build timing summary if available
      const timingSummary = stdout.match(/Build Timing Summary[\s\S]*?(?=\n\n|\n$)/);
      if (timingSummary) {
        outputMessage += `\n⏱️ ${timingSummary[0]}`;
      }
      
      logger.info(`Build completed in ${buildTime}ms`);
      
      return {
        content: [
          {
            type: 'text',
            text: outputMessage,
          },
        ],
      };
    } catch (error: any) {
      monitor.mark('build-error');
      logger.error(`Build failed: ${error.message}`);
      
      throw new XcodeMCPError(
        `Build failed: ${error.message}`,
        ErrorCode.BUILD_FAILED,
        { stderr: error.stderr }
      );
    }
  }

  private async cleanProject(args: CleanProjectArgs): Promise<ToolResponse> {
    const { projectPath, scheme } = args;
    
    if (!isValidProjectPath(projectPath)) {
      throw new XcodeMCPError(
        'Invalid project path',
        ErrorCode.INVALID_ARGUMENTS
      );
    }
    
    try {
      logger.info(`Cleaning project: ${projectPath}`);
      
      const projectFlag = getProjectFlag(projectPath);
      let command = `xcodebuild ${projectFlag} "${projectPath}" clean`;
      
      if (scheme) {
        command += ` -scheme "${scheme}"`;
      }
      
      const { stdout } = await execAsync(command);
      
      let message = `🧹 Project cleaned successfully!\n\n`;
      message += `📁 Project: ${path.basename(projectPath)}\n`;
      
      if (scheme) {
        message += `📋 Scheme: ${scheme}\n`;
      }
      
      // Clean derived data if exists
      try {
        const derivedDataPath = path.join(
          process.env.HOME || '',
          'Library/Developer/Xcode/DerivedData'
        );
        
        const projectName = path.basename(projectPath, path.extname(projectPath));
        const dirs = await fs.readdir(derivedDataPath);
        const projectDirs = dirs.filter(d => d.startsWith(projectName));
        
        if (projectDirs.length > 0) {
          message += `\n🗑️ Also cleaned derived data:\n`;
          for (const dir of projectDirs) {
            const fullPath = path.join(derivedDataPath, dir);
            await fs.rm(fullPath, { recursive: true, force: true });
            message += `  • ${dir}\n`;
          }
        }
      } catch {
        // Ignore errors in derived data cleanup
      }
      
      logger.info('Clean completed');
      
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Clean failed: ${error.message}`);
      throw new XcodeMCPError(
        `Clean failed: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async openInXcode(args: OpenInXcodeArgs): Promise<ToolResponse> {
    const { path: filePath } = args;
    
    try {
      logger.info(`Opening in Xcode: ${filePath}`);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new XcodeMCPError(
          `File not found: ${filePath}`,
          ErrorCode.PROJECT_NOT_FOUND
        );
      }
      
      await execAsync(`open -a Xcode "${filePath}"`);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Opened ${path.basename(filePath)} in Xcode`,
          },
        ],
      };
    } catch (error: any) {
      if (error.code === ErrorCode.PROJECT_NOT_FOUND) {
        throw error;
      }
      
      logger.error(`Failed to open in Xcode: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to open in Xcode: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async listSchemes(args: ListSchemesArgs): Promise<ToolResponse> {
    const { projectPath } = args;
    
    if (!isValidProjectPath(projectPath)) {
      throw new XcodeMCPError(
        'Invalid project path',
        ErrorCode.INVALID_ARGUMENTS
      );
    }
    
    try {
      logger.info(`Listing schemes for: ${projectPath}`);
      
      const projectFlag = getProjectFlag(projectPath);
      const command = `xcodebuild ${projectFlag} "${projectPath}" -list -json`;
      
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);
      
      const projectName = data.project?.name || data.workspace?.name || path.basename(projectPath);
      const schemes = data.project?.schemes || data.workspace?.schemes || [];
      const targets = data.project?.targets || [];
      const configurations = data.project?.configurations || [];
      
      let output = `📋 Project: ${projectName}\n\n`;
      
      if (schemes.length > 0) {
        output += `🎯 Schemes (${schemes.length}):\n`;
        schemes.forEach((scheme: string) => {
          output += `  • ${scheme}\n`;
        });
        output += '\n';
      }
      
      if (targets.length > 0) {
        output += `🎯 Targets (${targets.length}):\n`;
        targets.forEach((target: string) => {
          output += `  • ${target}\n`;
        });
        output += '\n';
      }
      
      if (configurations.length > 0) {
        output += `⚙️ Configurations (${configurations.length}):\n`;
        configurations.forEach((config: string) => {
          output += `  • ${config}\n`;
        });
      }
      
      if (schemes.length === 0 && targets.length === 0) {
        output += '⚠️ No schemes or targets found. The project might be misconfigured.';
      }
      
      logger.info(`Found ${schemes.length} schemes`);
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to list schemes: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to list schemes: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }

  private async archiveProject(args: ArchiveProjectArgs): Promise<ToolResponse> {
    const { projectPath, scheme, archivePath, exportPath, exportOptionsPlist } = args;
    
    const monitor = new PerformanceMonitor();
    
    try {
      logger.info(`Archiving project: ${projectPath}`);
      monitor.mark('archive-start');
      
      const projectFlag = getProjectFlag(projectPath);
      
      // Step 1: Archive
      let archiveCommand = `xcodebuild ${projectFlag} "${projectPath}" -scheme "${scheme}" -archivePath "${archivePath}" archive`;
      
      logger.debug(`Executing archive: ${archiveCommand}`);
      const { stdout: archiveOutput } = await execAsync(archiveCommand);
      
      monitor.mark('archive-complete');
      
      let output = `📦 Archive created successfully!\n`;
      output += `  • Archive: ${archivePath}.xcarchive\n`;
      
      // Step 2: Export IPA if requested
      if (exportPath && exportOptionsPlist) {
        monitor.mark('export-start');
        
        const exportCommand = `xcodebuild -exportArchive -archivePath "${archivePath}.xcarchive" -exportPath "${exportPath}" -exportOptionsPlist "${exportOptionsPlist}"`;
        
        logger.debug(`Executing export: ${exportCommand}`);
        await execAsync(exportCommand);
        
        monitor.mark('export-complete');
        
        output += `\n📱 IPA exported successfully!\n`;
        output += `  • Export: ${exportPath}\n`;
        
        // List exported files
        const exportedFiles = await fs.readdir(exportPath);
        const ipas = exportedFiles.filter(f => f.endsWith('.ipa'));
        
        if (ipas.length > 0) {
          output += `\n📲 Exported files:\n`;
          ipas.forEach(ipa => {
            output += `  • ${ipa}\n`;
          });
        }
      }
      
      const timing = monitor.getReport();
      output += `\n⏱️ Time taken: ${(timing.total / 1000).toFixed(2)}s`;
      
      logger.info('Archive completed');
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Archive failed: ${error.message}`);
      throw new XcodeMCPError(
        `Archive failed: ${error.message}`,
        ErrorCode.BUILD_FAILED
      );
    }
  }

  private async manageSigning(args: ManageSigningArgs): Promise<ToolResponse> {
    const { projectPath, teamId, provisioningProfile, codeSignIdentity } = args;
    
    try {
      logger.info(`Managing signing for: ${projectPath}`);
      
      // Get available identities and profiles
      const identities = await getCodeSigningIdentities();
      const profiles = await getProvisioningProfiles();
      
      let output = `🔐 Code Signing Management\n\n`;
      output += `📋 Project: ${path.basename(projectPath)}\n`;
      output += `👥 Team ID: ${teamId}\n\n`;
      
      if (identities.length > 0) {
        output += `🔑 Available Signing Identities (${identities.length}):\n`;
        identities.forEach(identity => {
          output += `  • ${identity}\n`;
        });
        output += '\n';
      }
      
      if (profiles.length > 0) {
        output += `📄 Available Provisioning Profiles (${profiles.length}):\n`;
        profiles.forEach(profile => {
          output += `  • ${profile.name} (${profile.uuid})\n`;
        });
        output += '\n';
      }
      
      // Build command to update signing
      let updateCommand = `xcodebuild -project "${projectPath}" -target all`;
      updateCommand += ` DEVELOPMENT_TEAM=${teamId}`;
      
      if (codeSignIdentity) {
        updateCommand += ` CODE_SIGN_IDENTITY="${codeSignIdentity}"`;
      }
      
      if (provisioningProfile) {
        updateCommand += ` PROVISIONING_PROFILE_SPECIFIER="${provisioningProfile}"`;
      }
      
      output += `💡 To apply these settings, run:\n`;
      output += `\`\`\`bash\n${updateCommand}\n\`\`\`\n`;
      
      output += `\n📝 Or add to your project's .xcconfig file:\n`;
      output += `\`\`\`\n`;
      output += `DEVELOPMENT_TEAM = ${teamId}\n`;
      if (codeSignIdentity) {
        output += `CODE_SIGN_IDENTITY = ${codeSignIdentity}\n`;
      }
      if (provisioningProfile) {
        output += `PROVISIONING_PROFILE_SPECIFIER = ${provisioningProfile}\n`;
      }
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
      logger.error(`Signing management failed: ${error.message}`);
      throw new XcodeMCPError(
        `Signing management failed: ${error.message}`,
        ErrorCode.UNKNOWN_ERROR
      );
    }
  }
}
