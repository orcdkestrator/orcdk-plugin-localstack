/**
 * Default runtime file extension mappings for LocalStack hot reloading
 * 
 * This configuration-driven approach allows easy updates without code changes
 * and can be overridden in the plugin configuration
 */

export const DEFAULT_RUNTIME_FILE_EXTENSIONS: Record<string, string[]> = {
  // Python runtimes
  'python': ['.py'],
  'python3': ['.py'],
  'python3.8': ['.py'],
  'python3.9': ['.py'],
  'python3.10': ['.py'],
  'python3.11': ['.py'],
  'python3.12': ['.py'],
  
  // Node.js runtimes
  'nodejs': ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'],
  'nodejs18.x': ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'],
  'nodejs20.x': ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'],
  'nodejs22.x': ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'],
  
  // Java runtimes
  'java': ['.java', '.jar', '.class'],
  'java8': ['.java', '.jar', '.class'],
  'java11': ['.java', '.jar', '.class'],
  'java17': ['.java', '.jar', '.class'],
  'java21': ['.java', '.jar', '.class'],
  
  // .NET runtimes
  'dotnet': ['.cs', '.fs', '.vb', '.dll'],
  'dotnet6': ['.cs', '.fs', '.vb', '.dll'],
  'dotnet8': ['.cs', '.fs', '.vb', '.dll'],
  'dotnetcore3.1': ['.cs', '.fs', '.vb', '.dll'],
  
  // Ruby runtimes
  'ruby': ['.rb'],
  'ruby3.2': ['.rb'],
  'ruby3.3': ['.rb'],
  
  // Go runtimes
  'go': ['.go'],
  'go1.x': ['.go'],
  
  // Rust runtimes (custom runtime)
  'rust': ['.rs'],
  
  // PowerShell
  'powershell': ['.ps1', '.psm1', '.psd1'],
};

// Default extensions for unknown or unconfigured runtimes
export const DEFAULT_FILE_EXTENSIONS = [
  '.py', '.js', '.mjs', '.cjs', '.ts', '.java', '.cs', '.go', '.rb', '.rs'
];

/**
 * Get file extensions for a given runtime
 * 
 * @param runtime The Lambda runtime identifier
 * @param customMappings Optional custom runtime mappings to merge with defaults
 * @returns Array of file extensions to watch
 */
export function getFileExtensionsForRuntime(
  runtime: string,
  customMappings?: Record<string, string[]>
): string[] {
  // Merge custom mappings with defaults
  const runtimeMappings = {
    ...DEFAULT_RUNTIME_FILE_EXTENSIONS,
    ...customMappings
  };
  
  // Check for exact match
  if (runtimeMappings[runtime]) {
    return runtimeMappings[runtime];
  }
  
  // Check for partial match (e.g., "python3.13" matches "python3")
  const runtimeBase = runtime.split('.')[0];
  if (runtimeBase && runtimeMappings[runtimeBase]) {
    return runtimeMappings[runtimeBase];
  }
  
  // Check for runtime family (e.g., "python3.13" matches "python")
  if (runtimeBase) {
    const runtimeFamily = runtimeBase.replace(/[0-9]+$/, '');
    if (runtimeFamily && runtimeMappings[runtimeFamily]) {
      return runtimeMappings[runtimeFamily];
    }
  }
  
  // Return default extensions for unknown runtimes
  return DEFAULT_FILE_EXTENSIONS;
}