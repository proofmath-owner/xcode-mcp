// PBXProj generator for creating valid Xcode projects

import * as crypto from 'crypto';

export class PBXProjGenerator {
  private objects: Record<string, any> = {};
  private rootObjectId: string;
  
  constructor(private projectName: string, private bundleId: string) {
    this.rootObjectId = this.generateUUID();
  }
  
  generate(): string {
    // Create main group
    const mainGroupId = this.generateUUID();
    const productGroupId = this.generateUUID();
    const targetId = this.generateUUID();
    const configListId = this.generateUUID();
    const buildPhaseSourcesId = this.generateUUID();
    const buildPhaseFrameworksId = this.generateUUID();
    const buildPhaseResourcesId = this.generateUUID();
    const debugConfigId = this.generateUUID();
    const releaseConfigId = this.generateUUID();
    const projectConfigListId = this.generateUUID();
    const debugProjectConfigId = this.generateUUID();
    const releaseProjectConfigId = this.generateUUID();
    
    // PBXBuildFile
    const appDelegateFileRefId = this.generateUUID();
    const appDelegateBuildFileId = this.generateUUID();
    const contentViewFileRefId = this.generateUUID();
    const contentViewBuildFileId = this.generateUUID();
    const infoPlistFileRefId = this.generateUUID();
    
    // PBXFileReference
    const productRefId = this.generateUUID();
    
    // Create objects
    this.objects = {
      // Root project
      [this.rootObjectId]: {
        isa: 'PBXProject',
        attributes: {
          BuildIndependentTargetsInParallel: 1,
          LastSwiftUpdateCheck: 1500,
          LastUpgradeCheck: 1500,
          TargetAttributes: {
            [targetId]: {
              CreatedOnToolsVersion: 15.0,
            },
          },
        },
        buildConfigurationList: projectConfigListId,
        compatibilityVersion: 'Xcode 14.0',
        developmentRegion: 'en',
        hasScannedForEncodings: 0,
        knownRegions: ['en', 'Base'],
        mainGroup: mainGroupId,
        productRefGroup: productGroupId,
        projectDirPath: '',
        projectRoot: '',
        targets: [targetId],
      },
      
      // Main group
      [mainGroupId]: {
        isa: 'PBXGroup',
        children: [
          this.projectName,
          productGroupId,
        ],
        sourceTree: '<group>',
      },
      
      // Project files group
      [this.projectName]: {
        isa: 'PBXGroup',
        children: [
          appDelegateFileRefId,
          contentViewFileRefId,
          infoPlistFileRefId,
        ],
        path: this.projectName,
        sourceTree: '<group>',
      },
      
      // Products group
      [productGroupId]: {
        isa: 'PBXGroup',
        children: [productRefId],
        name: 'Products',
        sourceTree: '<group>',
      },
      
      // File references
      [appDelegateFileRefId]: {
        isa: 'PBXFileReference',
        lastKnownFileType: 'sourcecode.swift',
        path: 'App.swift',
        sourceTree: '<group>',
      },
      
      [contentViewFileRefId]: {
        isa: 'PBXFileReference',
        lastKnownFileType: 'sourcecode.swift',
        path: 'ContentView.swift',
        sourceTree: '<group>',
      },
      
      [infoPlistFileRefId]: {
        isa: 'PBXFileReference',
        lastKnownFileType: 'text.plist.xml',
        path: 'Info.plist',
        sourceTree: '<group>',
      },
      
      [productRefId]: {
        isa: 'PBXFileReference',
        explicitFileType: 'wrapper.application',
        includeInIndex: 0,
        path: `${this.projectName}.app`,
        sourceTree: 'BUILT_PRODUCTS_DIR',
      },
      
      // Build files
      [appDelegateBuildFileId]: {
        isa: 'PBXBuildFile',
        fileRef: appDelegateFileRefId,
      },
      
      [contentViewBuildFileId]: {
        isa: 'PBXBuildFile',
        fileRef: contentViewFileRefId,
      },
      
      // Native target
      [targetId]: {
        isa: 'PBXNativeTarget',
        buildConfigurationList: configListId,
        buildPhases: [
          buildPhaseSourcesId,
          buildPhaseFrameworksId,
          buildPhaseResourcesId,
        ],
        buildRules: [],
        dependencies: [],
        name: this.projectName,
        productName: this.projectName,
        productReference: productRefId,
        productType: 'com.apple.product-type.application',
      },
      
      // Build phases
      [buildPhaseSourcesId]: {
        isa: 'PBXSourcesBuildPhase',
        buildActionMask: 2147483647,
        files: [
          appDelegateBuildFileId,
          contentViewBuildFileId,
        ],
        runOnlyForDeploymentPostprocessing: 0,
      },
      
      [buildPhaseFrameworksId]: {
        isa: 'PBXFrameworksBuildPhase',
        buildActionMask: 2147483647,
        files: [],
        runOnlyForDeploymentPostprocessing: 0,
      },
      
      [buildPhaseResourcesId]: {
        isa: 'PBXResourcesBuildPhase',
        buildActionMask: 2147483647,
        files: [],
        runOnlyForDeploymentPostprocessing: 0,
      },
      
      // Build configurations
      [debugConfigId]: {
        isa: 'XCBuildConfiguration',
        buildSettings: {
          ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon',
          ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
          CODE_SIGN_STYLE: 'Automatic',
          CURRENT_PROJECT_VERSION: '1',
          ENABLE_PREVIEWS: 'YES',
          GENERATE_INFOPLIST_FILE: 'YES',
          INFOPLIST_FILE: `${this.projectName}/Info.plist`,
          INFOPLIST_KEY_UIApplicationSceneManifest_Generation: 'YES',
          INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents: 'YES',
          INFOPLIST_KEY_UILaunchScreen_Generation: 'YES',
          INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad: 'UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight',
          INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone: 'UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight',
          IPHONEOS_DEPLOYMENT_TARGET: '17.0',
          LD_RUNPATH_SEARCH_PATHS: '$(inherited) @executable_path/Frameworks',
          MARKETING_VERSION: '1.0',
          PRODUCT_BUNDLE_IDENTIFIER: this.bundleId,
          PRODUCT_NAME: '$(TARGET_NAME)',
          SWIFT_EMIT_LOC_STRINGS: 'YES',
          SWIFT_VERSION: '5.0',
          TARGETED_DEVICE_FAMILY: '1,2',
        },
        name: 'Debug',
      },
      
      [releaseConfigId]: {
        isa: 'XCBuildConfiguration',
        buildSettings: {
          ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon',
          ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
          CODE_SIGN_STYLE: 'Automatic',
          CURRENT_PROJECT_VERSION: '1',
          ENABLE_PREVIEWS: 'YES',
          GENERATE_INFOPLIST_FILE: 'YES',
          INFOPLIST_FILE: `${this.projectName}/Info.plist`,
          INFOPLIST_KEY_UIApplicationSceneManifest_Generation: 'YES',
          INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents: 'YES',
          INFOPLIST_KEY_UILaunchScreen_Generation: 'YES',
          INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad: 'UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight',
          INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone: 'UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight',
          IPHONEOS_DEPLOYMENT_TARGET: '17.0',
          LD_RUNPATH_SEARCH_PATHS: '$(inherited) @executable_path/Frameworks',
          MARKETING_VERSION: '1.0',
          PRODUCT_BUNDLE_IDENTIFIER: this.bundleId,
          PRODUCT_NAME: '$(TARGET_NAME)',
          SWIFT_EMIT_LOC_STRINGS: 'YES',
          SWIFT_VERSION: '5.0',
          TARGETED_DEVICE_FAMILY: '1,2',
        },
        name: 'Release',
      },
      
      // Configuration lists
      [configListId]: {
        isa: 'XCConfigurationList',
        buildConfigurations: [debugConfigId, releaseConfigId],
        defaultConfigurationIsVisible: 0,
        defaultConfigurationName: 'Release',
      },
      
      [debugProjectConfigId]: {
        isa: 'XCBuildConfiguration',
        buildSettings: {
          ALWAYS_SEARCH_USER_PATHS: 'NO',
          ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS: 'YES',
          CLANG_ANALYZER_NONNULL: 'YES',
          CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: 'YES_AGGRESSIVE',
          CLANG_CXX_LANGUAGE_STANDARD: 'gnu++20',
          CLANG_ENABLE_MODULES: 'YES',
          CLANG_ENABLE_OBJC_ARC: 'YES',
          CLANG_ENABLE_OBJC_WEAK: 'YES',
          CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING: 'YES',
          CLANG_WARN_BOOL_CONVERSION: 'YES',
          CLANG_WARN_COMMA: 'YES',
          CLANG_WARN_CONSTANT_CONVERSION: 'YES',
          CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS: 'YES',
          CLANG_WARN_DIRECT_OBJC_ISA_USAGE: 'YES_ERROR',
          CLANG_WARN_DOCUMENTATION_COMMENTS: 'YES',
          CLANG_WARN_EMPTY_BODY: 'YES',
          CLANG_WARN_ENUM_CONVERSION: 'YES',
          CLANG_WARN_INFINITE_RECURSION: 'YES',
          CLANG_WARN_INT_CONVERSION: 'YES',
          CLANG_WARN_NON_LITERAL_NULL_CONVERSION: 'YES',
          CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF: 'YES',
          CLANG_WARN_OBJC_LITERAL_CONVERSION: 'YES',
          CLANG_WARN_OBJC_ROOT_CLASS: 'YES_ERROR',
          CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: 'YES',
          CLANG_WARN_RANGE_LOOP_ANALYSIS: 'YES',
          CLANG_WARN_STRICT_PROTOTYPES: 'YES',
          CLANG_WARN_SUSPICIOUS_MOVE: 'YES',
          CLANG_WARN_UNGUARDED_AVAILABILITY: 'YES_AGGRESSIVE',
          CLANG_WARN_UNREACHABLE_CODE: 'YES',
          CLANG_WARN__DUPLICATE_METHOD_MATCH: 'YES',
          COPY_PHASE_STRIP: 'NO',
          DEBUG_INFORMATION_FORMAT: 'dwarf',
          ENABLE_STRICT_OBJC_MSGSEND: 'YES',
          ENABLE_TESTABILITY: 'YES',
          ENABLE_USER_SCRIPT_SANDBOXING: 'YES',
          GCC_C_LANGUAGE_STANDARD: 'gnu17',
          GCC_DYNAMIC_NO_PIC: 'NO',
          GCC_NO_COMMON_BLOCKS: 'YES',
          GCC_OPTIMIZATION_LEVEL: '0',
          GCC_PREPROCESSOR_DEFINITIONS: 'DEBUG=1 $(inherited)',
          GCC_WARN_64_TO_32_BIT_CONVERSION: 'YES',
          GCC_WARN_ABOUT_RETURN_TYPE: 'YES_ERROR',
          GCC_WARN_UNDECLARED_SELECTOR: 'YES',
          GCC_WARN_UNINITIALIZED_AUTOS: 'YES_AGGRESSIVE',
          GCC_WARN_UNUSED_FUNCTION: 'YES',
          GCC_WARN_UNUSED_VARIABLE: 'YES',
          IPHONEOS_DEPLOYMENT_TARGET: '17.0',
          LOCALIZATION_PREFERS_STRING_CATALOGS: 'YES',
          MTL_ENABLE_DEBUG_INFO: 'INCLUDE_SOURCE',
          MTL_FAST_MATH: 'YES',
          ONLY_ACTIVE_ARCH: 'YES',
          SDKROOT: 'iphoneos',
          SWIFT_ACTIVE_COMPILATION_CONDITIONS: 'DEBUG $(inherited)',
          SWIFT_OPTIMIZATION_LEVEL: '-Onone',
        },
        name: 'Debug',
      },
      
      [releaseProjectConfigId]: {
        isa: 'XCBuildConfiguration',
        buildSettings: {
          ALWAYS_SEARCH_USER_PATHS: 'NO',
          ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS: 'YES',
          CLANG_ANALYZER_NONNULL: 'YES',
          CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: 'YES_AGGRESSIVE',
          CLANG_CXX_LANGUAGE_STANDARD: 'gnu++20',
          CLANG_ENABLE_MODULES: 'YES',
          CLANG_ENABLE_OBJC_ARC: 'YES',
          CLANG_ENABLE_OBJC_WEAK: 'YES',
          CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING: 'YES',
          CLANG_WARN_BOOL_CONVERSION: 'YES',
          CLANG_WARN_COMMA: 'YES',
          CLANG_WARN_CONSTANT_CONVERSION: 'YES',
          CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS: 'YES',
          CLANG_WARN_DIRECT_OBJC_ISA_USAGE: 'YES_ERROR',
          CLANG_WARN_DOCUMENTATION_COMMENTS: 'YES',
          CLANG_WARN_EMPTY_BODY: 'YES',
          CLANG_WARN_ENUM_CONVERSION: 'YES',
          CLANG_WARN_INFINITE_RECURSION: 'YES',
          CLANG_WARN_INT_CONVERSION: 'YES',
          CLANG_WARN_NON_LITERAL_NULL_CONVERSION: 'YES',
          CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF: 'YES',
          CLANG_WARN_OBJC_LITERAL_CONVERSION: 'YES',
          CLANG_WARN_OBJC_ROOT_CLASS: 'YES_ERROR',
          CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: 'YES',
          CLANG_WARN_RANGE_LOOP_ANALYSIS: 'YES',
          CLANG_WARN_STRICT_PROTOTYPES: 'YES',
          CLANG_WARN_SUSPICIOUS_MOVE: 'YES',
          CLANG_WARN_UNGUARDED_AVAILABILITY: 'YES_AGGRESSIVE',
          CLANG_WARN_UNREACHABLE_CODE: 'YES',
          CLANG_WARN__DUPLICATE_METHOD_MATCH: 'YES',
          COPY_PHASE_STRIP: 'NO',
          DEBUG_INFORMATION_FORMAT: 'dwarf-with-dsym',
          ENABLE_NS_ASSERTIONS: 'NO',
          ENABLE_STRICT_OBJC_MSGSEND: 'YES',
          ENABLE_USER_SCRIPT_SANDBOXING: 'YES',
          GCC_C_LANGUAGE_STANDARD: 'gnu17',
          GCC_NO_COMMON_BLOCKS: 'YES',
          GCC_WARN_64_TO_32_BIT_CONVERSION: 'YES',
          GCC_WARN_ABOUT_RETURN_TYPE: 'YES_ERROR',
          GCC_WARN_UNDECLARED_SELECTOR: 'YES',
          GCC_WARN_UNINITIALIZED_AUTOS: 'YES_AGGRESSIVE',
          GCC_WARN_UNUSED_FUNCTION: 'YES',
          GCC_WARN_UNUSED_VARIABLE: 'YES',
          IPHONEOS_DEPLOYMENT_TARGET: '17.0',
          LOCALIZATION_PREFERS_STRING_CATALOGS: 'YES',
          MTL_ENABLE_DEBUG_INFO: 'NO',
          MTL_FAST_MATH: 'YES',
          SDKROOT: 'iphoneos',
          SWIFT_COMPILATION_MODE: 'wholemodule',
          VALIDATE_PRODUCT: 'YES',
        },
        name: 'Release',
      },
      
      [projectConfigListId]: {
        isa: 'XCConfigurationList',
        buildConfigurations: [debugProjectConfigId, releaseProjectConfigId],
        defaultConfigurationIsVisible: 0,
        defaultConfigurationName: 'Release',
      },
    };
    
    return this.serialize();
  }
  
  private generateUUID(): string {
    return crypto.randomBytes(12).toString('hex').toUpperCase();
  }
  
  private serialize(): string {
    let output = '// !$*UTF8*$!\n{\n';
    output += '\tarchiveVersion = 1;\n';
    output += '\tclasses = {\n\t};\n';
    output += '\tobjectVersion = 56;\n';
    output += '\tobjects = {\n';
    
    // Group objects by type
    const objectsByType: Record<string, any[]> = {};
    
    for (const [id, obj] of Object.entries(this.objects)) {
      const type = obj.isa;
      if (!objectsByType[type]) {
        objectsByType[type] = [];
      }
      objectsByType[type].push({ id, ...obj });
    }
    
    // Write objects grouped by type
    for (const [type, objects] of Object.entries(objectsByType)) {
      output += `\n/* Begin ${type} section */\n`;
      
      for (const obj of objects) {
        output += `\t\t${obj.id} /* ${obj.name || type} */ = {\n`;
        
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'id') continue;
          output += `\t\t\t${key} = ${this.formatValue(value)};\n`;
        }
        
        output += '\t\t};\n';
      }
      
      output += `/* End ${type} section */\n`;
    }
    
    output += '\t};\n';
    output += `\trootObject = ${this.rootObjectId} /* Project object */;\n`;
    output += '}\n';
    
    return output;
  }
  
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      if (value.includes(' ') || value.includes('/')) {
        return `"${value}"`;
      }
      return value;
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (Array.isArray(value)) {
      return `(\n${value.map(v => `\t\t\t\t${this.formatValue(v)},`).join('\n')}\n\t\t\t)`;
    }
    
    if (typeof value === 'object') {
      let result = '{\n';
      for (const [k, v] of Object.entries(value)) {
        result += `\t\t\t\t${k} = ${this.formatValue(v)};\n`;
      }
      result += '\t\t\t}';
      return result;
    }
    
    return String(value);
  }
}

// Additional project templates
export function generateSwiftUIApp(name: string): string {
  return `import SwiftUI

@main
struct ${name}App: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}`;
}

export function generateContentView(name: string): string {
  return `import SwiftUI

struct ContentView: View {
    @State private var greeting = "Hello, ${name}!"
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "swift")
                .font(.system(size: 80))
                .foregroundStyle(.orange)
            
            Text(greeting)
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Button("Tap me!") {
                withAnimation {
                    greeting = ["Amazing!", "Awesome!", "Fantastic!", "Incredible!"].randomElement()!
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}`;
}

export function generateUIKitApp(name: string): string {
  return `import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    var window: UIWindow?
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        window = UIWindow(frame: UIScreen.main.bounds)
        
        let navigationController = UINavigationController(rootViewController: ViewController())
        window?.rootViewController = navigationController
        window?.makeKeyAndVisible()
        
        return true
    }
}`;
}

export function generateViewController(): string {
  return `import UIKit

class ViewController: UIViewController {
    
    private let label: UILabel = {
        let label = UILabel()
        label.text = "Hello, World!"
        label.font = .systemFont(ofSize: 24, weight: .bold)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let button: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Tap me!", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 18, weight: .medium)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        setupConstraints()
    }
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "My App"
        
        view.addSubview(label)
        view.addSubview(button)
        
        button.addTarget(self, action: #selector(buttonTapped), for: .touchUpInside)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -50),
            
            button.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            button.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 30),
            button.widthAnchor.constraint(equalToConstant: 120),
            button.heightAnchor.constraint(equalToConstant: 44)
        ])
    }
    
    @objc private func buttonTapped() {
        let messages = ["Amazing!", "Awesome!", "Fantastic!", "Incredible!"]
        label.text = messages.randomElement()
        
        UIView.animate(withDuration: 0.3) {
            self.label.transform = CGAffineTransform(scaleX: 1.2, y: 1.2)
        } completion: { _ in
            UIView.animate(withDuration: 0.3) {
                self.label.transform = .identity
            }
        }
    }
}`;
}
