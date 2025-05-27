#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { XcodeTools } from './tools/xcode-tools.js';
import { SimulatorTools } from './tools/simulator-tools.js';
import { SwiftTools } from './tools/swift-tools.js';
import { ProjectTools } from './tools/project-tools.js';
import { XcodeMCPError, ErrorCode, ToolResponse } from './types.js';
import { logger, verifyXcodeInstallation } from './utils.js';

// Server metadata
const SERVER_NAME = 'xcode-mcp';
const SERVER_VERSION = '2.0.0';

// Initialize server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Initialize tool handlers
const xcodeTools = new XcodeTools();
const simulatorTools = new SimulatorTools();
const swiftTools = new SwiftTools();
const projectTools = new ProjectTools();

// Tool registry for easier management
const toolRegistry = {
  xcode: xcodeTools,
  simulator: simulatorTools,
  swift: swiftTools,
  project: projectTools,
};

// List all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing available tools');
  
  const allTools = [
    ...xcodeTools.getTools(),
    ...simulatorTools.getTools(),
    ...swiftTools.getTools(),
    ...projectTools.getTools(),
  ];
  
  logger.info(`Total tools available: ${allTools.length}`);
  
  return { tools: allTools };
});

// Execute tool requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  logger.info(`Tool request: ${name}`, { args });
  
  try {
    // Find the appropriate tool handler
    for (const [category, handler] of Object.entries(toolRegistry)) {
      if (handler.canHandle(name)) {
        logger.info(`Handling with ${category} tools`);
        
        const result = await handler.execute(name, args);
        
        logger.info(`Tool ${name} completed successfully`);
        return result as any; // Type assertion to match expected return type
      }
    }
    
    // Tool not found
    logger.error(`Unknown tool requested: ${name}`);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Unknown tool: ${name}`,
        },
      ],
    } as any;
  } catch (error: any) {
    logger.error(`Tool ${name} failed:`, error);
    
    // Handle XcodeMCPError specifically
    if (error instanceof XcodeMCPError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error: ${error.message}\n` +
                  `Code: ${error.code}\n` +
                  error.details ? `Details: ${JSON.stringify(error.details, null, 2)}` : '',
          },
        ],
      } as any;
    }
    
    // Generic error handling
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error.message || 'An unknown error occurred'}`,
        },
      ],
    } as any;
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logger.info('Listing resources');
  
  return {
    resources: [
      {
        uri: 'xcode://projects',
        name: 'Xcode Projects',
        description: 'List of available Xcode projects on the system',
        mimeType: 'application/json',
      },
      {
        uri: 'xcode://simulators',
        name: 'iOS Simulators',
        description: 'List of available iOS simulators',
        mimeType: 'application/json',
      },
      {
        uri: 'xcode://sdks',
        name: 'Available SDKs',
        description: 'List of installed Xcode SDKs',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  logger.info(`Reading resource: ${uri}`);
  
  try {
    switch (uri) {
      case 'xcode://projects': {
        const projects = await projectTools.listProjects();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }
      
      case 'xcode://simulators': {
        // Get simulator list
        const result = await simulatorTools.execute('list_simulators', {
          showAll: true,
        }) as ToolResponse;
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: result.content[0].text || '[]',
            },
          ],
        };
      }
      
      case 'xcode://sdks': {
        // Get available SDKs
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        try {
          const { stdout } = await execAsync('xcodebuild -showsdks -json');
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: stdout,
              },
            ],
          };
        } catch (error) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({ error: 'Failed to get SDKs' }),
              },
            ],
          };
        }
      }
      
      default:
        throw new XcodeMCPError(
          `Unknown resource: ${uri}`,
          ErrorCode.UNKNOWN_ERROR
        );
    }
  } catch (error: any) {
    logger.error(`Failed to read resource ${uri}:`, error);
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: error.message || 'Failed to read resource',
          }),
        },
      ],
    };
  }
});

// Server lifecycle management
async function startServer() {
  try {
    logger.info(`Starting ${SERVER_NAME} v${SERVER_VERSION}`);
    
    // Verify Xcode is installed
    try {
      const xcodeInfo = await verifyXcodeInstallation();
      logger.info(`Xcode ${xcodeInfo.version} found at ${xcodeInfo.path}`);
    } catch (error) {
      logger.warn('Xcode not found or not configured. Some features may not work.');
      console.error('⚠️  Warning: Xcode not found. Please install Xcode or run: xcode-select --install');
    }
    
    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('Server started successfully');
    console.error(`🚀 ${SERVER_NAME} v${SERVER_VERSION} is running`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', reason);
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  logger.error('Server startup error:', error);
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
