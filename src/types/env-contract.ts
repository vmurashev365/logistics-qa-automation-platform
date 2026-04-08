/**
 * Service Environment Contract
 *
 * These variables define external integration points used by higher-level
 * domain modules (finance compliance, offline sync, CTI screen pop).
 */

export interface FinanceEnvContract {
  /** Base URL for REST services under test (e.g. https://api.qa.example.com) */
  apiBaseUrl: string;
  /** Bearer token (without the "Bearer" prefix) used for REST API auth */
  apiAuthToken: string;

  /** REST endpoint path for salary calculation (relative to apiBaseUrl or absolute URL) */
  financeSalaryEndpoint: string;
  /** REST endpoint path for IFTA calculation (relative to apiBaseUrl or absolute URL) */
  financeIftaEndpoint: string;
}

export interface OfflineSyncEnvContract {
  /** Base URL for REST services under test (e.g. https://api.qa.example.com) */
  apiBaseUrl: string;
  /** Bearer token (without the "Bearer" prefix) used for REST API auth */
  apiAuthToken: string;

  /** Base URL for Odoo web UI (e.g. https://odoo.qa.example.com) */
  odooBaseUrl: string;
  /** Odoo UI username */
  odooUser: string;
  /** Odoo UI password */
  odooPass: string;

  /** REST endpoint path for load sync status polling (relative to apiBaseUrl or absolute URL) */
  loadStatusEndpoint: string;
}

export interface CtiEnvContract {
  /** Base URL for Odoo web UI (e.g. https://odoo.qa.example.com) */
  odooBaseUrl: string;
  /** Odoo UI username */
  odooUser: string;
  /** Odoo UI password */
  odooPass: string;

  /** WebSocket URL/pattern used by CTI client in the web UI */
  ctiWsPattern: string;
}

export interface HosEnvContract {
  /** Enable demo-only behavior (no real backend). */
  demoMode: boolean;
  /** IANA timezone name (e.g. UTC). */
  timezone: string;
  /** ELD integration mode. */
  eldMode: 'mock' | 'api';
  /** Optional API base URL (required when eldMode=api). */
  eldApiBaseUrl?: string;
  /** Optional API token (required when eldMode=api). */
  eldApiToken?: string;
  /** HOS ruleset identifier (currently FMCSA only). */
  hosRuleset: 'FMCSA';
}

/**
 * Optional test-run metadata used to suffix created entities in shared DEMO/CI.
 *
 * RUN_SUFFIX is preferred; if not set, TEST_RUN_ID may be used.
 */
export interface TestRunEnvContract {
  runSuffix?: string;
  testRunId?: string;
}

/** Full contract (superset) for environments that want to provide everything. */
export type ServiceEnvContract =
  FinanceEnvContract &
  OfflineSyncEnvContract &
  CtiEnvContract &
  HosEnvContract &
  TestRunEnvContract;
