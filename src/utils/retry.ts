/**
 * Retry Utility
 * Provides exponential backoff retry logic for flaky operations
 */

export interface RetryOptions {
  /** Number of retry attempts (default: 3) */
  attempts: number;
  /** Initial delay in milliseconds (default: 1000) */
  delay: number;
  /** Multiplier for each retry (default: 2) */
  backoff: number;
  /** Optional callback on each retry */
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  attempts: 3,
  delay: 1000,
  backoff: 2,
};

/**
 * Execute a function with exponential backoff retry logic
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws Last error if all retries fail
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error('No attempts made');
  let currentDelay = opts.delay;

  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === opts.attempts) {
        // Last attempt failed, throw the error
        break;
      }

      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt);
      }

      // Wait before next attempt with exponential backoff
      await sleep(currentDelay);
      currentDelay *= opts.backoff;
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retry wrapper with preset options
 * @param defaultOptions - Default retry options
 * @returns Retry function with preset options
 */
export function createRetrier(defaultOptions: Partial<RetryOptions>) {
  return <T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T> => {
    return retry(fn, { ...defaultOptions, ...options });
  };
}

export default retry;
