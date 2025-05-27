import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  ListSimulatorsArgs,
  BootSimulatorArgs,
  ShutdownSimulatorArgs,
  InstallAppArgs,
  LaunchAppArgs,
  ToolResponse,
  Simulator,
  XcodeMCPError,
  ErrorCode,
} from '../types.js';
import { logger, waitForSimulatorBoot } from '../utils.js';

const execAsync = promisify(exec);

export class SimulatorTools {
  private tools = [
    {
      name: 'list_simulators',
      description: 'List available iOS simulators',
      inputSchema: {
        type: 'object',
        properties: {
          showAll: {
            type: 'boolean',
            description: 'Show all simulators including unavailable ones',
            default: false,
          },
          runtime: {
            type: 'string',
            description: 'Filter by runtime (e.g., "iOS 17.0")',
          },
        },
      },
    },
    {
      name: 'boot_simulator',
      description: 'Boot a specific iOS simulator',
      inputSchema: {
        type: 'object',
        properties: {
          device: {
            type: 'string',
            description: 'Device name or UDID',
          },
        },
        required: ['device'],
      },
    },
    {
      name: 'shutdown_simulator',
      description: 'Shutdown a simulator',
      inputSchema: {
        type: 'object',
        properties: {
          device: {
            type: 'string',
            description: 'Device name or UDID (or "all" for all devices)',
          },
        },
        required: ['device'],
      },
    },
    {
      name: 'install_app',
      description: 'Install app on simulator',
      inputSchema: {
        type: 'object',
        properties: {
          device: {
            type: 'string',
            description: 'Device name or UDID',
          },
          appPath: {
            type: 'string',
            description: 'Path to .app bundle',
          },
        },
        required: ['device', 'appPath'],
      },
    },
    {
      name: 'launch_app',
      description: 'Launch app on simulator',
      inputSchema: {
        type: 'object',
        properties: {
          device: {
            type: 'string',
            description: 'Device name or UDID',
          },
          bundleId: {
            type: 'string',
            description: 'App bundle identifier',
          },
          arguments: {
            type: 'array',
            items: { type: 'string' },
            description: 'Launch arguments',
          },
        },
        required: ['device', 'bundleId'],
      },
    },
    {
      name: 'create_simulator',
      description: 'Create a new simulator device',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for the new simulator',
          },
          deviceType: {
            type: 'string',
            description: 'Device type (e.g., "iPhone 15 Pro")',
          },
          runtime: {
            type: 'string',
            description: 'iOS runtime version (e.g., "iOS 17.0")',
          },
        },
        required: ['name', 'deviceType'],
      },
    },
    {
      name: 'delete_simulator',
      description: 'Delete a simulator device',
      inputSchema: {
        type: 'object',
        properties: {
          device: {
            type: 'string',
            description: 'Device name or UDID',
          },
        },
        required: ['device'],
      },
    },
    {
      name: 'reset_simulator',
      description: 'Reset simulator to factory settings',
      inputSchema: {
        type: 'object',
        properties: {
          device: {
            type: 'string',
            description: 'Device name or UDID',
          },
        },
        required: ['device'],
      },
    },
    {
      name: 'capture_screenshot',
      description: 'Capture screenshot from simulator',
      inputSchema: {
        type: 'object',
        properties: {
          device: {
            type: 'string',
            description: 'Device name or UDID',
          },
          outputPath: {
            type: 'string',
            description: 'Path to save screenshot',
          },
          type: {
            type: 'string',
            description: 'Image type (png, jpeg, bmp, tiff, gif)',
            default: 'png',
          },
        },
        required: ['device', 'outputPath'],
      },
    },
    {
      name: 'record_video',
      description: 'Record video from simulator',
      inputSchema: {
        type: 'object',
        properties: {
          device: {
            type: 'string',
            description: 'Device name or UDID',
          },
          outputPath: {
            type: 'string',
            description: 'Path to save video',
          },
          duration: {
            type: 'number',
            description: 'Recording duration in seconds (optional)',
          },
        },
        required: ['device', 'outputPath'],
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
      case 'list_simulators':
        return await this.listSimulators(args as ListSimulatorsArgs);
      case 'boot_simulator':
        return await this.bootSimulator(args as BootSimulatorArgs);
      case 'shutdown_simulator':
        return await this.shutdownSimulator(args as ShutdownSimulatorArgs);
      case 'install_app':
        return await this.installApp(args as InstallAppArgs);
      case 'launch_app':
        return await this.launchApp(args as LaunchAppArgs);
      case 'create_simulator':
        return await this.createSimulator(args);
      case 'delete_simulator':
        return await this.deleteSimulator(args);
      case 'reset_simulator':
        return await this.resetSimulator(args);
      case 'capture_screenshot':
        return await this.captureScreenshot(args);
      case 'record_video':
        return await this.recordVideo(args);
      default:
        throw new XcodeMCPError(`Unknown tool: ${toolName}`, ErrorCode.UNKNOWN_ERROR);
    }
  }

  private async listSimulators(args: ListSimulatorsArgs): Promise<ToolResponse> {
    const { showAll = false, runtime } = args;
    
    try {
      logger.info('Listing simulators');
      
      const { stdout } = await execAsync('xcrun simctl list devices --json');
      const data = JSON.parse(stdout);
      
      let output = '📱 iOS Simulators\n\n';
      
      const simulators: Simulator[] = [];
      
      for (const [runtimeId, devices] of Object.entries(data.devices)) {
        const runtimeName = runtimeId.replace('com.apple.CoreSimulator.SimRuntime.', '');
        
        // Filter by runtime if specified
        if (runtime && !runtimeName.includes(runtime)) {
          continue;
        }
        
        const availableDevices = (devices as any[]).filter(d => 
          showAll || d.isAvailable
        );
        
        if (availableDevices.length > 0) {
          output += `\n🏷️ ${runtimeName}:\n`;
          
          for (const device of availableDevices) {
            const statusEmoji = device.state === 'Booted' ? '🟢' : '⚫';
            const availableEmoji = device.isAvailable ? '' : ' ⚠️';
            
            output += `  ${statusEmoji} ${device.name}${availableEmoji}\n`;
            output += `     UDID: ${device.udid}\n`;
            
            if (device.state !== 'Shutdown') {
              output += `     State: ${device.state}\n`;
            }
            
            simulators.push({
              name: device.name,
              udid: device.udid,
              state: device.state,
              runtime: runtimeName,
              deviceType: device.deviceTypeIdentifier,
              isAvailable: device.isAvailable,
            });
          }
        }
      }
      
      if (simulators.length === 0) {
        output += '⚠️ No simulators found. You may need to download simulators in Xcode.';
      } else {
        output += `\n\n📊 Summary: ${simulators.length} simulators found`;
        const booted = simulators.filter(s => s.state === 'Booted').length;
        if (booted > 0) {
          output += ` (${booted} running)`;
        }
      }
      
      // Add available device types
      try {
        const { stdout: typesOutput } = await execAsync('xcrun simctl list devicetypes --json');
        const typesData = JSON.parse(typesOutput);
        
        if (typesData.devicetypes && typesData.devicetypes.length > 0) {
          output += '\n\n📱 Available Device Types:';
          const latestTypes = typesData.devicetypes.slice(-10); // Show last 10
          latestTypes.forEach((type: any) => {
            output += `\n  • ${type.name}`;
          });
        }
      } catch {
        // Ignore errors getting device types
      }
      
      logger.info(`Found ${simulators.length} simulators`);
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to list simulators: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to list simulators: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async bootSimulator(args: BootSimulatorArgs): Promise<ToolResponse> {
    const { device } = args;
    
    try {
      logger.info(`Booting simulator: ${device}`);
      
      // Find device UDID
      const udid = await this.findDeviceUDID(device);
      const deviceInfo = await this.getDeviceInfo(udid);
      
      // Check if already booted
      if (deviceInfo.state === 'Booted') {
        return {
          content: [
            {
              type: 'text',
              text: `✅ Simulator "${deviceInfo.name}" is already booted`,
            },
          ],
        };
      }
      
      // Boot the simulator
      await execAsync(`xcrun simctl boot "${udid}"`);
      
      // Open Simulator.app
      await execAsync('open -a Simulator');
      
      // Wait for boot to complete
      await waitForSimulatorBoot(udid);
      
      return {
        content: [
          {
            type: 'text',
            text: `🚀 Successfully booted simulator: ${deviceInfo.name}\n` +
                  `📱 Device: ${deviceInfo.deviceType}\n` +
                  `🏷️ Runtime: ${deviceInfo.runtime}\n` +
                  `🔑 UDID: ${udid}`,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to boot simulator: ${error.message}`);
      
      if (error.message.includes('Unable to boot device in current state: Booted')) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ Simulator "${device}" is already booted`,
            },
          ],
        };
      }
      
      throw new XcodeMCPError(
        `Failed to boot simulator: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async shutdownSimulator(args: ShutdownSimulatorArgs): Promise<ToolResponse> {
    const { device } = args;
    
    try {
      logger.info(`Shutting down simulator: ${device}`);
      
      if (device === 'all') {
        await execAsync('xcrun simctl shutdown all');
        
        return {
          content: [
            {
              type: 'text',
              text: '🛑 All simulators have been shut down',
            },
          ],
        };
      }
      
      const udid = await this.findDeviceUDID(device);
      const deviceInfo = await this.getDeviceInfo(udid);
      
      await execAsync(`xcrun simctl shutdown "${udid}"`);
      
      return {
        content: [
          {
            type: 'text',
            text: `🛑 Successfully shut down simulator: ${deviceInfo.name}`,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to shutdown simulator: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to shutdown simulator: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async installApp(args: InstallAppArgs): Promise<ToolResponse> {
    const { device, appPath } = args;
    
    try {
      logger.info(`Installing app on simulator: ${device}`);
      
      // Check if app exists
      try {
        await fs.access(appPath);
      } catch {
        throw new XcodeMCPError(
          `App not found: ${appPath}`,
          ErrorCode.PROJECT_NOT_FOUND
        );
      }
      
      const udid = await this.findDeviceUDID(device);
      const deviceInfo = await this.getDeviceInfo(udid);
      
      // Ensure simulator is booted
      if (deviceInfo.state !== 'Booted') {
        logger.info('Booting simulator for installation');
        await execAsync(`xcrun simctl boot "${udid}"`);
        await waitForSimulatorBoot(udid);
      }
      
      // Install the app
      await execAsync(`xcrun simctl install "${udid}" "${appPath}"`);
      
      // Get app info
      const appName = path.basename(appPath, '.app');
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully installed app on ${deviceInfo.name}\n` +
                  `📱 App: ${appName}\n` +
                  `📂 Path: ${appPath}`,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to install app: ${error.message}`);
      
      if (error.code === ErrorCode.PROJECT_NOT_FOUND) {
        throw error;
      }
      
      throw new XcodeMCPError(
        `Failed to install app: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async launchApp(args: LaunchAppArgs): Promise<ToolResponse> {
    const { device, bundleId, arguments: launchArgs = [] } = args;
    
    try {
      logger.info(`Launching app on simulator: ${device}`);
      
      const udid = await this.findDeviceUDID(device);
      const deviceInfo = await this.getDeviceInfo(udid);
      
      // Ensure simulator is booted
      if (deviceInfo.state !== 'Booted') {
        logger.info('Booting simulator for launch');
        await execAsync(`xcrun simctl boot "${udid}"`);
        await execAsync('open -a Simulator');
        await waitForSimulatorBoot(udid);
      }
      
      // Build launch command
      let command = `xcrun simctl launch "${udid}" "${bundleId}"`;
      
      if (launchArgs.length > 0) {
        command += ` ${launchArgs.map(arg => `"${arg}"`).join(' ')}`;
      }
      
      const { stdout } = await execAsync(command);
      
      // Extract PID from output
      const pidMatch = stdout.match(/: (\d+)/);
      const pid = pidMatch ? pidMatch[1] : 'unknown';
      
      return {
        content: [
          {
            type: 'text',
            text: `🚀 Successfully launched ${bundleId} on ${deviceInfo.name}\n` +
                  `🔧 Process ID: ${pid}\n` +
                  (launchArgs.length > 0 ? `📝 Arguments: ${launchArgs.join(' ')}` : ''),
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to launch app: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to launch app: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async createSimulator(args: any): Promise<ToolResponse> {
    const { name, deviceType, runtime } = args;
    
    try {
      logger.info(`Creating simulator: ${name}`);
      
      // Get available device types and runtimes
      const { stdout: devicesOutput } = await execAsync('xcrun simctl list devicetypes --json');
      const { stdout: runtimesOutput } = await execAsync('xcrun simctl list runtimes --json');
      
      const devicesData = JSON.parse(devicesOutput);
      const runtimesData = JSON.parse(runtimesOutput);
      
      // Find device type identifier
      const deviceTypeObj = devicesData.devicetypes.find((d: any) => 
        d.name === deviceType || d.identifier.includes(deviceType)
      );
      
      if (!deviceTypeObj) {
        throw new XcodeMCPError(
          `Invalid device type: ${deviceType}`,
          ErrorCode.INVALID_ARGUMENTS
        );
      }
      
      // Find runtime identifier
      let runtimeId;
      if (runtime) {
        const runtimeObj = runtimesData.runtimes.find((r: any) => 
          r.name.includes(runtime) || r.identifier.includes(runtime)
        );
        
        if (!runtimeObj) {
          throw new XcodeMCPError(
            `Invalid runtime: ${runtime}`,
            ErrorCode.INVALID_ARGUMENTS
          );
        }
        
        runtimeId = runtimeObj.identifier;
      } else {
        // Use latest compatible runtime
        const compatibleRuntimes = runtimesData.runtimes.filter((r: any) => 
          r.supportedDeviceTypes.includes(deviceTypeObj.identifier)
        );
        
        if (compatibleRuntimes.length === 0) {
          throw new XcodeMCPError(
            'No compatible runtime found',
            ErrorCode.SIMULATOR_ERROR
          );
        }
        
        runtimeId = compatibleRuntimes[compatibleRuntimes.length - 1].identifier;
      }
      
      // Create the simulator
      const { stdout } = await execAsync(
        `xcrun simctl create "${name}" "${deviceTypeObj.identifier}" "${runtimeId}"`
      );
      
      const newUdid = stdout.trim();
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully created simulator!\n` +
                  `📱 Name: ${name}\n` +
                  `📐 Device: ${deviceTypeObj.name}\n` +
                  `🏷️ Runtime: ${runtimeId.split('.').pop()}\n` +
                  `🔑 UDID: ${newUdid}`,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to create simulator: ${error.message}`);
      
      if (error.code) {
        throw error;
      }
      
      throw new XcodeMCPError(
        `Failed to create simulator: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async deleteSimulator(args: any): Promise<ToolResponse> {
    const { device } = args;
    
    try {
      logger.info(`Deleting simulator: ${device}`);
      
      const udid = await this.findDeviceUDID(device);
      const deviceInfo = await this.getDeviceInfo(udid);
      
      // Shutdown if running
      if (deviceInfo.state === 'Booted') {
        await execAsync(`xcrun simctl shutdown "${udid}"`);
      }
      
      // Delete the simulator
      await execAsync(`xcrun simctl delete "${udid}"`);
      
      return {
        content: [
          {
            type: 'text',
            text: `🗑️ Successfully deleted simulator: ${deviceInfo.name}`,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to delete simulator: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to delete simulator: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async resetSimulator(args: any): Promise<ToolResponse> {
    const { device } = args;
    
    try {
      logger.info(`Resetting simulator: ${device}`);
      
      const udid = await this.findDeviceUDID(device);
      const deviceInfo = await this.getDeviceInfo(udid);
      
      // Shutdown if running
      if (deviceInfo.state === 'Booted') {
        await execAsync(`xcrun simctl shutdown "${udid}"`);
      }
      
      // Erase the simulator
      await execAsync(`xcrun simctl erase "${udid}"`);
      
      return {
        content: [
          {
            type: 'text',
            text: `🔄 Successfully reset simulator to factory settings: ${deviceInfo.name}`,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to reset simulator: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to reset simulator: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async captureScreenshot(args: any): Promise<ToolResponse> {
    const { device, outputPath, type = 'png' } = args;
    
    try {
      logger.info(`Capturing screenshot from simulator: ${device}`);
      
      const udid = await this.findDeviceUDID(device);
      const deviceInfo = await this.getDeviceInfo(udid);
      
      // Ensure simulator is booted
      if (deviceInfo.state !== 'Booted') {
        throw new XcodeMCPError(
          'Simulator must be booted to capture screenshot',
          ErrorCode.SIMULATOR_ERROR
        );
      }
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });
      
      // Capture screenshot
      await execAsync(`xcrun simctl io "${udid}" screenshot --type=${type} "${outputPath}"`);
      
      // Get file size
      const stats = await fs.stat(outputPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      return {
        content: [
          {
            type: 'text',
            text: `📸 Screenshot captured successfully!\n` +
                  `📱 Device: ${deviceInfo.name}\n` +
                  `💾 Saved to: ${outputPath}\n` +
                  `📏 Size: ${sizeMB} MB\n` +
                  `🖼️ Format: ${type.toUpperCase()}`,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to capture screenshot: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to capture screenshot: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async recordVideo(args: any): Promise<ToolResponse> {
    const { device, outputPath, duration } = args;
    
    try {
      logger.info(`Recording video from simulator: ${device}`);
      
      const udid = await this.findDeviceUDID(device);
      const deviceInfo = await this.getDeviceInfo(udid);
      
      // Ensure simulator is booted
      if (deviceInfo.state !== 'Booted') {
        throw new XcodeMCPError(
          'Simulator must be booted to record video',
          ErrorCode.SIMULATOR_ERROR
        );
      }
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });
      
      let message = `🎥 Video recording started!\n`;
      message += `📱 Device: ${deviceInfo.name}\n`;
      message += `💾 Will save to: ${outputPath}\n`;
      
      if (duration) {
        // Record for specific duration
        const recordCommand = `xcrun simctl io "${udid}" recordVideo --force "${outputPath}"`;
        const recordProcess = exec(recordCommand);
        
        setTimeout(() => {
          recordProcess.kill('SIGINT');
        }, duration * 1000);
        
        message += `⏱️ Recording for ${duration} seconds...\n`;
        message += `\n⚠️ Recording in progress. Video will be saved after ${duration} seconds.`;
      } else {
        message += `\n📝 To start recording, run:\n`;
        message += `\`\`\`bash\nxcrun simctl io "${udid}" recordVideo "${outputPath}"\n\`\`\`\n`;
        message += `\n🛑 Press Ctrl+C to stop recording.`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    } catch (error: any) {
      logger.error(`Failed to record video: ${error.message}`);
      throw new XcodeMCPError(
        `Failed to record video: ${error.message}`,
        ErrorCode.SIMULATOR_ERROR
      );
    }
  }

  private async findDeviceUDID(deviceNameOrUDID: string): Promise<string> {
    // Check if it's already a UDID
    if (deviceNameOrUDID.match(/^[A-F0-9]{8}-[A-F0-9-]+$/i)) {
      return deviceNameOrUDID;
    }
    
    // Find by device name
    const { stdout } = await execAsync('xcrun simctl list devices --json');
    const data = JSON.parse(stdout);
    
    for (const devices of Object.values(data.devices)) {
      const device = (devices as any[]).find(d => d.name === deviceNameOrUDID);
      if (device) {
        return device.udid;
      }
    }
    
    throw new XcodeMCPError(
      `Device not found: ${deviceNameOrUDID}`,
      ErrorCode.SIMULATOR_ERROR
    );
  }

  private async getDeviceInfo(udid: string): Promise<any> {
    const { stdout } = await execAsync('xcrun simctl list devices --json');
    const data = JSON.parse(stdout);
    
    for (const [runtime, devices] of Object.entries(data.devices)) {
      const device = (devices as any[]).find(d => d.udid === udid);
      if (device) {
        return {
          ...device,
          runtime: runtime.replace('com.apple.CoreSimulator.SimRuntime.', ''),
        };
      }
    }
    
    throw new XcodeMCPError(
      `Device not found: ${udid}`,
      ErrorCode.SIMULATOR_ERROR
    );
  }
}
