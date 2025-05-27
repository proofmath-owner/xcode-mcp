// Type definitions for Xcode MCP

export interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'json';
    text?: string;
    data?: any;
  }>;
}

// Build Tools
export interface BuildProjectArgs {
  projectPath: string;
  scheme?: string;
  configuration?: 'Debug' | 'Release';
  destination?: string;
  derivedDataPath?: string;
}

export interface CleanProjectArgs {
  projectPath: string;
  scheme?: string;
}

export interface OpenInXcodeArgs {
  path: string;
}

export interface ListSchemesArgs {
  projectPath: string;
}

// Simulator Tools
export interface ListSimulatorsArgs {
  showAll?: boolean;
  runtime?: string;
}

export interface BootSimulatorArgs {
  device: string;
}

export interface ShutdownSimulatorArgs {
  device: string;
}

export interface InstallAppArgs {
  device: string;
  appPath: string;
}

export interface LaunchAppArgs {
  device: string;
  bundleId: string;
  arguments?: string[];
}

// Swift Tools
export interface AnalyzeSwiftCodeArgs {
  path: string;
  autoCorrect?: boolean;
  config?: string;
}

export interface FormatSwiftCodeArgs {
  path: string;
  config?: string;
}

export interface RunSwiftTestsArgs {
  projectPath: string;
  scheme: string;
  testName?: string;
  destination?: string;
}

export interface CreateSwiftFileArgs {
  filePath: string;
  template: 'class' | 'struct' | 'enum' | 'protocol' | 'swiftui' | 'uikit' | 'viewmodel' | 'test';
  name: string;
  imports?: string[];
}

// Project Tools
export interface CreateXcodeProjectArgs {
  name: string;
  path: string;
  template: 'ios-app' | 'macos-app' | 'swiftui' | 'uikit' | 'framework' | 'game' | 'ar';
  bundleId: string;
  organizationName?: string;
  deploymentTarget?: string;
  platforms?: Array<'iOS' | 'macOS' | 'watchOS' | 'tvOS'>;
}

export interface FindXcodeProjectsArgs {
  searchPath?: string;
  maxDepth?: number;
}

export interface AnalyzeProjectStructureArgs {
  projectPath: string;
  detailed?: boolean;
}

export interface AddSwiftPackageArgs {
  projectPath: string;
  packageUrl: string;
  version?: string;
  branch?: string;
  exactVersion?: string;
  target?: string;
}

// New interfaces for enhanced features
export interface ArchiveProjectArgs {
  projectPath: string;
  scheme: string;
  archivePath: string;
  exportPath?: string;
  exportOptionsPlist?: string;
}

export interface ManageSigningArgs {
  projectPath: string;
  teamId: string;
  provisioningProfile?: string;
  codeSignIdentity?: string;
}

export interface RunInstrumentsArgs {
  projectPath: string;
  scheme: string;
  template: 'Time Profiler' | 'Allocations' | 'Leaks' | 'Energy Log' | 'Network';
}

// Error types
export class XcodeMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'XcodeMCPError';
  }
}

export enum ErrorCode {
  XCODE_NOT_FOUND = 'XCODE_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  BUILD_FAILED = 'BUILD_FAILED',
  SIMULATOR_ERROR = 'SIMULATOR_ERROR',
  SWIFT_TOOL_MISSING = 'SWIFT_TOOL_MISSING',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Project structure types
export interface XcodeProjectStructure {
  name: string;
  path: string;
  targets: XcodeTarget[];
  schemes: string[];
  configurations: string[];
  dependencies: ProjectDependency[];
  files: FileStats;
  platforms: string[];
}

export interface XcodeTarget {
  name: string;
  type: 'application' | 'framework' | 'test' | 'extension';
  platform: string;
  dependencies: string[];
}

export interface ProjectDependency {
  type: 'swiftPackage' | 'cocoapods' | 'carthage' | 'framework';
  name: string;
  version?: string;
  source?: string;
}

export interface FileStats {
  swift: number;
  objc: number;
  storyboards: number;
  xibs: number;
  assets: number;
  total: number;
  localizationFiles: number;
  configFiles: number;
}

// Simulator types
export interface Simulator {
  name: string;
  udid: string;
  state: 'Shutdown' | 'Booted' | 'Creating' | 'Booting' | 'ShuttingDown';
  runtime: string;
  deviceType: string;
  isAvailable: boolean;
}

// Build result types
export interface BuildResult {
  success: boolean;
  warnings: number;
  errors: number;
  duration: number;
  artifactPath?: string;
  logs: string;
}

// Test result types
export interface TestResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  failures: TestFailure[];
  coverage?: number;
}

export interface TestFailure {
  testName: string;
  className: string;
  reason: string;
  file?: string;
  line?: number;
}
