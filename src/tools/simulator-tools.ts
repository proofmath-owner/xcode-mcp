import { exec } from 'child_process';
import { promisify } from 'util';

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
        },
        required: ['device', 'bundleId'],
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
      case 'list_simulators':
        return await this.listSimulators(args);
      case 'boot_simulator':
        return await this.bootSimulator(args);
      case 'shutdown_simulator':
        return await this.shutdownSimulator(args);
      case 'install_app':
        return await this.installApp(args);
      case 'launch_app':
        return await this.launchApp(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async listSimulators(args: any) {
    const { showAll = false } = args;
    
    try {
      const { stdout } = await execAsync('xcrun simctl list devices --json');
      const data = JSON.parse(stdout);
      
      let output = '';
      for (const [runtime, devices] of Object.entries(data.devices)) {
        const runtimeName = runtime.replace('com.apple.CoreSimulator.SimRuntime.', '');
        const availableDevices = (devices as any[]).filter(d => 
          showAll || d.isAvailable
        );
        
        if (availableDevices.length > 0) {
          output += `\n${runtimeName}:\n`;
          for (const device of availableDevices) {
            const status = device.state === 'Booted' ? ' (Booted)' : '';
            output += `  - ${device.name} (${device.udid})${status}\n`;
          }
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Available Simulators:${output}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list simulators: ${error.message}`,
          },
        ],
      };
    }
  }

  private async bootSimulator(args: any) {
    const { device } = args;
    
    try {
      // 먼저 디바이스 UDID 찾기
      const udid = await this.findDeviceUDID(device);
      
      // 시뮬레이터 부팅
      await execAsync(`xcrun simctl boot "${udid}"`);
      
      // Simulator.app 열기
      await execAsync('open -a Simulator');
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully booted simulator: ${device}`,
          },
        ],
      };
    } catch (error: any) {
      if (error.message.includes('Unable to boot device in current state: Booted')) {
        return {
          content: [
            {
              type: 'text',
              text: `Simulator ${device} is already booted`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: `Failed to boot simulator: ${error.message}`,
          },
        ],
      };
    }
  }

  private async shutdownSimulator(args: any) {
    const { device } = args;
    
    try {
      if (device === 'all') {
        await execAsync('xcrun simctl shutdown all');
        return {
          content: [
            {
              type: 'text',
              text: 'All simulators have been shut down',
            },
          ],
        };
      }
      
      const udid = await this.findDeviceUDID(device);
      await execAsync(`xcrun simctl shutdown "${udid}"`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully shut down simulator: ${device}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to shutdown simulator: ${error.message}`,
          },
        ],
      };
    }
  }

  private async installApp(args: any) {
    const { device, appPath } = args;
    
    try {
      const udid = await this.findDeviceUDID(device);
      await execAsync(`xcrun simctl install "${udid}" "${appPath}"`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully installed app on ${device}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to install app: ${error.message}`,
          },
        ],
      };
    }
  }

  private async launchApp(args: any) {
    const { device, bundleId } = args;
    
    try {
      const udid = await this.findDeviceUDID(device);
      await execAsync(`xcrun simctl launch "${udid}" "${bundleId}"`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully launched ${bundleId} on ${device}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to launch app: ${error.message}`,
          },
        ],
      };
    }
  }

  private async findDeviceUDID(deviceNameOrUDID: string): Promise<string> {
    // UDID 형식이면 그대로 반환
    if (deviceNameOrUDID.match(/^[A-F0-9]{8}-[A-F0-9-]+$/i)) {
      return deviceNameOrUDID;
    }
    
    // 디바이스 이름으로 UDID 찾기
    const { stdout } = await execAsync('xcrun simctl list devices --json');
    const data = JSON.parse(stdout);
    
    for (const devices of Object.values(data.devices)) {
      const device = (devices as any[]).find(d => d.name === deviceNameOrUDID);
      if (device) {
        return device.udid;
      }
    }
    
    throw new Error(`Device not found: ${deviceNameOrUDID}`);
  }
}