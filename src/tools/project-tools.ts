import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

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
            description: 'Project template: ios-app, macos-app, swiftui, uikit, framework',
            default: 'ios-app',
          },
          bundleId: {
            type: 'string',
            description: 'Bundle identifier (e.g., com.example.app)',
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
        },
        required: ['projectPath', 'packageUrl'],
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
      case 'create_xcode_project':
        return await this.createXcodeProject(args);
      case 'find_xcode_projects':
        return await this.findXcodeProjects(args);
      case 'analyze_project_structure':
        return await this.analyzeProjectStructure(args);
      case 'add_swift_package':
        return await this.addSwiftPackage(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async listProjects(): Promise<any[]> {
    try {
      const homeDir = process.env.HOME || '~';
      const searchPaths = [
        path.join(homeDir, 'Developer'),
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Desktop'),
      ];
      
      const projects: any[] = [];
      
      for (const searchPath of searchPaths) {
        try {
          await fs.access(searchPath);
          const projectPaths = await this.findProjectsRecursive(searchPath, '.xcodeproj');
          
          for (const projectPath of projectPaths) {
            const name = path.basename(projectPath, '.xcodeproj');
            projects.push({
              name,
              path: projectPath,
              directory: path.dirname(projectPath),
            });
          }
        } catch (error) {
          // 디렉토리가 없을 수 있음
        }
      }
      
      return projects;
    } catch (error) {
      return [];
    }
  }

  private async createXcodeProject(args: any) {
    const { name, path: projectPath, template = 'ios-app', bundleId } = args;
    
    try {
      // 프로젝트 디렉토리 생성
      const fullPath = path.join(projectPath, name);
      await fs.mkdir(fullPath, { recursive: true });
      
      // 프로젝트 구조 생성
      const projectFile = path.join(fullPath, `${name}.xcodeproj`);
      await fs.mkdir(projectFile, { recursive: true });
      
      // 기본 소스 디렉토리 생성
      await fs.mkdir(path.join(fullPath, name), { recursive: true });
      
      // Info.plist 생성
      const infoPlist = this.getInfoPlistTemplate(name, bundleId);
      await fs.writeFile(
        path.join(fullPath, name, 'Info.plist'),
        infoPlist,
        'utf8'
      );
      
      // 메인 Swift 파일 생성
      const mainSwift = this.getMainSwiftTemplate(template, name);
      await fs.writeFile(
        path.join(fullPath, name, template === 'swiftui' ? 'App.swift' : 'AppDelegate.swift'),
        mainSwift,
        'utf8'
      );
      
      // ContentView.swift (SwiftUI의 경우)
      if (template === 'swiftui' || template === 'ios-app') {
        const contentView = this.getContentViewTemplate(name);
        await fs.writeFile(
          path.join(fullPath, name, 'ContentView.swift'),
          contentView,
          'utf8'
        );
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Created Xcode project: ${name}\nLocation: ${fullPath}\nBundle ID: ${bundleId}\nTemplate: ${template}\n\nProject structure created successfully!`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create project: ${error.message}`,
          },
        ],
      };
    }
  }

  private async findXcodeProjects(args: any) {
    const { searchPath = '.' } = args;
    
    try {
      const projectFiles = await this.findProjectsRecursive(searchPath, '.xcodeproj');
      const workspaceFiles = await this.findProjectsRecursive(searchPath, '.xcworkspace');
      
      let output = 'Found Xcode Projects:\n\n';
      
      if (projectFiles.length > 0) {
        output += 'Projects (.xcodeproj):\n';
        projectFiles.forEach(file => {
          const name = path.basename(file, '.xcodeproj');
          const dir = path.dirname(file);
          output += `  📁 ${name}\n     ${dir}\n\n`;
        });
      }
      
      if (workspaceFiles.length > 0) {
        output += '\nWorkspaces (.xcworkspace):\n';
        workspaceFiles.forEach(file => {
          const name = path.basename(file, '.xcworkspace');
          const dir = path.dirname(file);
          output += `  📁 ${name}\n     ${dir}\n\n`;
        });
      }
      
      if (projectFiles.length === 0 && workspaceFiles.length === 0) {
        output = 'No Xcode projects found in the specified directory.';
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
      return {
        content: [
          {
            type: 'text',
            text: `Failed to find projects: ${error.message}`,
          },
        ],
      };
    }
  }

  private async analyzeProjectStructure(args: any) {
    const { projectPath } = args;
    
    try {
      // 프로젝트 정보 가져오기
      const { stdout: projectInfo } = await execAsync(
        `xcodebuild -project "${projectPath}" -list -json`
      );
      const projectData = JSON.parse(projectInfo);
      
      // 프로젝트 디렉토리 분석
      const projectDir = path.dirname(projectPath);
      const files = await this.analyzeDirectory(projectDir);
      
      let output = `Project Analysis: ${path.basename(projectPath, '.xcodeproj')}\n\n`;
      
      // 타겟 정보
      if (projectData.project?.targets) {
        output += 'Targets:\n';
        projectData.project.targets.forEach((target: string) => {
          output += `  🎯 ${target}\n`;
        });
        output += '\n';
      }
      
      // 스킴 정보
      if (projectData.project?.schemes) {
        output += 'Schemes:\n';
        projectData.project.schemes.forEach((scheme: string) => {
          output += `  📋 ${scheme}\n`;
        });
        output += '\n';
      }
      
      // 파일 구조
      output += 'File Structure:\n';
      output += `  Swift files: ${files.swift}\n`;
      output += `  Objective-C files: ${files.objc}\n`;
      output += `  Storyboards: ${files.storyboards}\n`;
      output += `  XIBs: ${files.xibs}\n`;
      output += `  Assets: ${files.assets}\n`;
      
      // 의존성 확인
      const podfile = path.join(projectDir, 'Podfile');
      const packageResolved = path.join(projectPath, 'project.xcworkspace', 'xcshareddata', 'swiftpm', 'Package.resolved');
      
      output += '\nDependencies:\n';
      try {
        await fs.access(podfile);
        output += '  ✓ CocoaPods (Podfile found)\n';
      } catch {}
      
      try {
        await fs.access(packageResolved);
        output += '  ✓ Swift Package Manager\n';
      } catch {}
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to analyze project: ${error.message}`,
          },
        ],
      };
    }
  }

  private async addSwiftPackage(args: any) {
    const { projectPath, packageUrl, version } = args;
    
    // 참고: 실제 Swift Package 추가는 Xcode GUI나 swift package 명령어로 해야 함
    // 여기서는 가이드만 제공
    
    return {
      content: [
        {
          type: 'text',
          text: `To add Swift Package to your project:\n\n` +
                `1. Open project in Xcode:\n` +
                `   open "${projectPath}"\n\n` +
                `2. Go to File → Add Package Dependencies\n\n` +
                `3. Enter package URL:\n` +
                `   ${packageUrl}\n\n` +
                `4. Select version requirement:\n` +
                `   ${version || 'Up to Next Major Version'}\n\n` +
                `Alternative: Use swift package command:\n` +
                `   cd "${path.dirname(projectPath)}"\n` +
                `   swift package add ${packageUrl}`,
        },
      ],
    };
  }

  private async analyzeDirectory(dir: string) {
    const stats = {
      swift: 0,
      objc: 0,
      storyboards: 0,
      xibs: 0,
      assets: 0,
    };
    
    try {
      const files = await this.findFilesRecursive(dir);
      
      stats.swift = files.filter(f => f.endsWith('.swift')).length;
      stats.objc = files.filter(f => f.endsWith('.m') || f.endsWith('.h')).length;
      stats.storyboards = files.filter(f => f.endsWith('.storyboard')).length;
      stats.xibs = files.filter(f => f.endsWith('.xib')).length;
      stats.assets = files.filter(f => f.endsWith('.xcassets')).length;
    } catch (error) {
      // 에러 무시
    }
    
    return stats;
  }

  private async findProjectsRecursive(dir: string, extension: string): Promise<string[]> {
    const results: string[] = [];
    const ignoreDirs = ['node_modules', 'Library', 'Pods', '.git', 'build'];
    
    async function search(currentDir: string) {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          if (entry.isDirectory()) {
            if (entry.name.endsWith(extension)) {
              results.push(fullPath);
            } else if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
              await search(fullPath);
            }
          }
        }
      } catch (error) {
        // 접근 권한이 없는 디렉토리 무시
      }
    }
    
    await search(dir);
    return results;
  }

  private async findFilesRecursive(dir: string): Promise<string[]> {
    const results: string[] = [];
    const ignoreDirs = ['node_modules', 'Pods', '.git', 'build'];
    
    async function search(currentDir: string) {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          if (entry.isDirectory()) {
            if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
              await search(fullPath);
            }
          } else {
            results.push(fullPath);
          }
        }
      } catch (error) {
        // 접근 권한이 없는 디렉토리 무시
      }
    }
    
    await search(dir);
    return results;
  }

  private getInfoPlistTemplate(appName: string, bundleId: string): string {
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
    </dict>
    <key>UILaunchScreen</key>
    <dict/>
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
</dict>
</plist>`;
  }

  private getMainSwiftTemplate(template: string, appName: string): string {
    if (template === 'swiftui' || template === 'ios-app') {
      return `import SwiftUI

@main
struct ${appName}App: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}`;
    } else {
      return `import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    var window: UIWindow?
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = UIViewController()
        window?.rootViewController?.view.backgroundColor = .systemBackground
        window?.makeKeyAndVisible()
        
        return true
    }
}`;
    }
  }

  private getContentViewTemplate(appName: string): string {
    return `import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, ${appName}!")
        }
        .padding()
    }
}

#Preview {
    ContentView()
}`;
  }
}