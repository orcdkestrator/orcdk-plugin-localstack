/**
 * Utility functions for LocalStack plugin
 */

/**
 * Expands environment variables in a string
 * Supports ${VAR_NAME} and $VAR_NAME syntax
 * 
 * @param value The string potentially containing environment variables
 * @returns The string with environment variables expanded
 */
export function expandEnvironmentVariables(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  // Replace ${VAR_NAME} style variables
  let expanded = value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const envValue = process.env[varName];
    return envValue !== undefined ? envValue : match;
  });

  // Replace $VAR_NAME style variables (but not if followed by { to avoid double replacement)
  expanded = expanded.replace(/\$([A-Za-z_][A-Za-z0-9_]*)(?!\{)/g, (match, varName) => {
    const envValue = process.env[varName];
    return envValue !== undefined ? envValue : match;
  });

  return expanded;
}

/**
 * Recursively expands environment variables in an object
 * 
 * @param obj The object potentially containing environment variables in string values
 * @returns The object with environment variables expanded in all string values
 */
export function expandEnvironmentVariablesInObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return expandEnvironmentVariables(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => expandEnvironmentVariablesInObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvironmentVariablesInObject(value);
    }
    return result as unknown as T;
  }

  return obj;
}