import { expandEnvironmentVariables, expandEnvironmentVariablesInObject } from '../utils';

describe('LocalStack Utils', () => {
  describe('expandEnvironmentVariables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.TEST_VAR = 'test-value';
      process.env.LAMBDA_PATH = '/path/to/lambda';
      process.env.FUNCTION_PREFIX = 'my-prefix';
      process.env.ENV_NAME = 'development';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should expand ${VAR_NAME} style variables', () => {
      const input = '${TEST_VAR}/subfolder';
      const result = expandEnvironmentVariables(input);
      expect(result).toBe('test-value/subfolder');
    });

    it('should expand $VAR_NAME style variables', () => {
      const input = '$TEST_VAR/subfolder';
      const result = expandEnvironmentVariables(input);
      expect(result).toBe('test-value/subfolder');
    });

    it('should handle multiple variables in one string', () => {
      const input = '${LAMBDA_PATH}/${FUNCTION_PREFIX}-function';
      const result = expandEnvironmentVariables(input);
      expect(result).toBe('/path/to/lambda/my-prefix-function');
    });

    it('should handle mixed variable styles', () => {
      const input = '$LAMBDA_PATH/${FUNCTION_PREFIX}-function';
      const result = expandEnvironmentVariables(input);
      expect(result).toBe('/path/to/lambda/my-prefix-function');
    });

    it('should leave undefined variables unchanged', () => {
      const input = '${UNDEFINED_VAR}/path';
      const result = expandEnvironmentVariables(input);
      expect(result).toBe('${UNDEFINED_VAR}/path');
    });

    it('should handle empty strings', () => {
      const result = expandEnvironmentVariables('');
      expect(result).toBe('');
    });

    it('should handle null/undefined input', () => {
      expect(expandEnvironmentVariables(null as any)).toBe(null);
      expect(expandEnvironmentVariables(undefined as any)).toBe(undefined);
    });

    it('should not expand $VAR_NAME when followed by {', () => {
      const input = '$TEST_VAR${TEST_VAR}';
      const result = expandEnvironmentVariables(input);
      expect(result).toBe('$TEST_VARtest-value');
    });

    it('should handle paths with environment variables', () => {
      const input = './lambdas/${ENV_NAME}/${FUNCTION_PREFIX}-handler';
      const result = expandEnvironmentVariables(input);
      expect(result).toBe('./lambdas/development/my-prefix-handler');
    });
  });

  describe('expandEnvironmentVariablesInObject', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.LAMBDA_PATH = '/path/to/lambda';
      process.env.FUNCTION_PREFIX = 'my-prefix';
      process.env.HANDLER_NAME = 'handler';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should expand variables in object properties', () => {
      const input = {
        functionName: '${FUNCTION_PREFIX}-function',
        localPath: '${LAMBDA_PATH}/functions',
        handler: '${HANDLER_NAME}.main'
      };
      
      const result = expandEnvironmentVariablesInObject(input);
      
      expect(result).toEqual({
        functionName: 'my-prefix-function',
        localPath: '/path/to/lambda/functions',
        handler: 'handler.main'
      });
    });

    it('should handle nested objects', () => {
      const input = {
        config: {
          path: '${LAMBDA_PATH}',
          nested: {
            name: '${FUNCTION_PREFIX}-nested'
          }
        }
      };
      
      const result = expandEnvironmentVariablesInObject(input);
      
      expect(result).toEqual({
        config: {
          path: '/path/to/lambda',
          nested: {
            name: 'my-prefix-nested'
          }
        }
      });
    });

    it('should handle arrays', () => {
      const input = {
        paths: [
          '${LAMBDA_PATH}/function1',
          '${LAMBDA_PATH}/function2'
        ]
      };
      
      const result = expandEnvironmentVariablesInObject(input);
      
      expect(result).toEqual({
        paths: [
          '/path/to/lambda/function1',
          '/path/to/lambda/function2'
        ]
      });
    });

    it('should handle arrays of objects', () => {
      const input = {
        lambdaPaths: [
          {
            functionName: '${FUNCTION_PREFIX}-1',
            localPath: '${LAMBDA_PATH}/func1'
          },
          {
            functionName: '${FUNCTION_PREFIX}-2',
            localPath: '${LAMBDA_PATH}/func2'
          }
        ]
      };
      
      const result = expandEnvironmentVariablesInObject(input);
      
      expect(result).toEqual({
        lambdaPaths: [
          {
            functionName: 'my-prefix-1',
            localPath: '/path/to/lambda/func1'
          },
          {
            functionName: 'my-prefix-2',
            localPath: '/path/to/lambda/func2'
          }
        ]
      });
    });

    it('should preserve non-string values', () => {
      const input = {
        enabled: true,
        count: 42,
        nullable: null,
        path: '${LAMBDA_PATH}'
      };
      
      const result = expandEnvironmentVariablesInObject(input);
      
      expect(result).toEqual({
        enabled: true,
        count: 42,
        nullable: null,
        path: '/path/to/lambda'
      });
    });

    it('should handle null/undefined input', () => {
      expect(expandEnvironmentVariablesInObject(null)).toBe(null);
      expect(expandEnvironmentVariablesInObject(undefined)).toBe(undefined);
    });
  });
});