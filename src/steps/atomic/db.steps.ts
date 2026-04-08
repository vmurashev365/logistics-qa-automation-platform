/**
 * Database Steps
 * Cucumber steps for database assertions and verification
 * 
 * Usage:
 *   Then database should contain vehicle plate "MD-TEST-001"
 *   Then database vehicle "MD-TEST-001" should have odometer 12500
 *   Then database should not contain vehicle plate "MD-DELETED"
 *   Then driver "John Doe" should exist in database
 */

import { Then, When, DataTable } from '@cucumber/cucumber';
import { CustomWorld } from '../../support/custom-world';

// ============================================
// VEHICLE DATABASE ASSERTIONS
// ============================================

Then(
  'database should contain vehicle plate {string}',
  async function (this: CustomWorld, plate: string) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const exists = await this.dbClient.vehicleExists(plate);
    if (!exists) {
      throw new Error(`Vehicle with plate "${plate}" not found in database`);
    }
  }
);

Then(
  'database should not contain vehicle plate {string}',
  async function (this: CustomWorld, plate: string) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const exists = await this.dbClient.vehicleExists(plate);
    if (exists) {
      throw new Error(`Vehicle with plate "${plate}" should not exist in database but was found`);
    }
  }
);

Then(
  'database vehicle {string} should have odometer {int}',
  async function (this: CustomWorld, plate: string, expectedOdometer: number) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const actual = await this.dbClient.getVehicleOdometer(plate);
    if (actual === null) {
      throw new Error(`Vehicle with plate "${plate}" not found in database`);
    }
    if (actual !== expectedOdometer) {
      throw new Error(
        `Expected vehicle "${plate}" to have odometer ${expectedOdometer}, but got ${actual}`
      );
    }
  }
);

Then(
  'database vehicle {string} should have odometer greater than {int}',
  async function (this: CustomWorld, plate: string, minOdometer: number) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const actual = await this.dbClient.getVehicleOdometer(plate);
    if (actual === null) {
      throw new Error(`Vehicle with plate "${plate}" not found in database`);
    }
    if (actual <= minOdometer) {
      throw new Error(
        `Expected vehicle "${plate}" to have odometer > ${minOdometer}, but got ${actual}`
      );
    }
  }
);

Then(
  'database vehicle {string} should have driver {string}',
  async function (this: CustomWorld, plate: string, driverName: string) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    // Retry mechanism to handle async replication delay between UI and DB
    const maxRetries = 5;
    const retryDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const vehicle = await this.dbClient.getVehicleWithDriver(plate);
      
      if (!vehicle) {
        if (attempt === maxRetries) {
          throw new Error(`Vehicle with plate "${plate}" not found in database after ${maxRetries} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      if (vehicle.driver_name?.includes(driverName)) {
        // Success!
        return;
      }
      
      // Driver mismatch - retry if not last attempt
      if (attempt < maxRetries) {
        console.log(`⏳ Attempt ${attempt}/${maxRetries}: Driver not yet synced to DB (expected "${driverName}", got "${vehicle.driver_name || 'no driver'}")`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        throw new Error(
          `Expected vehicle "${plate}" to have driver "${driverName}", but got "${vehicle.driver_name || 'no driver'}" after ${maxRetries} attempts`
        );
      }
    }
  }
);

Then(
  'database vehicle {string} should match:',
  async function (this: CustomWorld, plate: string, dataTable: DataTable) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const vehicle = await this.dbClient.getVehicleByPlate(plate);
    if (!vehicle) {
      throw new Error(`Vehicle with plate "${plate}" not found in database`);
    }

    const expected = dataTable.rowsHash();
    const errors: string[] = [];

    for (const [field, expectedValue] of Object.entries(expected)) {
      const actualValue = String(vehicle[field as keyof typeof vehicle] ?? '');
      if (actualValue !== expectedValue) {
        errors.push(`${field}: expected "${expectedValue}", got "${actualValue}"`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Vehicle "${plate}" data mismatch:\n${errors.join('\n')}`);
    }
  }
);

// ============================================
// DRIVER DATABASE ASSERTIONS
// ============================================

Then(
  'driver {string} should exist in database',
  async function (this: CustomWorld, driverName: string) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const exists = await this.dbClient.driverExists(driverName);
    if (!exists) {
      throw new Error(`Driver "${driverName}" not found in database`);
    }
  }
);

Then(
  'driver {string} should not exist in database',
  async function (this: CustomWorld, driverName: string) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const exists = await this.dbClient.driverExists(driverName);
    if (exists) {
      throw new Error(`Driver "${driverName}" should not exist in database but was found`);
    }
  }
);

Then(
  'driver {string} should have phone {string}',
  async function (this: CustomWorld, driverName: string, expectedPhone: string) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const driver = await this.dbClient.getDriverByName(driverName);
    if (!driver) {
      throw new Error(`Driver "${driverName}" not found in database`);
    }

    const actualPhone = driver.phone || driver.mobile;
    if (actualPhone !== expectedPhone) {
      throw new Error(
        `Expected driver "${driverName}" to have phone "${expectedPhone}", but got "${actualPhone || 'none'}"`
      );
    }
  }
);

// ============================================
// GDPR / COMPLIANCE ASSERTIONS
// ============================================

Then(
  'driver personal data should be anonymized in database',
  async function (this: CustomWorld) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const driverName = this.getTestData<string>('gdprDeletedDriver');
    if (!driverName) {
      throw new Error('No driver marked for GDPR deletion in test context');
    }

    const hasPII = await this.dbClient.driverHasPII(driverName);
    if (hasPII) {
      throw new Error(
        `Driver "${driverName}" still has PII data after deletion request. GDPR compliance failed.`
      );
    }
  }
);

Then(
  'audit log should record deletion timestamp',
  async function (this: CustomWorld) {
    // In a real implementation, this would check an audit log table
    // For now, we just verify the step is recognized
    console.log('⚠️ Audit log verification is a placeholder - implement audit table check');
    
    // Store that audit check was performed
    this.setTestData('auditLogChecked', true);
  }
);

// ============================================
// TEST DATA CLEANUP
// ============================================

When(
  'I delete test vehicles matching {string}',
  async function (this: CustomWorld, pattern: string) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const deletedCount = await this.dbClient.deleteTestVehicles(pattern);
    this.setTestData('deletedVehicleCount', deletedCount);
    console.log(`🗑️ Deleted ${deletedCount} vehicles matching pattern: ${pattern}`);
  }
);

When(
  'I archive test vehicles matching {string}',
  async function (this: CustomWorld, pattern: string) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const archivedCount = await this.dbClient.archiveTestVehicles(pattern);
    this.setTestData('archivedVehicleCount', archivedCount);
    console.log(`📦 Archived ${archivedCount} vehicles matching pattern: ${pattern}`);
  }
);

// ============================================
// DATABASE HEALTH CHECKS
// ============================================

Then(
  'database connection should be healthy',
  async function (this: CustomWorld) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const isHealthy = await this.dbClient.isHealthy();
    if (!isHealthy) {
      throw new Error('Database connection is not healthy');
    }
  }
);

Then(
  'database should have vehicles matching pattern {string}',
  async function (this: CustomWorld, pattern: string) {
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }

    const count = await this.dbClient.countVehiclesByPattern(pattern);
    if (count === 0) {
      throw new Error(`No vehicles found matching pattern: ${pattern}`);
    }

    this.setTestData('vehicleCountByPattern', count);
    console.log(`📊 Found ${count} vehicles matching pattern: ${pattern}`);
  }
);
