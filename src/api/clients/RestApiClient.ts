/**
 * REST API Client
 * Generic HTTP client with retry logic and response caching
 */

import { retry, RetryOptions } from '../../utils/retry';
import { HttpResponse, HttpRequestOptions } from '../../types/api';

export interface RestApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retryOptions?: Partial<RetryOptions>;
}

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

const DEFAULT_TIMEOUT = 30000; // 30 seconds

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  attempts: 3,
  delay: 1000,
  backoff: 2,
};

/**
 * Generic REST API Client with retry support
 */
export class RestApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retryOptions: RetryOptions;

  constructor(config: RestApiClientConfig | string) {
    if (typeof config === 'string') {
      this.baseUrl = config;
      this.defaultHeaders = { ...DEFAULT_HEADERS };
      this.timeout = DEFAULT_TIMEOUT;
      this.retryOptions = { ...DEFAULT_RETRY_OPTIONS };
    } else {
      this.baseUrl = config.baseUrl;
      this.defaultHeaders = { ...DEFAULT_HEADERS, ...config.defaultHeaders };
      this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
      this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...config.retryOptions };
    }

    // Ensure baseUrl doesn't end with /
    this.baseUrl = this.baseUrl.replace(/\/+$/, '');
  }

  /**
   * Make an HTTP request with retry logic
   */
  async request<T = unknown>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint);
    const headers = { ...this.defaultHeaders, ...options?.headers };
    const timeout = options?.timeout ?? this.timeout;

    const fetchFn = async (): Promise<HttpResponse<T>> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: method.toUpperCase(),
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        // Parse response headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Parse response body
        let responseBody: T;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          responseBody = await response.json() as T;
        } else {
          responseBody = await response.text() as unknown as T;
        }

        return {
          status: response.status,
          headers: responseHeaders,
          body: responseBody,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Execute with retry logic
    const retryOpts: Partial<RetryOptions> = {
      ...this.retryOptions,
      attempts: options?.retries ?? this.retryOptions.attempts,
      onRetry: (error, attempt) => {
        console.log(`[RestApiClient] Retry ${attempt}/${this.retryOptions.attempts} for ${method} ${url}: ${error.message}`);
      },
    };

    return retry(fetchFn, retryOpts);
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    // If endpoint is already a full URL, return as-is
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    
    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  // ==========================================================================
  // Convenience methods for common HTTP verbs
  // ==========================================================================

  /**
   * HTTP GET request
   */
  async get<T = unknown>(
    endpoint: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * HTTP POST request
   */
  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', endpoint, body, options);
  }

  /**
   * HTTP PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  /**
   * HTTP PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  /**
   * HTTP DELETE request
   */
  async delete<T = unknown>(
    endpoint: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // ==========================================================================
  // Configuration methods
  // ==========================================================================

  /**
   * Set a default header for all requests
   */
  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Remove a default header
   */
  removeHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  /**
   * Set authorization header
   */
  setAuthorization(token: string, type: string = 'Bearer'): void {
    this.setHeader('Authorization', `${type} ${token}`);
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Update the base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }
}

export default RestApiClient;
