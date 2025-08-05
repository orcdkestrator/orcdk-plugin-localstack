import { getFileExtensionsForRuntime } from '../runtime-config';

// Test runtime configuration approach
describe('Runtime Configuration', () => {
  describe('getFileExtensionsForRuntime', () => {
    const testCases = [
      { runtime: 'python3.8', expected: ['.py'] },
      { runtime: 'python3.13', expected: ['.py'] }, // Future version
      { runtime: 'nodejs18.x', expected: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'] },
      { runtime: 'nodejs24.x', expected: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'] }, // Future version
      { runtime: 'java11', expected: ['.java', '.jar', '.class'] },
      { runtime: 'java25', expected: ['.java', '.jar', '.class'] }, // Future version
      { runtime: 'dotnet8', expected: ['.cs', '.fs', '.vb', '.dll'] },
      { runtime: 'ruby3.2', expected: ['.rb'] },
      { runtime: 'go1.x', expected: ['.go'] },
      { runtime: 'unknown-runtime', expected: ['.py', '.js', '.mjs', '.cjs', '.ts', '.java', '.cs', '.go', '.rb', '.rs'] },
    ];

    testCases.forEach(({ runtime, expected }) => {
      it(`should return correct extensions for ${runtime}`, () => {
        const result = getFileExtensionsForRuntime(runtime);
        expect(result).toEqual(expected);
      });
    });

    it('should use custom mappings when provided', () => {
      const customMappings = {
        'custom-runtime': ['.custom', '.ext'],
        'python3.8': ['.py', '.pyx'], // Override default
      };

      expect(getFileExtensionsForRuntime('custom-runtime', customMappings)).toEqual(['.custom', '.ext']);
      expect(getFileExtensionsForRuntime('python3.8', customMappings)).toEqual(['.py', '.pyx']);
    });

    it('should handle runtime families correctly', () => {
      // python3.13 -> python3 -> python
      expect(getFileExtensionsForRuntime('python3.13')).toEqual(['.py']);
      
      // nodejs22.x -> nodejs22 -> nodejs
      expect(getFileExtensionsForRuntime('nodejs22.x')).toEqual(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
      
      // java25 -> java
      expect(getFileExtensionsForRuntime('java25')).toEqual(['.java', '.jar', '.class']);
    });
  });
});