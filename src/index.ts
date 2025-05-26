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

const server = new Server(
  {
    name: 'xcode-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// 도구 초기화
const xcodeTools = new XcodeTools();
const simulatorTools = new SimulatorTools();
const swiftTools = new SwiftTools();
const projectTools = new ProjectTools();

// 도구 목록 핸들러
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    ...xcodeTools.getTools(),
    ...simulatorTools.getTools(),
    ...swiftTools.getTools(),
    ...projectTools.getTools(),
  ],
}));

// 도구 실행 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // 각 도구 클래스에서 처리
  if (xcodeTools.canHandle(name)) {
    return await xcodeTools.execute(name, args);
  }
  if (simulatorTools.canHandle(name)) {
    return await simulatorTools.execute(name, args);
  }
  if (swiftTools.canHandle(name)) {
    return await swiftTools.execute(name, args);
  }
  if (projectTools.canHandle(name)) {
    return await projectTools.execute(name, args);
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

// 리소스 목록 핸들러
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'xcode://projects',
      name: 'Xcode Projects',
      description: 'List of available Xcode projects',
      mimeType: 'application/json',
    },
  ],
}));

// 리소스 읽기 핸들러
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri === 'xcode://projects') {
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
  
  throw new Error(`Unknown resource: ${uri}`);
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Xcode MCP Server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});