import {
  isValidBundleId,
  isValidProjectPath,
  validateScheme,
  getProjectType,
  getProjectFlag,
  parseBuildOutput,
  parseTestOutput,
} from '../src/utils';

describe('Utils', () => {
  describe('isValidBundleId', () => {
    test('should validate correct bundle IDs', () => {
      expect(isValidBundleId('com.example.app')).toBe(true);
      expect(isValidBundleId('com.company.product.app')).toBe(true);
      expect(isValidBundleId('org.opensource.project')).toBe(true);
    });

    test('should reject invalid bundle IDs', () => {
      expect(isValidBundleId('example')).toBe(false);
      expect(isValidBundleId('com.example')).toBe(false);
      expect(isValidBundleId('com..example.app')).toBe(false);
      expect(isValidBundleId('.com.example.app')).toBe(false);
      expect(isValidBundleId('com.example.app.')).toBe(false);
      expect(isValidBundleId('com.example.app with spaces')).toBe(false);
    });
  });

  describe('isValidProjectPath', () => {
    test('should validate project paths', () => {
      expect(isValidProjectPath('/path/to/project.xcodeproj')).toBe(true);
      expect(isValidProjectPath('/path/to/workspace.xcworkspace')).toBe(true);
    });

    test('should reject invalid project paths', () => {
      expect(isValidProjectPath('/path/to/file.swift')).toBe(false);
      expect(isValidProjectPath('/path/to/directory/')).toBe(false);
      expect(isValidProjectPath('project')).toBe(false);
    });
  });

  describe('validateScheme', () => {
    test('should validate scheme names', () => {
      expect(validateScheme('MyApp')).toBe(true);
      expect(validateScheme('MyApp-Debug')).toBe(true);
      expect(validateScheme('My App')).toBe(true);
      expect(validateScheme('App_2024')).toBe(true);
    });

    test('should reject invalid scheme names', () => {
      expect(validateScheme('My@App')).toBe(false);
      expect(validateScheme('My#App')).toBe(false);
      expect(validateScheme('')).toBe(false);
    });
  });

  describe('getProjectType', () => {
    test('should identify project types', () => {
      expect(getProjectType('MyApp.xcodeproj')).toBe('project');
      expect(getProjectType('MyApp.xcworkspace')).toBe('workspace');
    });
  });

  describe('getProjectFlag', () => {
    test('should return correct flags', () => {
      expect(getProjectFlag('MyApp.xcodeproj')).toBe('-project');
      expect(getProjectFlag('MyApp.xcworkspace')).toBe('-workspace');
    });
  });

  describe('parseBuildOutput', () => {
    test('should parse successful build output', () => {
      const output = `
        CompileSwift normal x86_64 MyFile.swift
        warning: deprecated API
        ** BUILD SUCCEEDED in 5.2s **
      `;

      const result = parseBuildOutput(output);
      expect(result.success).toBe(true);
      expect(result.warnings).toBe(1);
      expect(result.errors).toBe(0);
      expect(result.duration).toBe(5.2);
    });

    test('should parse failed build output', () => {
      const output = `
        CompileSwift normal x86_64 MyFile.swift
        error: cannot find 'foo' in scope
        error: missing return in function
        ** BUILD FAILED **
      `;

      const result = parseBuildOutput(output);
      expect(result.success).toBe(false);
      expect(result.errors).toBe(2);
    });
  });

  describe('parseTestOutput', () => {
    test('should parse test results', () => {
      const output = `
        Test Case '-[MyAppTests.MyTest testExample]' started.
        Test Case '-[MyAppTests.MyTest testExample]' passed (0.001 seconds).
        Test Case '-[MyAppTests.MyTest testFailure]' started.
        Test Case '-[MyAppTests.MyTest testFailure]' failed (0.002 seconds).
      `;

      const result = parseTestOutput(output);
      expect(result.totalTests).toBe(2);
      expect(result.passedTests).toBe(1);
      expect(result.failedTests).toBe(1);
      expect(result.failures).toHaveLength(1);
    });
  });
});
