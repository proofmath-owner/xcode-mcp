import { XcodeMCPError, ErrorCode } from '../src/types';

describe('XcodeMCPError', () => {
  test('should create error with code and message', () => {
    const error = new XcodeMCPError('Test error', ErrorCode.BUILD_FAILED);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.BUILD_FAILED);
    expect(error.name).toBe('XcodeMCPError');
  });

  test('should include details when provided', () => {
    const details = { file: 'test.swift', line: 42 };
    const error = new XcodeMCPError('Compilation error', ErrorCode.BUILD_FAILED, details);
    
    expect(error.details).toEqual(details);
  });

  test('should be instanceof Error', () => {
    const error = new XcodeMCPError('Test', ErrorCode.UNKNOWN_ERROR);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(XcodeMCPError);
  });
});

describe('Error Codes', () => {
  test('should have all required error codes', () => {
    expect(ErrorCode.XCODE_NOT_FOUND).toBeDefined();
    expect(ErrorCode.PROJECT_NOT_FOUND).toBeDefined();
    expect(ErrorCode.BUILD_FAILED).toBeDefined();
    expect(ErrorCode.SIMULATOR_ERROR).toBeDefined();
    expect(ErrorCode.SWIFT_TOOL_MISSING).toBeDefined();
    expect(ErrorCode.INVALID_ARGUMENTS).toBeDefined();
    expect(ErrorCode.PERMISSION_DENIED).toBeDefined();
    expect(ErrorCode.UNKNOWN_ERROR).toBeDefined();
  });
});
