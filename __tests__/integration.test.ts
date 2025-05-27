import { XcodeTools } from '../src/tools/xcode-tools';
import { SimulatorTools } from '../src/tools/simulator-tools';
import { SwiftTools } from '../src/tools/swift-tools';
import { ProjectTools } from '../src/tools/project-tools';

// Mock execAsync to prevent actual command execution
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => {
    callback(null, { stdout: 'mocked output', stderr: '' });
  }),
}));

jest.mock('util', () => ({
  promisify: jest.fn(() => jest.fn().mockResolvedValue({ stdout: 'mocked output', stderr: '' })),
}));

describe('Tool Integration', () => {
  describe('XcodeTools', () => {
    let xcodeTools: XcodeTools;

    beforeEach(() => {
      xcodeTools = new XcodeTools();
    });

    test('should provide tool list', () => {
      const tools = xcodeTools.getTools();
      
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check for specific tools
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('build_project');
      expect(toolNames).toContain('clean_project');
      expect(toolNames).toContain('open_in_xcode');
      expect(toolNames).toContain('list_schemes');
    });

    test('should identify tools it can handle', () => {
      expect(xcodeTools.canHandle('build_project')).toBe(true);
      expect(xcodeTools.canHandle('unknown_tool')).toBe(false);
    });
  });

  describe('SimulatorTools', () => {
    let simulatorTools: SimulatorTools;

    beforeEach(() => {
      simulatorTools = new SimulatorTools();
    });

    test('should provide simulator tools', () => {
      const tools = simulatorTools.getTools();
      
      expect(tools).toBeInstanceOf(Array);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('list_simulators');
      expect(toolNames).toContain('boot_simulator');
      expect(toolNames).toContain('shutdown_simulator');
      expect(toolNames).toContain('install_app');
      expect(toolNames).toContain('launch_app');
    });

    test('should include new enhanced tools', () => {
      const tools = simulatorTools.getTools();
      const toolNames = tools.map(t => t.name);
      
      expect(toolNames).toContain('create_simulator');
      expect(toolNames).toContain('delete_simulator');
      expect(toolNames).toContain('reset_simulator');
      expect(toolNames).toContain('capture_screenshot');
      expect(toolNames).toContain('record_video');
    });
  });

  describe('SwiftTools', () => {
    let swiftTools: SwiftTools;

    beforeEach(() => {
      swiftTools = new SwiftTools();
    });

    test('should provide Swift development tools', () => {
      const tools = swiftTools.getTools();
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('analyze_swift_code');
      expect(toolNames).toContain('format_swift_code');
      expect(toolNames).toContain('run_swift_tests');
      expect(toolNames).toContain('create_swift_file');
    });

    test('should include enhanced Swift tools', () => {
      const tools = swiftTools.getTools();
      const toolNames = tools.map(t => t.name);
      
      expect(toolNames).toContain('create_swift_package');
      expect(toolNames).toContain('generate_documentation');
    });
  });

  describe('ProjectTools', () => {
    let projectTools: ProjectTools;

    beforeEach(() => {
      projectTools = new ProjectTools();
    });

    test('should provide project management tools', () => {
      const tools = projectTools.getTools();
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('create_xcode_project');
      expect(toolNames).toContain('find_xcode_projects');
      expect(toolNames).toContain('analyze_project_structure');
      expect(toolNames).toContain('add_swift_package');
    });

    test('should include Swift Package management tools', () => {
      const tools = projectTools.getTools();
      const toolNames = tools.map(t => t.name);
      
      expect(toolNames).toContain('remove_swift_package');
      expect(toolNames).toContain('list_swift_packages');
      expect(toolNames).toContain('update_project_settings');
    });
  });
});
