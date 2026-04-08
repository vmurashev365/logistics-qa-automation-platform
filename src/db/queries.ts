/**
 * Database Queries
 * Parameterized SQL queries for Odoo Fleet module
 * 
 * All queries use parameterized placeholders ($1, $2, etc.) to prevent SQL injection.
 * Query names follow the convention: ACTION_ENTITY_DETAILS
 */

export const QUERIES = {
  // ============================================
  // VEHICLE QUERIES
  // ============================================

  /**
   * Get vehicle by license plate
   * Returns full vehicle record with related IDs
   * Note: odometer is stored in fleet_vehicle_odometer table in Odoo 17
   */
  GET_VEHICLE_BY_PLATE: `
    SELECT 
      id, 
      license_plate, 
      model_id, 
      driver_id, 
      state_id,
      active,
      company_id,
      create_date,
      write_date
    FROM fleet_vehicle
    WHERE license_plate = $1
    AND active = true
    LIMIT 1
  `,

  /**
   * Get vehicle odometer value from odometer table
   * In Odoo 17, odometer values are stored in fleet_vehicle_odometer
   */
  GET_VEHICLE_ODOMETER: `
    SELECT COALESCE(
      (SELECT value FROM fleet_vehicle_odometer 
       WHERE vehicle_id = (SELECT id FROM fleet_vehicle WHERE license_plate = $1 AND active = true ORDER BY id DESC LIMIT 1)
       ORDER BY date DESC, id DESC LIMIT 1),
      0
    ) as odometer_value
  `,

  /**
   * Check if vehicle exists by license plate
   */
  VEHICLE_EXISTS: `
    SELECT EXISTS(
      SELECT 1 FROM fleet_vehicle 
      WHERE license_plate = $1 
      AND active = true
    ) as exists
  `,

  /**
   * Get vehicle with driver information
   */
  GET_VEHICLE_WITH_DRIVER: `
    SELECT 
      v.id as vehicle_id,
      v.license_plate,
      v.state_id,
      d.id as driver_id,
      d.name as driver_name,
      d.phone as driver_phone,
      d.email as driver_email
    FROM fleet_vehicle v
    LEFT JOIN res_partner d ON v.driver_id = d.id
    WHERE v.license_plate = $1
    AND v.active = true
    LIMIT 1
  `,

  /**
   * Get all vehicles for a specific driver
   */
  GET_VEHICLES_BY_DRIVER: `
    SELECT 
      v.id,
      v.license_plate,
      v.state_id
    FROM fleet_vehicle v
    JOIN res_partner d ON v.driver_id = d.id
    WHERE d.name ILIKE $1
    AND v.active = true
    ORDER BY v.license_plate
  `,

  /**
   * Count vehicles matching a license plate pattern
   */
  COUNT_VEHICLES_BY_PATTERN: `
    SELECT COUNT(*) as count
    FROM fleet_vehicle
    WHERE license_plate LIKE $1
    AND active = true
  `,

  // ============================================
  // DRIVER QUERIES
  // ============================================

  /**
   * Get driver by name
   */
  GET_DRIVER_BY_NAME: `
    SELECT 
      id,
      name,
      phone,
      mobile,
      email,
      active
    FROM res_partner
    WHERE name ILIKE $1
    AND active = true
    LIMIT 1
  `,

  /**
   * Get driver by phone number
   */
  GET_DRIVER_BY_PHONE: `
    SELECT 
      id,
      name,
      phone,
      mobile,
      email
    FROM res_partner
    WHERE (phone = $1 OR mobile = $1)
    AND active = true
    LIMIT 1
  `,

  /**
   * Check if driver exists
   */
  DRIVER_EXISTS: `
    SELECT EXISTS(
      SELECT 1 FROM res_partner 
      WHERE name ILIKE $1 
      AND active = true
    ) as exists
  `,

  // ============================================
  // TEST DATA CLEANUP QUERIES
  // ============================================

  /**
   * Delete test vehicles by license plate pattern
   * Default pattern: 'MD-TEST-%'
   */
  DELETE_TEST_VEHICLES: `
    DELETE FROM fleet_vehicle
    WHERE license_plate LIKE $1
    RETURNING id, license_plate
  `,

  /**
   * Archive test vehicles (soft delete)
   */
  ARCHIVE_TEST_VEHICLES: `
    UPDATE fleet_vehicle
    SET active = false, write_date = NOW()
    WHERE license_plate LIKE $1
    RETURNING id, license_plate
  `,

  /**
   * Delete test drivers by name pattern
   * Default pattern: '%Test%'
   */
  DELETE_TEST_DRIVERS: `
    DELETE FROM res_partner
    WHERE name LIKE $1
    AND NOT EXISTS (
      SELECT 1 FROM fleet_vehicle WHERE driver_id = res_partner.id
    )
    RETURNING id, name
  `,

  // ============================================
  // AUDIT / VERIFICATION QUERIES
  // ============================================

  /**
   * Get recent vehicle changes (audit trail)
   */
  GET_VEHICLE_AUDIT_LOG: `
    SELECT 
      v.id,
      v.license_plate,
      v.write_date as last_modified,
      v.create_date as created
    FROM fleet_vehicle v
    WHERE v.license_plate = $1
    ORDER BY v.write_date DESC
    LIMIT 10
  `,

  /**
   * Check if data exists for GDPR compliance
   */
  CHECK_DRIVER_PII_EXISTS: `
    SELECT EXISTS(
      SELECT 1 FROM res_partner
      WHERE name = $1
      AND (
        phone IS NOT NULL 
        OR email IS NOT NULL 
        OR mobile IS NOT NULL
      )
    ) as has_pii
  `,

  /**
   * Get driver personal data for GDPR report
   */
  GET_DRIVER_PII_DATA: `
    SELECT 
      id,
      name,
      email,
      phone,
      mobile,
      street,
      city,
      zip
    FROM res_partner
    WHERE name = $1
    LIMIT 1
  `,

  // ============================================
  // STATISTICS QUERIES
  // ============================================

  /**
   * Count total active vehicles
   */
  COUNT_ACTIVE_VEHICLES: `
    SELECT COUNT(*) as count
    FROM fleet_vehicle
    WHERE active = true
  `,

  /**
   * Count vehicles by state
   */
  COUNT_VEHICLES_BY_STATE: `
    SELECT 
      state_id,
      COUNT(*) as count
    FROM fleet_vehicle
    WHERE active = true
    GROUP BY state_id
  `,
} as const;

/**
 * Type for query names
 */
export type QueryName = keyof typeof QUERIES;

/**
 * Get a query by name
 */
export function getQuery(name: QueryName): string {
  return QUERIES[name];
}

export default QUERIES;
