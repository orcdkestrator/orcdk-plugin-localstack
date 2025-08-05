import { getFileExtensionsForRuntime, DEFAULT_RUNTIME_FILE_EXTENSIONS, DEFAULT_FILE_EXTENSIONS } from '../runtime-config';

describe('Runtime Configuration', () => {
  describe('DEFAULT_RUNTIME_FILE_EXTENSIONS', () => {
    it('should have Python runtime mappings', () => {
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['python']).toEqual(['.py']);
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['python3.8']).toEqual(['.py']);
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['python3.12']).toEqual(['.py']);
    });

    it('should have Node.js runtime mappings', () => {
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['nodejs18.x']).toContain('.js');
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['nodejs18.x']).toContain('.ts');
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['nodejs18.x']).toContain('.mjs');
    });

    it('should have Java runtime mappings', () => {
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['java11']).toContain('.java');
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['java11']).toContain('.jar');
    });

    it('should have other runtime mappings', () => {
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['dotnet6']).toContain('.cs');
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['ruby3.2']).toContain('.rb');
      expect(DEFAULT_RUNTIME_FILE_EXTENSIONS['go1.x']).toContain('.go');
    });
  });

  describe('getFileExtensionsForRuntime', () => {
    it('should return extensions for exact runtime match', () => {
      expect(getFileExtensionsForRuntime('python3.8')).toEqual(['.py']);
      expect(getFileExtensionsForRuntime('nodejs18.x')).toEqual(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
    });

    it('should handle future runtime versions gracefully', () => {
      // Python 3.13 doesn't exist yet but should work
      expect(getFileExtensionsForRuntime('python3.13')).toEqual(['.py']);
      
      // Node.js 24.x doesn't exist yet but should work
      expect(getFileExtensionsForRuntime('nodejs24.x')).toEqual(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
      
      // Java 25 doesn't exist yet but should work
      expect(getFileExtensionsForRuntime('java25')).toEqual(['.java', '.jar', '.class']);
    });

    it('should return default extensions for unknown runtimes', () => {
      expect(getFileExtensionsForRuntime('unknown-runtime')).toEqual(DEFAULT_FILE_EXTENSIONS);
      expect(getFileExtensionsForRuntime('custom-lang-1.0')).toEqual(DEFAULT_FILE_EXTENSIONS);
    });

    it('should use custom mappings when provided', () => {
      const customMappings = {
        'mylang': ['.ml', '.mli'],
        'python3.8': ['.py', '.pyx', '.pyi'], // Override default
      };

      expect(getFileExtensionsForRuntime('mylang', customMappings)).toEqual(['.ml', '.mli']);
      expect(getFileExtensionsForRuntime('python3.8', customMappings)).toEqual(['.py', '.pyx', '.pyi']);
    });

    it('should handle partial runtime matches', () => {
      // Should match 'python3' when 'python3.99' is not found
      expect(getFileExtensionsForRuntime('python3.99')).toEqual(['.py']);
      
      // Should match 'nodejs' when 'nodejs99.x' is not found
      expect(getFileExtensionsForRuntime('nodejs99.x')).toEqual(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
    });

    it('should handle runtime family matches', () => {
      // Should match 'python' when 'python4' is not found
      expect(getFileExtensionsForRuntime('python4')).toEqual(['.py']);
      
      // Should match 'java' when 'java99' is not found
      expect(getFileExtensionsForRuntime('java99')).toEqual(['.java', '.jar', '.class']);
    });

    it('should be case sensitive', () => {
      // Runtimes are case sensitive in AWS Lambda
      expect(getFileExtensionsForRuntime('Python3.8')).toEqual(DEFAULT_FILE_EXTENSIONS);
      expect(getFileExtensionsForRuntime('NODEJS18.X')).toEqual(DEFAULT_FILE_EXTENSIONS);
    });
  });
});