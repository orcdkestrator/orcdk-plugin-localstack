const mockExec = jest.fn();

jest.mock('util', () => ({
  promisify: () => mockExec,
}));

import { LocalStackCLI } from '../cli';

describe('LocalStackCLI', () => {
  let cli: LocalStackCLI;

  beforeEach(() => {
    jest.clearAllMocks();
    cli = new LocalStackCLI();
  });

  describe('createHotReloadFunction', () => {
    it('should create hot reload function with correct parameters', async () => {
      mockExec.mockResolvedValue(undefined);

      await cli.createHotReloadFunction(
        'my-function',
        '/absolute/path/to/code',
        'handler.function',
        'python3.8',
        { DEBUG: '1' }
      );

      expect(mockExec).toHaveBeenCalledWith(
        'awslocal lambda create-function --function-name my-function --code S3Bucket="hot-reload",S3Key="/absolute/path/to/code" --handler handler.function --runtime python3.8',
        { env: { ...process.env, DEBUG: '1' } }
      );
    });

    it('should throw error for non-absolute path', async () => {
      await expect(
        cli.createHotReloadFunction(
          'my-function',
          'relative/path',
          'handler.function',
          'python3.8'
        )
      ).rejects.toThrow('LocalStack hot reload requires absolute path, got: relative/path. Path should be resolved before calling this method.');

      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should handle execution without environment variables', async () => {
      mockExec.mockResolvedValue(undefined);

      await cli.createHotReloadFunction(
        'my-function',
        '/absolute/path/to/code',
        'handler.function',
        'nodejs18.x'
      );

      expect(mockExec).toHaveBeenCalledWith(
        'awslocal lambda create-function --function-name my-function --code S3Bucket="hot-reload",S3Key="/absolute/path/to/code" --handler handler.function --runtime nodejs18.x',
        { env: { ...process.env } }
      );
    });

    it('should propagate execution errors', async () => {
      const error = new Error('AWS CLI error');
      mockExec.mockRejectedValue(error);

      await expect(
        cli.createHotReloadFunction(
          'my-function',
          '/absolute/path/to/code',
          'handler.function',
          'python3.8'
        )
      ).rejects.toThrow('AWS CLI error');
    });

    it('should use custom hot reload bucket from environment variable', async () => {
      const originalEnv = process.env.LOCALSTACK_HOT_RELOAD_BUCKET;
      process.env.LOCALSTACK_HOT_RELOAD_BUCKET = 'custom-hot-reload';
      mockExec.mockResolvedValue(undefined);

      await cli.createHotReloadFunction(
        'my-function',
        '/absolute/path/to/code',
        'handler.function',
        'python3.8'
      );

      expect(mockExec).toHaveBeenCalledWith(
        'awslocal lambda create-function --function-name my-function --code S3Bucket="custom-hot-reload",S3Key="/absolute/path/to/code" --handler handler.function --runtime python3.8',
        { env: { ...process.env } }
      );

      // Restore original value
      if (originalEnv === undefined) {
        delete process.env.LOCALSTACK_HOT_RELOAD_BUCKET;
      } else {
        process.env.LOCALSTACK_HOT_RELOAD_BUCKET = originalEnv;
      }
    });
  });
});