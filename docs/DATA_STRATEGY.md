# Test Data Management Strategy

## Executive Summary

This document defines the comprehensive strategy for managing test data throughout the QA lifecycle
in the the logistics workflow framework.
Proper data management is critical for test reliability, maintainability,
and compliance with data protection regulations (GDPR, CCPA).

**Core Principles**:

1. **Isolation**: Each test should be independent and not affect others
2. **Repeatability**: Tests produce same results on every run
3. **Cleanup**: Test data is always removed after execution
4. **Privacy**: No real customer data in test environments
5. **Performance**: Data seeding optimized for speed

---

## Data Lifecycle

### The Three Phases

```text
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   CREATION   │  →   │    USAGE     │  →   │   CLEANUP    │
│              │      │              │      │              │
│ - Fixtures   │      │ - Test runs  │      │ - Teardown   │
│ - Factories  │      │ - Assertions │      │ - Rollback   │
│ - API calls  │      │ - Validation │      │ - Truncate   │
└──────────────┘      └──────────────┘      └──────────────┘
```

### Phase 1: Creation

**When**: Before test execution (BeforeAll, BeforeEach, test setup)

**Methods**:

- Load fixtures from JSON/YAML files
- Generate data using factory functions
- Create via API (OdooJsonRpcClient)
- Seed database directly (SQL scripts)

**Best Practice**: Prefer API creation over UI navigation for test data setup

### Phase 2: Usage

**When**: During test execution

**Methods**:

- Read data from database
- Query via API
- Interact via UI
- Assert expected state

**Best Practice**: Use unique identifiers to avoid collisions between parallel tests

### Phase 3: Cleanup

**When**: After test execution (AfterEach, AfterAll, test teardown)

**Methods**:

- Delete via API
- Database rollback (transactions)
- Truncate test tables
- Reset to snapshot

**Best Practice**: Always clean up, even if test fails

---

## Data Sources

### 1. Demo Data (Odoo Built-In)

**Description**: Odoo's built-in demo data (vehicles, drivers, trips)

**Use Cases**:

- Smoke tests (verify core functionality works)
- Quick validation in development
- Read-only tests (no modifications)

**Pros**:

- ✅ Already exists, no setup needed
- ✅ Realistic data structure
- ✅ Fast to use

**Cons**:

- ❌ Shared across all tests (not isolated)
- ❌ Cannot be modified without affecting other tests
- ❌ May change when Odoo updates

**Example**:

```gherkin
@smoke @demo-data
Scenario: View demo vehicles
  Given Odoo is accessible at "http://localhost:8069"
  And I am logged in as admin
  When I navigate to "vehicles" page
  Then I should see at least 5 vehicles
  And demo vehicle "ABC-123" should exist
```

**When to Use**: Smoke tests, read-only validations

---

### 2. Fixtures (JSON/YAML Files)

**Description**: Static test data stored in `tests/fixtures/` directory

**Structure**:

```text
tests/
└── fixtures/
    ├── vehicles/
    │   ├── basic-vehicle.json
    │   ├── vehicle-with-driver.json
    │   └── electric-vehicle.json
    ├── drivers/
    │   ├── active-driver.json
    │   └── inactive-driver.json
    └── reference-data/
        ├── vehicle-models.json
        ├── fuel-types.json
        └── states.json
```

**Example Fixture**:

```json
// tests/fixtures/vehicles/basic-vehicle.json
{
  "license_plate": "MD-FIXTURE-001",
  "model_id": 1,
  "vin": "TESTVIN1234567890",
  "fuel_type": "diesel",
  "odometer_value": 10000,
  "acquisition_date": "2024-01-15",
  "driver_id": null,
  "state": "active"
}
```

**Loading Fixtures**:

```typescript
// src/utils/fixtures.ts
import * as fs from 'fs';
import * as path from 'path';

export class FixtureLoader {
  private fixturesPath = path.join(__dirname, '../../tests/fixtures');

  loadFixture<T>(category: string, name: string): T {
    const fixturePath = path.join(this.fixturesPath, category, `${name}.json`);
    const content = fs.readFileSync(fixturePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  loadAllFixtures<T>(category: string): T[] {
    const categoryPath = path.join(this.fixturesPath, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.json'));

    return files.map((file) => {
      const content = fs.readFileSync(path.join(categoryPath, file), 'utf-8');
      return JSON.parse(content) as T;
    });
  }
}

// Usage in tests
const fixtureLoader = new FixtureLoader();
const vehicleData = fixtureLoader.loadFixture('vehicles', 'basic-vehicle');
```

**When to Use**: Reference data (vehicle models, fuel types), template data for variations

---

### 3. Factory Pattern (Dynamic Generation)

**Description**: TypeScript classes that generate test data programmatically

**Benefits**:

- ✅ Unique data on every run
- ✅ Customizable via parameters
- ✅ Realistic randomness
- ✅ Easy to maintain

**Example Factory**:

```typescript
// src/utils/factories/VehicleFactory.ts
import { faker } from '@faker-js/faker';

export interface VehicleData {
  license_plate: string;
  model_id: number;
  vin?: string;
  fuel_type?: string;
  odometer_value?: number;
  driver_id?: number;
  acquisition_date?: string;
}

export class VehicleFactory {
  /**
   * Generate a unique vehicle with default values
   */
  static create(overrides?: Partial<VehicleData>): VehicleData {
    const timestamp = Date.now();

    return {
      license_plate: `MD-TEST-${timestamp.toString().slice(-6)}`,
      model_id: 1,
      vin: faker.vehicle.vin(),
      fuel_type: faker.helpers.arrayElement(['diesel', 'gasoline', 'electric', 'hybrid']),
      odometer_value: faker.number.int({ min: 0, max: 500000 }),
      acquisition_date: faker.date.past({ years: 5 }).toISOString().split('T')[0],
      driver_id: null,
      ...overrides, // Override defaults with custom values
    };
  }

  /**
   * Generate multiple vehicles
   */
  static createBatch(count: number, overrides?: Partial<VehicleData>): VehicleData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Generate vehicle with assigned driver
   */
  static createWithDriver(driverId: number): VehicleData {
    return this.create({ driver_id: driverId });
  }

  /**
   * Generate electric vehicle
   */
  static createElectric(): VehicleData {
    return this.create({
      fuel_type: 'electric',
      odometer_value: faker.number.int({ min: 0, max: 100000 }), // Lower mileage
    });
  }
}
```

**Usage in Tests**:

```typescript
// In step definition
import { VehicleFactory } from '../utils/factories/VehicleFactory';

When('I create a test vehicle', async function () {
  const vehicleData = VehicleFactory.create();
  const vehicleId = await this.odooApi.create('fleet.vehicle', vehicleData);
  this.setTestData('lastCreatedVehicle', vehicleId);
});

When('I create {int} vehicles', async function (count: number) {
  const vehicles = VehicleFactory.createBatch(count);
  for (const vehicle of vehicles) {
    await this.odooApi.create('fleet.vehicle', vehicle);
  }
});
```

**Factory for Drivers**:

```typescript
// src/utils/factories/DriverFactory.ts
import { faker } from '@faker-js/faker';

export interface DriverData {
  name: string;
  phone: string;
  mobile: string;
  email: string;
  license_number?: string;
  license_expiry?: string;
}

export class DriverFactory {
  static create(overrides?: Partial<DriverData>): DriverData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      name: `${firstName} ${lastName}`,
      phone: faker.phone.number('+1##########'),
      mobile: faker.phone.number('+1##########'),
      email: faker.internet.email({ firstName, lastName, provider: 'test-logistics.local' }),
      license_number: faker.string.alphanumeric(10).toUpperCase(),
      license_expiry: faker.date.future({ years: 2 }).toISOString().split('T')[0],
      ...overrides,
    };
  }
}
```

**When to Use**: All tests requiring unique data, load testing, parallel test execution

---

### 4. API-Generated Data

**Description**: Create test data via OdooJsonRpcClient during test setup

**Benefits**:

- ✅ Fast (no UI navigation)
- ✅ Reliable (no UI flakiness)
- ✅ Reusable across tests
- ✅ Easy cleanup (know IDs)

**Example**:

```typescript
// In hooks.ts - Create data before test
Before({ tags: '@vehicle-tests' }, async function () {
  // Create test vehicle via API
  const vehicleData = VehicleFactory.create();
  const vehicleId = await this.odooApi.create('fleet.vehicle', vehicleData);

  // Store for use in test
  this.setTestData('testVehicleId', vehicleId);
  this.setTestData('testVehiclePlate', vehicleData.license_plate);
});

// In test
When('I view my test vehicle', async function () {
  const plate = this.getTestData('testVehiclePlate');
  await this.page.goto(
    `${this.getBaseUrl()}/web#model=fleet.vehicle&id=${this.getTestData('testVehicleId')}`
  );
});

// Cleanup after test
After({ tags: '@vehicle-tests' }, async function () {
  const vehicleId = this.getTestData('testVehicleId');
  if (vehicleId) {
    await this.odooApi.unlink('fleet.vehicle', vehicleId);
  }
});
```

**When to Use**: Most tests, especially for setup/teardown data

---

## Data Isolation Strategies

### Strategy 1: Unique Identifiers

**Concept**: Use timestamps, UUIDs, or counters to ensure uniqueness

**Implementation**:

```typescript
// Timestamp-based
const licensePlate = `MD-TEST-${Date.now()}`; // MD-TEST-1705154832145

// UUID-based
import { v4 as uuidv4 } from 'uuid';
const licensePlate = `MD-${uuidv4().substring(0, 8)}`; // MD-a3f2b1c4

// Counter-based (if needed)
let counter = 0;
const licensePlate = `MD-TEST-${String(counter++).padStart(6, '0')}`; // MD-TEST-000001
```

**Best Practice**:

```typescript
// ✅ GOOD - Always unique
const vehicle = VehicleFactory.create(); // Uses timestamp internally

// ❌ BAD - Hardcoded, will fail on second run
const vehicle = { license_plate: 'TEST-001' };
```

---

### Strategy 2: Database Transactions (Rollback)

**Concept**: Wrap test in transaction, rollback after completion

**Implementation**:

```typescript
// src/db/PgClient.ts
export class PgClient {
  async beginTransaction(): Promise<void> {
    await this.client.query('BEGIN');
  }

  async rollback(): Promise<void> {
    await this.client.query('ROLLBACK');
  }

  async commit(): Promise<void> {
    await this.client.query('COMMIT');
  }
}

// In hooks.ts
BeforeEach({ tags: '@database' }, async function () {
  await this.dbClient.beginTransaction();
});

AfterEach({ tags: '@database' }, async function () {
  await this.dbClient.rollback(); // Undo all changes
});
```

**When to Use**: Database-intensive tests, when you need perfect cleanup

**Limitations**:

- Cannot rollback external API calls
- Cannot rollback file uploads
- May conflict with Odoo's ORM transactions

---

### Strategy 3: Dedicated Test Schema

**Concept**: Use separate database schema for tests

**Implementation**:

```sql
-- Create test schema
CREATE SCHEMA IF NOT EXISTS test_data;

-- Set search path for test session
SET search_path TO test_data, public;

-- Create test tables (mirrors production)
CREATE TABLE test_data.fleet_vehicle AS TABLE public.fleet_vehicle;
```

**When to Use**: Large test suites, when you need full isolation from production-like data

---

### Strategy 4: Teardown Hooks

**Concept**: Explicitly delete created data after test

**Implementation**:

```typescript
// src/support/hooks.ts
import { After, Status } from '@cucumber/cucumber';

After(async function (scenario) {
  // Get all created IDs from test context
  const createdVehicles = this.getTestData('createdVehicleIds') || [];
  const createdDrivers = this.getTestData('createdDriverIds') || [];

  // Delete vehicles
  if (createdVehicles.length > 0) {
    await this.odooApi.unlink('fleet.vehicle', createdVehicles);
  }

  // Delete drivers
  if (createdDrivers.length > 0) {
    await this.odooApi.unlink('fleet.driver', createdDrivers);
  }

  // Take screenshot if test failed
  if (scenario.result?.status === Status.FAILED) {
    await this.screenshot(`failure-${Date.now()}`);
  }
});
```

**Tracking Created Records**:

```typescript
// In step definition
When('I create vehicle via API', async function () {
  const vehicleData = VehicleFactory.create();
  const vehicleId = await this.odooApi.create('fleet.vehicle', vehicleData);

  // Track for cleanup
  const createdIds = this.getTestData('createdVehicleIds') || [];
  createdIds.push(vehicleId);
  this.setTestData('createdVehicleIds', createdIds);
});
```

---

### Strategy 5: Database Truncation

**Concept**: Delete all test data matching pattern

**Implementation**:

```sql
-- Delete all test vehicles (license plate starts with MD-TEST)
DELETE FROM fleet_vehicle
WHERE license_plate LIKE 'MD-TEST%';

-- Delete all test drivers (email ends with @test-logistics.local)
DELETE FROM res_partner
WHERE email LIKE '%@test-logistics.local';

-- Reset sequences if needed
ALTER SEQUENCE fleet_vehicle_id_seq RESTART WITH 1000;
```

**Script**:

```typescript
// scripts/clean-test-data.ts
import { PgClient } from '../src/db/PgClient';

async function cleanTestData() {
  const db = new PgClient({
    host: 'localhost',
    port: 5432,
    database: 'logistics_qa_db',
    user: 'odoo',
    password: 'odoo',
  });

  await db.connect();

  console.log('Cleaning test vehicles...');
  const vehicleResult = await db.query(`
    DELETE FROM fleet_vehicle 
    WHERE license_plate LIKE 'MD-TEST%' OR license_plate LIKE 'MD-TEMP%'
  `);
  console.log(`Deleted ${vehicleResult.rowCount} vehicles`);

  console.log('Cleaning test drivers...');
  const driverResult = await db.query(`
    DELETE FROM res_partner 
    WHERE email LIKE '%@test-logistics.local'
  `);
  console.log(`Deleted ${driverResult.rowCount} drivers`);

  await db.disconnect();
}

cleanTestData().catch(console.error);
```

**When to Use**: End-of-day cleanup, CI/CD post-test cleanup, manual maintenance

---

## Sensitive Data Handling

### PII Anonymization

**Problem**: Real customer data (names, phone numbers, addresses) should never be in test environments

**Solution**: Use faker.js for realistic but fake data

```typescript
import { faker } from '@faker-js/faker';

// ✅ GOOD - Fake but realistic
const driver = {
  name: faker.person.fullName(), // "John Smith"
  phone: faker.phone.number('+1##########'), // "+14155551234"
  email: faker.internet.email({ provider: 'test.com' }),
  address: faker.location.streetAddress(), // "123 Main St"
};

// ❌ BAD - Real customer data
const driver = {
  name: 'John Smith',
  phone: '+14155551234', // Might be real!
  email: 'john.smith@real-company.com',
};
```

---

### GDPR Compliance

**Requirements**:

1. No real customer data in test environments
2. Test data must be clearly marked as test
3. Must be able to delete all test data on request

**Implementation**:

```typescript
// Mark all test data with flag
const vehicleData = {
  license_plate: 'MD-TEST-001',
  // ... other fields
  x_is_test_data: true,  // Custom field in Odoo
};

// Query to find all test data
SELECT * FROM fleet_vehicle WHERE x_is_test_data = true;

// Delete all test data (GDPR compliance)
DELETE FROM fleet_vehicle WHERE x_is_test_data = true;
```

---

### Credential Management

**Problem**: Database passwords, API keys, secrets must never be committed to Git

**Solution**: Use `.env` file (gitignored) and environment variables

```bash
# .env (NEVER COMMIT)
ODOO_USERNAME=admin
ODOO_PASSWORD=admin
ODOO_DATABASE=logistics_qa_db
DB_PASSWORD=odoo
API_KEY=secret-key-here
```

```typescript
// src/support/env.ts
import * as dotenv from 'dotenv';

dotenv.config();

export function getEnvConfig() {
  return {
    odooUsername: process.env.ODOO_USERNAME || 'admin',
    odooPassword: process.env.ODOO_PASSWORD || 'admin',
    odooDatabase: process.env.ODOO_DATABASE || 'logistics_qa_db',
    dbPassword: process.env.DB_PASSWORD || 'odoo',
  };
}
```

**Best Practices**:

- ✅ Use `.env` for local development
- ✅ Use CI/CD secrets for pipelines
- ✅ Rotate passwords quarterly
- ✅ Use different credentials per environment (dev, staging, prod)
- ❌ Never hardcode passwords in code
- ❌ Never commit `.env` to Git

---

## Data Seeding Scripts

### Purpose

Pre-populate test environment with large datasets for:

- Performance testing
- UI pagination testing
- Load testing
- Realistic scenarios

### Seeding Script

```typescript
// scripts/seed-data.ts
import { OdooJsonRpcClient } from '../src/api/clients/OdooJsonRpcClient';
import { VehicleFactory } from '../src/utils/factories/VehicleFactory';
import { DriverFactory } from '../src/utils/factories/DriverFactory';

async function seedData() {
  const odooApi = new OdooJsonRpcClient('http://localhost:8069');

  // Authenticate
  await odooApi.authenticate('logistics_qa_db', 'admin', 'admin');

  console.log('Seeding drivers...');
  const driverIds: number[] = [];
  for (let i = 0; i < 50; i++) {
    const driver = DriverFactory.create();
    const id = await odooApi.create('res.partner', driver);
    driverIds.push(id);

    if ((i + 1) % 10 === 0) {
      console.log(`  Created ${i + 1}/50 drivers`);
    }
  }

  console.log('Seeding vehicles...');
  for (let i = 0; i < 100; i++) {
    const vehicle = VehicleFactory.create({
      driver_id: i < 50 ? driverIds[i] : null, // Assign half to drivers
    });
    await odooApi.create('fleet.vehicle', vehicle);

    if ((i + 1) % 20 === 0) {
      console.log(`  Created ${i + 1}/100 vehicles`);
    }
  }

  console.log('✅ Seeding complete!');
  console.log('  - 50 drivers');
  console.log('  - 100 vehicles (50 with drivers, 50 unassigned)');
}

seedData().catch(console.error);
```

### Bulk Insert (Performance Optimization)

```typescript
// Optimized bulk insert
async function seedVehiclesBulk(count: number) {
  const vehicles = VehicleFactory.createBatch(count);

  // Batch insert (10 at a time to avoid timeout)
  const batchSize = 10;
  for (let i = 0; i < vehicles.length; i += batchSize) {
    const batch = vehicles.slice(i, i + batchSize);
    await Promise.all(batch.map((v) => odooApi.create('fleet.vehicle', v)));
    console.log(`Inserted ${Math.min(i + batchSize, vehicles.length)}/${vehicles.length}`);
  }
}
```

### NPM Scripts

```json
// package.json
{
  "scripts": {
    "db:seed": "ts-node scripts/seed-data.ts",
    "db:seed:large": "ts-node scripts/seed-data.ts --count=1000",
    "db:clean": "ts-node scripts/clean-test-data.ts",
    "db:reset": "npm run db:clean && npm run db:seed"
  }
}
```

---

## Best Practices (20 Guidelines)

### Creation

1. **Always use unique identifiers** (timestamps, UUIDs)
2. **Prefer API over UI** for test data creation (10x faster)
3. **Use factories for dynamic data**, fixtures for static reference data
4. **Generate realistic data** with faker.js (avoids validation errors)
5. **Create minimum viable data** (only required fields)

### Usage

1. **Avoid hardcoded test data** that may not exist
2. **Query before asserting** (don't assume data exists)
3. **Use data-driven tests** for variations (Scenario Outline)
4. **Test with edge case data** (empty strings, max lengths, special characters)
5. **Store created IDs** for cleanup and validation

### Cleanup

1. **Clean up in AfterEach**, not just AfterAll (prevents accumulation)
2. **Delete in reverse order** of creation (handle foreign keys)
3. **Use try-finally blocks** to ensure cleanup even on failure
4. **Log cleanup actions** for debugging orphaned data
5. **Verify cleanup succeeded** (query to ensure deletion)

### Security & Compliance

1. **Never use production data** in tests
2. **Anonymize PII** with faker.js
3. **Mark test data** with flag (`x_is_test_data: true`)
4. **Never commit credentials** (use `.env`)
5. **Implement data retention policies** (auto-delete after N days)

---

## Performance Considerations

### Bulk Inserts

```typescript
// ❌ SLOW - Sequential inserts (10 seconds for 100 records)
for (let i = 0; i < 100; i++) {
  await odooApi.create('fleet.vehicle', VehicleFactory.create());
}

// ✅ FAST - Parallel inserts (2 seconds for 100 records)
const vehicles = VehicleFactory.createBatch(100);
await Promise.all(vehicles.map((v) => odooApi.create('fleet.vehicle', v)));
```

### Database Indexing

```sql
-- Add index on license_plate for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_license_plate
ON fleet_vehicle (license_plate);

-- Add index on test data flag
CREATE INDEX IF NOT EXISTS idx_vehicle_test_data
ON fleet_vehicle (x_is_test_data)
WHERE x_is_test_data = true;
```

### Connection Pooling

```typescript
// Reuse database connections instead of creating new ones
const dbPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'logistics_qa_db',
  user: 'odoo',
  password: 'odoo',
  max: 10, // Max 10 connections
});
```

---

## Troubleshooting

### Issue: Orphaned Test Data

**Symptom**: Database full of old test records

**Diagnosis**:

```sql
SELECT COUNT(*), DATE(create_date)
FROM fleet_vehicle
WHERE license_plate LIKE 'MD-TEST%'
GROUP BY DATE(create_date)
ORDER BY DATE(create_date) DESC;
```

**Solution**:

```bash
# Run cleanup script
npm run db:clean

# Or delete manually
docker exec -it logistics-qa-postgres psql -U odoo -d logistics_qa_db -c "DELETE FROM fleet_vehicle WHERE license_plate LIKE 'MD-TEST%'"
```

---

### Issue: Foreign Key Violations

**Symptom**: Cannot delete driver because vehicle references it

**Solution**: Delete in correct order

```typescript
// ❌ WRONG ORDER
await odooApi.unlink('res.partner', driverId); // Fails: vehicles reference this
await odooApi.unlink('fleet.vehicle', vehicleId);

// ✅ CORRECT ORDER
await odooApi.unlink('fleet.vehicle', vehicleId); // Delete child first
await odooApi.unlink('res.partner', driverId); // Then parent
```

---

### Issue: Duplicate Key Errors

**Symptom**: "duplicate key value violates unique constraint"

**Cause**: Hardcoded license plate used in multiple tests

**Solution**:

```typescript
// ❌ BAD
const vehicle = { license_plate: 'TEST-001' };

// ✅ GOOD
const vehicle = VehicleFactory.create(); // Always unique
```

---

### Issue: Slow Test Data Creation

**Symptom**: Tests spend 80% of time creating data

**Solution**: Create data via API, not UI

```gherkin
# ❌ SLOW (30 seconds)
When I navigate to "vehicles" page
And I click "create" button
And I fill "licensePlate" with "MD-001"
And I click "save" button

# ✅ FAST (2 seconds)
Given test vehicle "MD-001" exists via API
When I navigate to vehicle "MD-001"
```

---

## Conclusion

Effective test data management:

✅ **Ensures test reliability** (no flaky tests due to data issues)  
✅ **Speeds up execution** (API creation vs UI navigation)  
✅ **Maintains privacy** (no real customer data)  
✅ **Enables CI/CD** (clean state on every run)  
✅ **Simplifies debugging** (clear data provenance)

**Golden Rule**: Treat test data as ephemeral. Create, use, destroy.

---

## References

- **Faker.js**: <https://fakerjs.dev/>
- **PostgreSQL Transactions**: <https://www.postgresql.org/docs/current/tutorial-transactions.html>
- **GDPR Compliance**: <https://gdpr.eu/>
- **Data Factory Pattern**: <https://martinfowler.com/bliki/ObjectMother.html>

---

**Document Owner**: QA Lead  
**Last Updated**: January 13, 2026  
**Next Review**: April 2026
