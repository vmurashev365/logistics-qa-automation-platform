/**
 * Odoo JSON-RPC Client
 * Specialized client for Odoo's JSON-RPC API
 */

import { retry } from '../../utils/retry';
import {
  OdooJsonRpcRequest,
  OdooJsonRpcResponse,
  OdooAuthResult,
  OdooError,
  OdooDomain,
} from '../../types/api';

export interface OdooClientConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

/**
 * Odoo JSON-RPC API Client
 * Provides typed access to Odoo's ORM methods via JSON-RPC
 */
export class OdooJsonRpcClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private requestId: number = 0;

  // Session state
  private sessionId?: string;
  private uid?: number;
  private authenticatedDb?: string;
  private context: Record<string, unknown> = {};

  constructor(config: OdooClientConfig | string) {
    if (typeof config === 'string') {
      this.baseUrl = config.replace(/\/+$/, '');
      this.timeout = 30000;
      this.retries = 3;
    } else {
      this.baseUrl = config.baseUrl.replace(/\/+$/, '');
      this.timeout = config.timeout ?? 30000;
      this.retries = config.retries ?? 3;
    }
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  /**
   * Authenticate with Odoo
   * @param db - Database name
   * @param login - Username
   * @param password - User password
   * @returns Authentication result with session info
   */
  async authenticate(db: string, login: string, password: string): Promise<OdooAuthResult> {
    const response = await this.callJsonRpc<OdooAuthResult>(
      '/web/session/authenticate',
      {
        db,
        login,
        password,
      }
    );

    if (!response.uid) {
      throw new Error('Authentication failed: Invalid credentials');
    }

    // Store session info - session_id comes from response body in Odoo
    if (response.session_id) {
      this.sessionId = response.session_id;
    }
    this.uid = response.uid;
    this.authenticatedDb = db;
    this.context = response.user_context as Record<string, unknown>;
    
    console.log(`[OdooJsonRpcClient] Authenticated: uid=${this.uid}, session=${this.sessionId ? 'present' : 'missing'}`);

    return response;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.uid !== undefined && this.uid > 0;
  }

  /**
   * Get current user ID
   */
  getUid(): number | undefined {
    return this.uid;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /**
   * Get authenticated database name
   */
  getDatabase(): string | undefined {
    return this.authenticatedDb;
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    try {
      await this.callJsonRpc('/web/session/destroy', {});
    } finally {
      this.sessionId = undefined;
      this.uid = undefined;
      this.authenticatedDb = undefined;
      this.context = {};
    }
  }

  // ==========================================================================
  // ORM Methods
  // ==========================================================================

  /**
   * Search for record IDs matching domain
   * @param model - Model name (e.g., 'fleet.vehicle')
   * @param domain - Search domain
   * @param options - Optional limit, offset, order
   */
  async search(
    model: string,
    domain: OdooDomain = [],
    options?: { limit?: number; offset?: number; order?: string }
  ): Promise<number[]> {
    this.ensureAuthenticated();

    return this.callModel<number[]>(model, 'search', [domain], {
      limit: options?.limit,
      offset: options?.offset,
      order: options?.order,
    });
  }

  /**
   * Read records by IDs
   * @param model - Model name
   * @param ids - Record IDs to read
   * @param fields - Fields to fetch (empty = all fields)
   */
  async read<T = Record<string, unknown>>(
    model: string,
    ids: number[],
    fields: string[] = []
  ): Promise<T[]> {
    this.ensureAuthenticated();

    return this.callModel<T[]>(model, 'read', [ids, fields]);
  }

  /**
   * Search and read in one call
   * @param model - Model name
   * @param domain - Search domain
   * @param fields - Fields to fetch
   * @param options - Optional limit, offset, order
   */
  async searchRead<T = Record<string, unknown>>(
    model: string,
    domain: OdooDomain = [],
    fields: string[] = [],
    options?: { limit?: number; offset?: number; order?: string }
  ): Promise<T[]> {
    this.ensureAuthenticated();

    return this.callModel<T[]>(model, 'search_read', [], {
      domain,
      fields,
      limit: options?.limit,
      offset: options?.offset,
      order: options?.order,
    });
  }

  /**
   * Create a new record
   * @param model - Model name
   * @param values - Field values for new record
   * @returns Created record ID
   */
  async create(model: string, values: Record<string, unknown>): Promise<number> {
    this.ensureAuthenticated();

    return this.callModel<number>(model, 'create', [values]);
  }

  /**
   * Update existing records
   * @param model - Model name
   * @param ids - Record IDs to update
   * @param values - Field values to update
   * @returns True if successful
   */
  async write(
    model: string,
    ids: number[],
    values: Record<string, unknown>
  ): Promise<boolean> {
    this.ensureAuthenticated();

    return this.callModel<boolean>(model, 'write', [ids, values]);
  }

  /**
   * Delete records
   * @param model - Model name
   * @param ids - Record IDs to delete
   * @returns True if successful
   */
  async unlink(model: string, ids: number[]): Promise<boolean> {
    this.ensureAuthenticated();

    return this.callModel<boolean>(model, 'unlink', [ids]);
  }

  /**
   * Count records matching domain
   * @param model - Model name
   * @param domain - Search domain
   */
  async searchCount(model: string, domain: OdooDomain = []): Promise<number> {
    this.ensureAuthenticated();

    return this.callModel<number>(model, 'search_count', [domain]);
  }

  /**
   * Get field definitions for a model
   * @param model - Model name
   * @param allfields - Fields to get info for (empty = all)
   */
  async fieldsGet(
    model: string,
    allfields?: string[]
  ): Promise<Record<string, Record<string, unknown>>> {
    this.ensureAuthenticated();

    return this.callModel(model, 'fields_get', [], {
      allfields: allfields || [],
      attributes: ['string', 'type', 'required', 'readonly', 'selection'],
    });
  }

  // ==========================================================================
  // Low-level JSON-RPC methods
  // ==========================================================================

  /**
   * Call a model method via JSON-RPC
   */
  private async callModel<T>(
    model: string,
    method: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    return this.callJsonRpc<T>('/web/dataset/call_kw', {
      model,
      method,
      args,
      kwargs: {
        context: this.context,
        ...kwargs,
      },
    });
  }

  /**
   * Make a JSON-RPC call to Odoo
   */
  private async callJsonRpc<T>(
    endpoint: string,
    params: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = ++this.requestId;

    const payload: OdooJsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      id: requestId,
      params,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Include session cookie if authenticated
    if (this.sessionId) {
      headers['Cookie'] = `session_id=${this.sessionId}`;
    }

    const doRequest = async (): Promise<T> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        // Extract session ID from Set-Cookie if present
        // In Node.js, we need to use getSetCookie() or raw headers
        const setCookie = response.headers.get('set-cookie');
        const setCookieAll = response.headers.getSetCookie?.() || [];
        const cookieHeader = setCookie || setCookieAll.join('; ');
        
        if (cookieHeader) {
          const sessionMatch = cookieHeader.match(/session_id=([^;]+)/);
          if (sessionMatch) {
            this.sessionId = sessionMatch[1];
          }
        }

        const jsonResponse = await response.json() as OdooJsonRpcResponse<T>;

        if (jsonResponse.error) {
          console.log(`[OdooJsonRpcClient] Error from ${endpoint}: ${JSON.stringify(jsonResponse.error.data?.message || jsonResponse.error.message)}`);
          throw new OdooApiError(jsonResponse.error);
        }

        if (jsonResponse.result === undefined) {
          throw new Error(`Invalid JSON-RPC response: missing result`);
        }

        return jsonResponse.result;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    return retry(doRequest, {
      attempts: this.retries,
      delay: 1000,
      backoff: 2,
      onRetry: (error, attempt) => {
        console.log(`[OdooJsonRpcClient] Retry ${attempt}/${this.retries} for ${endpoint}: ${error.message}`);
      },
    });
  }

  /**
   * Ensure client is authenticated before making ORM calls
   */
  private ensureAuthenticated(): void {
    if (!this.isAuthenticated()) {
      throw new Error('OdooJsonRpcClient: Not authenticated. Call authenticate() first.');
    }
  }
}

/**
 * Custom error class for Odoo API errors
 */
export class OdooApiError extends Error {
  public readonly code: number;
  public readonly data: OdooError['data'];

  constructor(error: OdooError) {
    super(error.message);
    this.name = 'OdooApiError';
    this.code = error.code;
    this.data = error.data;
  }

  /**
   * Get full debug information
   */
  getDebugInfo(): string {
    return this.data.debug;
  }

  /**
   * Get exception type (e.g., 'ValidationError', 'AccessError')
   */
  getExceptionType(): string | undefined {
    return this.data.exception_type;
  }
}

export default OdooJsonRpcClient;
