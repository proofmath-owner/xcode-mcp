// Utility functions for Xcode MCP

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { XcodeMCPError, ErrorCode } from './types.js';

const execAsync = promisify(exec);

// Xcode environment utilities
export async function verifyXcodeInstallation(): Promise<{ installed: boolean; path: string; version: string }> {
  try {
    const { stdout: xcodeSelectPath } = await execAsync('xcode-select -p');
    const { stdout: versionInfo } = await execAsync('xcodebuild -version');
    
    const path = xcodeSelectPath.trim();
    const version = versionInfo.split('\n')[0].replace('Xcode ', '');
    
    return { installed: true, path, version };
  } catch (error) {
    throw new XcodeMCPError(
      'Xcode not installed or not properly configured. Run: xcode-select --install',
      ErrorCode.XCODE_NOT_FOUND
    );
  }
}

export async function findXcodePath(): Promise<string> {
  const { stdout } = await execAsync('xcode-select -p');
  return stdout.trim();
}

// Validation utilities
export function isValidBundleId(bundleId: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z][a-zA-Z0-9-]*)+$/.test(bundleId);
}

export function isValidProjectPath(projectPath: string): boolean {
  return projectPath.endsWith('.xcodeproj') || projectPath.endsWith('.xcworkspace');
}

export function validateScheme(scheme: string): boolean {
  return /^[a-zA-Z0-9\-_\s]+$/.test(scheme);
}

// File system utilities
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function findFilesRecursive(
  dir: string,
  pattern: RegExp,
  ignoreDirs: string[] = ['node_modules', 'Pods', '.git', 'build', 'DerivedData']
): Promise<string[]> {
  const results: string[] = [];
  
  async function search(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await search(fullPath);
          }
        } else if (pattern.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  await search(dir);
  return results;
}

// Xcode specific utilities
export function getProjectType(projectPath: string): 'project' | 'workspace' {
  return projectPath.endsWith('.xcworkspace') ? 'workspace' : 'project';
}

export function getProjectFlag(projectPath: string): string {
  return getProjectType(projectPath) === 'workspace' ? '-workspace' : '-project';
}

export async function getAvailableSDKs(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('xcodebuild -showsdks -json');
    const sdks = JSON.parse(stdout);
    return sdks.map((sdk: any) => sdk.canonicalName);
  } catch {
    return [];
  }
}

export async function getAvailableDestinations(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('xcodebuild -showdestinations -json');
    const destinations = JSON.parse(stdout);
    return destinations.map((dest: any) => dest.description);
  } catch {
    return [];
  }
}

// Build utilities
export function parseBuildOutput(output: string): {
  success: boolean;
  warnings: number;
  errors: number;
  duration: number;
} {
  const success = output.includes('BUILD SUCCEEDED');
  const warnings = (output.match(/warning:/g) || []).length;
  const errors = (output.match(/error:/g) || []).length;
  
  // Extract build duration
  const durationMatch = output.match(/\*\*\s+BUILD\s+\w+\s+in\s+([\d.]+)s\s+\*\*/);
  const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;
  
  return { success, warnings, errors, duration };
}

// Test utilities
export function parseTestOutput(output: string): {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failures: Array<{ testName: string; reason: string }>;
} {
  const testMatches = output.match(/Test Case .* (passed|failed)/g) || [];
  const passedTests = testMatches.filter(m => m.includes('passed')).length;
  const failedTests = testMatches.filter(m => m.includes('failed')).length;
  const totalTests = passedTests + failedTests;
  
  // Extract failure details
  const failures: Array<{ testName: string; reason: string }> = [];
  const failureMatches = output.match(/Test Case '(.+)' failed \((.+)\)/g) || [];
  
  failureMatches.forEach(match => {
    const [, testName, reason] = match.match(/Test Case '(.+)' failed \((.+)\)/) || [];
    if (testName && reason) {
      failures.push({ testName, reason });
    }
  });
  
  return { totalTests, passedTests, failedTests, failures };
}

// Template utilities
export function generateGitignore(): string {
  return `# Xcode
#
# gitignore contributors: remember to update Global/Xcode.gitignore, Objective-C.gitignore & Swift.gitignore

## User settings
xcuserdata/

## compatibility with Xcode 8 and earlier (ignoring not required starting Xcode 9)
*.xcscmblueprint
*.xccheckout

## compatibility with Xcode 3 and earlier (ignoring not required starting Xcode 4)
build/
DerivedData/
*.moved-aside
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3

## Obj-C/Swift specific
*.hmap

## App packaging
*.ipa
*.dSYM.zip
*.dSYM

## Playgrounds
timeline.xctimeline
playground.xcworkspace

# Swift Package Manager
.build/
.swiftpm/

# CocoaPods
Pods/

# Carthage
Carthage/Build/

# fastlane
fastlane/report.xml
fastlane/Preview.html
fastlane/screenshots/**/*.png
fastlane/test_output

# Code Injection
*.xcworkspace
!default.xcworkspace
iOSInjectionProject/
`;
}

// Swift Package utilities
export async function resolveSwiftPackageVersion(
  packageUrl: string,
  versionRequirement?: string
): Promise<string> {
  // If no version specified, get the latest tag
  if (!versionRequirement) {
    try {
      const { stdout } = await execAsync(
        `git ls-remote --tags ${packageUrl} | grep -v '{}' | tail -n1 | sed 's/.*\\///'`
      );
      return stdout.trim() || 'main';
    } catch {
      return 'main';
    }
  }
  return versionRequirement;
}

// Simulator utilities
export async function waitForSimulatorBoot(udid: string, timeout: number = 30000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const { stdout } = await execAsync(`xcrun simctl list devices -j`);
      const data = JSON.parse(stdout);
      
      for (const devices of Object.values(data.devices)) {
        const device = (devices as any[]).find(d => d.udid === udid);
        if (device && device.state === 'Booted') {
          return;
        }
      }
    } catch {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new XcodeMCPError(
    'Simulator boot timeout',
    ErrorCode.SIMULATOR_ERROR,
    { udid, timeout }
  );
}

// Code signing utilities
export async function getCodeSigningIdentities(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('security find-identity -v -p codesigning');
    const identities = stdout
      .split('\n')
      .filter(line => line.includes('"'))
      .map(line => {
        const match = line.match(/"([^"]+)"/);
        return match ? match[1] : '';
      })
      .filter(Boolean);
    
    return identities;
  } catch {
    return [];
  }
}

export async function getProvisioningProfiles(): Promise<Array<{ name: string; uuid: string }>> {
  try {
    const profilesPath = path.join(
      process.env.HOME || '',
      'Library/MobileDevice/Provisioning Profiles'
    );
    
    const files = await fs.readdir(profilesPath);
    const profiles: Array<{ name: string; uuid: string }> = [];
    
    for (const file of files) {
      if (file.endsWith('.mobileprovision')) {
        const uuid = file.replace('.mobileprovision', '');
        // Try to extract profile name
        try {
          const { stdout } = await execAsync(
            `security cms -D -i "${path.join(profilesPath, file)}" | plutil -extract Name raw -`
          );
          profiles.push({ name: stdout.trim(), uuid });
        } catch {
          profiles.push({ name: uuid, uuid });
        }
      }
    }
    
    return profiles;
  } catch {
    return [];
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private startTime: number;
  private marks: Map<string, number> = new Map();
  
  constructor() {
    this.startTime = Date.now();
  }
  
  mark(name: string): void {
    this.marks.set(name, Date.now());
  }
  
  measure(name: string, startMark?: string): number {
    const endTime = Date.now();
    const startTime = startMark ? this.marks.get(startMark) || this.startTime : this.startTime;
    return endTime - startTime;
  }
  
  getReport(): Record<string, number> {
    const report: Record<string, number> = {};
    
    let previousTime = this.startTime;
    for (const [mark, time] of this.marks) {
      report[mark] = time - previousTime;
      previousTime = time;
    }
    
    report.total = Date.now() - this.startTime;
    return report;
  }
}

// Logging utilities
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}
  
  debug(message: string, data?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      console.error(`[DEBUG] ${message}`, data || '');
    }
  }
  
  info(message: string, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      console.error(`[INFO] ${message}`, data || '');
    }
  }
  
  warn(message: string, data?: any): void {
    if (this.level <= LogLevel.WARN) {
      console.error(`[WARN] ${message}`, data || '');
    }
  }
  
  error(message: string, data?: any): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, data || '');
    }
  }
}

export const logger = new Logger(
  process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO
);
