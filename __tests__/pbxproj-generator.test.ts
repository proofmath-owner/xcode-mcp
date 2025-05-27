import { PBXProjGenerator } from '../src/pbxproj-generator';

describe('PBXProjGenerator', () => {
  test('should generate valid project file', () => {
    const generator = new PBXProjGenerator('TestApp', 'com.example.testapp');
    const content = generator.generate();

    // Check basic structure
    expect(content).toContain('// !$*UTF8*$!');
    expect(content).toContain('archiveVersion = 1');
    expect(content).toContain('objectVersion = 56');
    expect(content).toContain('TestApp');
    expect(content).toContain('com.example.testapp');

    // Check for required sections
    expect(content).toContain('/* Begin PBXProject section */');
    expect(content).toContain('/* Begin PBXNativeTarget section */');
    expect(content).toContain('/* Begin PBXBuildFile section */');
    expect(content).toContain('/* Begin PBXFileReference section */');

    // Check for build settings
    expect(content).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.example.testapp');
    expect(content).toContain('SWIFT_VERSION = 5.0');
    expect(content).toContain('IPHONEOS_DEPLOYMENT_TARGET = 17.0');
  });

  test('should generate unique UUIDs', () => {
    const generator = new PBXProjGenerator('TestApp', 'com.example.testapp');
    const content = generator.generate();

    // Extract all UUIDs
    const uuidPattern = /[A-F0-9]{24}/g;
    const uuids = content.match(uuidPattern) || [];
    const uniqueUuids = [...new Set(uuids)];

    // All UUIDs should be unique
    expect(uniqueUuids.length).toBe(uuids.length);
    expect(uniqueUuids.length).toBeGreaterThan(10); // Should have many UUIDs
  });
});
