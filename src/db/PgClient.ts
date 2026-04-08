/**
 * PostgreSQL Database Client
 * Singleton connection pool for database operations
 * 
 * Features:
 * - Connection pooling for performance
 * - Parameterized queries for SQL injection prevention
 * - Graceful shutdown support
 * - Error handling with clear messages
 */

import { Pool, PoolConfig, PoolClient } from 'pg';
import { QUERIES } from './queries';

/**
 * PostgreSQL connection configuration
 */
export interface PgClientConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  /** Maximum number of clients in the pool (default: 10) */
  maxConnections?: number;
  /** Idle timeout in milliseconds (default: 30000) */
  idleTimeoutMillis?: number;
  /** Connection timeout in milliseconds (default: 5000) */
  connectionTimeoutMillis?: number;
}

/**
 * Vehicle record from database
 */
export interface VehicleRecord {
  id: number;
  license_plate: string;
  model_id: number | null;
  driver_id: number | null;
  state_id: number | null;
  active: boolean;
  company_id: number | null;
  create_date: Date;
  write_date: Date;
}

/**
 * Vehicle with driver information
 */
export interface VehicleWithDriver {
  vehicle_id: number;
  license_plate: string;
  state_id: number | null;
  driver_id: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_email: string | null;
}

/**
 * Driver record from database
 */
export interface DriverRecord {
  id: number;
  name: string;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  active: boolean;
}

/**
 * PostgreSQL Database Client
 * Implements singleton pattern for connection pooling
 */
export class PgClient {
  private static pool: Pool | null = null;
  private static instance: PgClient | null = null;

  /**
   * Private constructor - use getInstance() instead
   */
   
  private constructor(_config: PgClientConfig) {
    // Config stored in pool, not needed in instance
  }

  /**
   * Get singleton instance of PgClient
   * Creates connection pool on first call
   */
  static getInstance(config: PgClientConfig): PgClient {
    if (!PgClient.instance) {
      PgClient.instance = new PgClient(config);
      PgClient.initializePool(config);
    }
    return PgClient.instance;
  }

  /**
   * Initialize the connection pool
   */
  private static initializePool(config: PgClientConfig): void {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: config.maxConnections ?? 10,
      idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5000,
    };

    PgClient.pool = new Pool(poolConfig);

    // Handle pool errors
    PgClient.pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });

    console.log(`📊 PostgreSQL pool initialized: ${config.host}:${config.port}/${config.database}`);
  }

  /**
   * Execute a parameterized query
   * @param sql - SQL query with $1, $2, etc. placeholders
   * @param params - Array of parameter values
   * @returns Array of result rows
   */
  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!PgClient.pool) {
      throw new Error('PostgreSQL pool not initialized. Call getInstance() first.');
    }

    try {
      const result = await PgClient.pool.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Database query failed: ${message}`);
    }
  }

  /**
   * Execute a query and return the first row or null
   */
  async queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Execute a query within a transaction
   * @param callback - Function receiving a PoolClient to execute queries
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!PgClient.pool) {
      throw new Error('PostgreSQL pool not initialized. Call getInstance() first.');
    }

    const client = await PgClient.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // VEHICLE OPERATIONS
  // ============================================

  /**
   * Get vehicle by license plate
   */
  async getVehicleByPlate(plate: string): Promise<VehicleRecord | null> {
    return this.queryOne<VehicleRecord>(QUERIES.GET_VEHICLE_BY_PLATE, [plate]);
  }

  /**
   * Get vehicle odometer value
   */
  async getVehicleOdometer(plate: string): Promise<number | null> {
    const result = await this.queryOne<{ odometer_value: number }>(
      QUERIES.GET_VEHICLE_ODOMETER, 
      [plate]
    );
    return result?.odometer_value ?? null;
  }

  /**
   * Check if vehicle exists
   */
  async vehicleExists(plate: string): Promise<boolean> {
    const result = await this.queryOne<{ exists: boolean }>(
      QUERIES.VEHICLE_EXISTS, 
      [plate]
    );
    return result?.exists ?? false;
  }

  /**
   * Get vehicle with driver information
   */
  async getVehicleWithDriver(plate: string): Promise<VehicleWithDriver | null> {
    return this.queryOne<VehicleWithDriver>(QUERIES.GET_VEHICLE_WITH_DRIVER, [plate]);
  }

  /**
   * Get all vehicles for a driver
   */
  async getVehiclesByDriver(driverName: string): Promise<VehicleRecord[]> {
    return this.query<VehicleRecord>(QUERIES.GET_VEHICLES_BY_DRIVER, [`%${driverName}%`]);
  }

  /**
   * Count vehicles matching a pattern
   */
  async countVehiclesByPattern(pattern: string): Promise<number> {
    const result = await this.queryOne<{ count: string }>(
      QUERIES.COUNT_VEHICLES_BY_PATTERN, 
      [pattern]
    );
    return parseInt(result?.count ?? '0', 10);
  }

  // ============================================
  // DRIVER OPERATIONS
  // ============================================

  /**
   * Get driver by name
   */
  async getDriverByName(name: string): Promise<DriverRecord | null> {
    return this.queryOne<DriverRecord>(QUERIES.GET_DRIVER_BY_NAME, [`%${name}%`]);
  }

  /**
   * Get driver by phone number
   */
  async getDriverByPhone(phone: string): Promise<DriverRecord | null> {
    return this.queryOne<DriverRecord>(QUERIES.GET_DRIVER_BY_PHONE, [phone]);
  }

  /**
   * Check if driver exists
   */
  async driverExists(name: string): Promise<boolean> {
    const result = await this.queryOne<{ exists: boolean }>(
      QUERIES.DRIVER_EXISTS, 
      [`%${name}%`]
    );
    return result?.exists ?? false;
  }

  // ============================================
  // TEST DATA CLEANUP
  // ============================================

  /**
   * Delete test vehicles by license plate pattern
   * @param pattern - SQL LIKE pattern (default: 'MD-TEST-%')
   */
  async deleteTestVehicles(pattern: string = 'MD-TEST-%'): Promise<number> {
    const result = await this.query<{ id: number }>(QUERIES.DELETE_TEST_VEHICLES, [pattern]);
    console.log(`🗑️ Deleted ${result.length} test vehicles matching pattern: ${pattern}`);
    return result.length;
  }

  /**
   * Archive test vehicles (soft delete)
   */
  async archiveTestVehicles(pattern: string = 'MD-TEST-%'): Promise<number> {
    const result = await this.query<{ id: number }>(QUERIES.ARCHIVE_TEST_VEHICLES, [pattern]);
    console.log(`📦 Archived ${result.length} test vehicles matching pattern: ${pattern}`);
    return result.length;
  }

  // ============================================
  // GDPR / COMPLIANCE
  // ============================================

  /**
   * Check if driver has personal identifiable information
   */
  async driverHasPII(name: string): Promise<boolean> {
    const result = await this.queryOne<{ has_pii: boolean }>(
      QUERIES.CHECK_DRIVER_PII_EXISTS, 
      [name]
    );
    return result?.has_pii ?? false;
  }

  /**
   * Get driver PII data for GDPR report
   */
  async getDriverPIIData(name: string): Promise<Record<string, unknown> | null> {
    return this.queryOne(QUERIES.GET_DRIVER_PII_DATA, [name]);
  }

  // ============================================
  // POOL MANAGEMENT
  // ============================================

  /**
   * Close the connection pool
   * Call this in AfterAll hook
   */
  static async closePool(): Promise<void> {
    if (PgClient.pool) {
      await PgClient.pool.end();
      PgClient.pool = null;
      PgClient.instance = null;
      console.log('🔒 PostgreSQL pool closed');
    }
  }

  /**
   * Get pool statistics
   */
  static getPoolStats(): { total: number; idle: number; waiting: number } | null {
    if (!PgClient.pool) return null;
    
    return {
      total: PgClient.pool.totalCount,
      idle: PgClient.pool.idleCount,
      waiting: PgClient.pool.waitingCount,
    };
  }

  /**
   * Check if pool is healthy (can execute a simple query)
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export default PgClient;
