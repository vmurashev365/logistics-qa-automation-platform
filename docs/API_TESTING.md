# API Testing Guide

## Overview

The Logistics QA Automation Platform provides two specialized API clients for testing:

1. **RestApiClient**: Generic HTTP client for RESTful APIs
2. **OdooJsonRpcClient**: Specialized client for Odoo's JSON-RPC API

This guide covers authentication, CRUD operations, error handling, and best practices for API testing.

---

## Architecture

### Client Layer

```text
src/api/clients/
├── RestApiClient.ts       # Generic REST API client with retry logic
├── OdooJsonRpcClient.ts   # Odoo JSON-RPC specific client
└── AsteriskMockClient.ts  # Mock client for CTI testing
```

### Endpoint Layer

```text
src/api/endpoints/
└── FleetEndpoints.ts      # Fleet-specific API endpoints
```

### Step Definitions

```text
src/steps/atomic/
└── api.steps.ts           # Cucumber steps for API testing
```

---

## RestApiClient

### Configuration

```typescript
import { RestApiClient } from '../api/clients/RestApiClient';

// Simple configuration
const client = new RestApiClient('http://localhost:8069');

// Advanced configuration
const client = new RestApiClient({
  baseUrl: 'http://localhost:8069',
  defaultHeaders: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer <token>',
  },
  timeout: 30000, // 30 seconds
  retryOptions: {
    attempts: 3,
    delay: 1000,
    backoff: 2,
  },
});
```

### Making Requests

#### GET Request

```typescript
// Simple GET
const response = await client.get('/api/vehicles');
console.log(response.status); // 200
console.log(response.data); // Array of vehicles

// GET with query parameters
const response = await client.get('/api/vehicles?state=active&limit=10');
```

#### POST Request

```typescript
// Create a new vehicle
const vehicleData = {
  license_plate: 'MD-TEST-001',
  model_id: 1,
  driver_id: 5,
};

const response = await client.post('/api/vehicles', vehicleData);
console.log(response.status); // 201
console.log(response.data.id); // New vehicle ID
```

#### PUT Request

```typescript
// Update existing vehicle
const updateData = {
  odometer_value: 15000,
  driver_id: 10,
};

const response = await client.put('/api/vehicles/42', updateData);
console.log(response.status); // 200
```

#### DELETE Request

```typescript
// Delete vehicle
const response = await client.delete('/api/vehicles/42');
console.log(response.status); // 204 or 200
```

### RestApiClient Error Handling

```typescript
try {
  const response = await client.get('/api/vehicles/999');
} catch (error) {
  if (error.status === 404) {
    console.log('Vehicle not found');
  } else if (error.status === 401) {
    console.log('Unauthorized - check credentials');
  } else if (error.status >= 500) {
    console.log('Server error:', error.message);
  }
}
```

---

## OdooJsonRpcClient

### Authentication

#### Method 1: Using authenticate()

```typescript
import { OdooJsonRpcClient } from '../api/clients/OdooJsonRpcClient';

const odooApi = new OdooJsonRpcClient('http://localhost:8069');

// Authenticate
const authResult = await odooApi.authenticate(
  'logistics_qa_db', // Database name
  'admin', // Username
  'admin' // Password
);

console.log(authResult.uid); // User ID
console.log(authResult.session_id); // Session ID
console.log(authResult.username); // 'admin'

// Check authentication status
if (odooApi.isAuthenticated()) {
  console.log('Authenticated as user:', authResult.uid);
}
```

#### Method 2: Using Step Definition (Recommended)

```gherkin
Feature: Fleet API Testing

  Background:
    Given Odoo API is authenticated

  Scenario: Create vehicle via API
    When I create Odoo record in "fleet.vehicle" with:
      | license_plate | MD-API-001 |
```

---

## CRUD Operations

### Create Records

#### Using Cucumber Steps (Create)

```gherkin
When I create Odoo record in "fleet.vehicle" with:
  | license_plate | MD-TEST-100 |
  | model_id      | 1           |
  | vin           | ABC123456   |
```

#### Using TypeScript

```typescript
const vehicleData = {
  license_plate: 'MD-TEST-100',
  model_id: 1,
  vin: 'ABC123456',
  driver_id: 5,
  fuel_type: 'diesel',
  odometer_value: 10000,
};

const vehicleId = await odooApi.create('fleet.vehicle', vehicleData);
console.log('Created vehicle ID:', vehicleId);
```

### Read Records

#### Search and Read

```typescript
// Search for vehicles with license plate starting with "MD"
const domain = [['license_plate', 'ilike', 'MD%']];
const fields = ['id', 'license_plate', 'model_id', 'driver_id'];

const vehicles = await odooApi.searchRead('fleet.vehicle', domain, fields);

vehicles.forEach((vehicle) => {
  console.log(`Vehicle ${vehicle.id}: ${vehicle.license_plate}`);
});
```

#### Read by ID

```typescript
// Read specific vehicle by ID
const vehicleId = 42;
const fields = ['license_plate', 'model_id', 'driver_id', 'odometer_value'];

const vehicle = await odooApi.read('fleet.vehicle', vehicleId, fields);
console.log(vehicle);
// Output: { id: 42, license_plate: 'MD-001', model_id: [1, 'Volvo'], ... }
```

#### Search IDs Only

```typescript
// Get IDs of all active vehicles
const domain = [['active', '=', true]];
const vehicleIds = await odooApi.search('fleet.vehicle', domain);

console.log('Found vehicles:', vehicleIds);
// Output: [1, 2, 5, 12, 42]
```

### Update Records

#### Single Record Update

```typescript
// Update vehicle odometer
const vehicleId = 42;
const updateData = {
  odometer_value: 25000,
  driver_id: 10,
};

await odooApi.write('fleet.vehicle', vehicleId, updateData);
console.log('Vehicle updated successfully');
```

#### Bulk Update

```typescript
// Update multiple vehicles at once
const vehicleIds = [1, 2, 3, 4, 5];
const updateData = {
  state: 'inactive',
};

await odooApi.write('fleet.vehicle', vehicleIds, updateData);
console.log(`Updated ${vehicleIds.length} vehicles`);
```

### Delete Records

#### Using unlink()

```typescript
// Delete single vehicle
await odooApi.unlink('fleet.vehicle', [42]);

// Delete multiple vehicles
await odooApi.unlink('fleet.vehicle', [1, 2, 3]);
```

#### Using Cucumber Steps (Delete)

```gherkin
When I delete Odoo record in "fleet.vehicle" with id 42
```

---

## Advanced Operations

### Complex Domain Filters

```typescript
// Find vehicles matching complex criteria
// (license_plate starts with 'MD') AND (odometer > 10000) AND (driver != false)
const domain = [
  ['license_plate', 'ilike', 'MD%'],
  ['odometer_value', '>', 10000],
  ['driver_id', '!=', false],
];

const vehicles = await odooApi.searchRead('fleet.vehicle', domain);
```

### Pagination

```typescript
// Get 10 vehicles, skip first 20 (pagination)
const domain = [];
const fields = ['license_plate', 'model_id'];
const options = {
  offset: 20,
  limit: 10,
  order: 'license_plate ASC',
};

const vehicles = await odooApi.searchRead('fleet.vehicle', domain, fields, options);
```

### Count Records

```typescript
// Count active vehicles
const domain = [['active', '=', true]];
const count = await odooApi.searchCount('fleet.vehicle', domain);
console.log(`Total active vehicles: ${count}`);
```

### Execute Workflows

```typescript
// Execute custom method (e.g., run vehicle maintenance workflow)
const result = await odooApi.execute(
  'fleet.vehicle', // Model
  'action_accept', // Method name
  [42], // Record IDs
  {} // Additional parameters
);
```

---

## Odoo Error Handling

### HTTP Status Codes

```typescript
try {
  const response = await client.get('/api/vehicles/999');
} catch (error) {
  switch (error.status) {
    case 400:
      console.error('Bad Request - Invalid parameters');
      break;
    case 401:
      console.error('Unauthorized - Authentication required');
      // Re-authenticate
      await odooApi.authenticate('logistics_qa_db', 'admin', 'admin');
      break;
    case 403:
      console.error('Forbidden - Insufficient permissions');
      break;
    case 404:
      console.error('Not Found - Resource does not exist');
      break;
    case 500:
      console.error('Internal Server Error');
      // Retry or log for investigation
      break;
    default:
      console.error('Unexpected error:', error.message);
  }
}
```

### Odoo JSON-RPC Errors

```typescript
try {
  await odooApi.create('fleet.vehicle', { invalid_field: 'value' });
} catch (error) {
  if (error.data?.name === 'odoo.exceptions.ValidationError') {
    console.error('Validation failed:', error.data.message);
  } else if (error.data?.name === 'odoo.exceptions.AccessError') {
    console.error('Access denied:', error.data.message);
  } else {
    console.error('RPC Error:', error.message);
  }
}
```

### Retry Logic

The RestApiClient includes automatic retry for transient failures:

```typescript
const client = new RestApiClient({
  baseUrl: 'http://localhost:8069',
  retryOptions: {
    attempts: 5, // Retry up to 5 times
    delay: 2000, // Start with 2-second delay
    backoff: 2, // Double delay each retry (2s, 4s, 8s, 16s)
    shouldRetry: (error) => {
      // Only retry on 5xx errors or network issues
      return error.status >= 500 || error.code === 'ECONNRESET';
    },
  },
});
```

---

## Best Practices

### 1. Always Clean Up Test Data

```gherkin
@api @cleanup
Scenario: Create and delete test vehicle
  Given Odoo API is authenticated
  When I create Odoo record in "fleet.vehicle" with:
    | license_plate | MD-TEMP-001 |
  Then API response should contain "id"
  # Store ID for cleanup
  And I store API response field "id" as "testVehicleId"
  # Cleanup in After hook or explicit step
  When I delete Odoo record in "fleet.vehicle" with id "{testVehicleId}"
```

### 2. Use Meaningful Test Data

```typescript
// ❌ BAD
const vehicleData = { license_plate: 'ABC' };

// ✅ GOOD
const vehicleData = {
  license_plate: `MD-TEST-${Date.now()}`,
  model_id: 1,
  vin: `TEST${Math.random().toString(36).substring(7).toUpperCase()}`,
};
```

### 3. Validate Response Schema

```typescript
import { expect } from '@playwright/test';

const vehicle = await odooApi.create('fleet.vehicle', vehicleData);

// Validate response structure
expect(vehicle).toHaveProperty('id');
expect(typeof vehicle.id).toBe('number');
expect(vehicle.id).toBeGreaterThan(0);
```

### 4. Test Negative Scenarios

```gherkin
@api @negative
Scenario: Cannot create vehicle with duplicate license plate
  Given Odoo API is authenticated
  When I create Odoo record in "fleet.vehicle" with:
    | license_plate | MD-UNIQUE-001 |
  Then API response status should be 200
  # Try to create duplicate
  When I create Odoo record in "fleet.vehicle" with:
    | license_plate | MD-UNIQUE-001 |
  Then API response status should be 400
  And API response should contain "duplicate key value"
```

### 5. Use Background for Authentication

```gherkin
Feature: Fleet API CRUD

  Background:
    Given Odoo API is authenticated

  Scenario: Create vehicle
    When I create Odoo record in "fleet.vehicle" with:
      | license_plate | MD-001 |

  Scenario: Read vehicle
    When I search Odoo records in "fleet.vehicle" where:
      | license_plate | = | MD-001 |
```

### 6. Handle Asynchronous Operations

```typescript
// Wait for record to be fully created/updated
await odooApi.create('fleet.vehicle', vehicleData);
await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

// Verify creation
const vehicles = await odooApi.searchRead('fleet.vehicle', [['license_plate', '=', 'MD-TEST-001']]);
expect(vehicles).toHaveLength(1);
```

### 7. Implement Idempotent Tests

```typescript
// Delete vehicle if exists before creating
const existingVehicles = await odooApi.searchRead('fleet.vehicle', [
  ['license_plate', '=', 'MD-TEST-001'],
]);

if (existingVehicles.length > 0) {
  await odooApi.unlink('fleet.vehicle', existingVehicles[0].id);
}

// Now create
const newVehicle = await odooApi.create('fleet.vehicle', {
  license_plate: 'MD-TEST-001',
});
```

---

## Complete Example: Vehicle Lifecycle Test

```gherkin
@api @vehicle-lifecycle
Feature: Vehicle API Lifecycle

  Background:
    Given Odoo API is authenticated

  Scenario: Complete vehicle CRUD workflow
    # CREATE
    When I create Odoo record in "fleet.vehicle" with:
      | license_plate  | MD-LIFECYCLE-001 |
      | model_id       | 1                |
      | driver_id      | 5                |
      | odometer_value | 10000            |
    Then API response status should be 200
    And API response should contain "id"
    And I store API response field "id" as "vehicleId"

    # READ
    When I search Odoo records in "fleet.vehicle" where:
      | license_plate | = | MD-LIFECYCLE-001 |
    Then API response should contain "license_plate"
    And API response field "license_plate" should be "MD-LIFECYCLE-001"

    # UPDATE
    When I update Odoo record "{vehicleId}" in "fleet.vehicle" with:
      | odometer_value | 25000 |
    Then API response status should be 200

    # VERIFY UPDATE
    When I read Odoo record "{vehicleId}" in "fleet.vehicle"
    Then API response field "odometer_value" should be 25000

    # DELETE
    When I delete Odoo record in "fleet.vehicle" with id "{vehicleId}"
    Then API response status should be 200

    # VERIFY DELETION
    When I search Odoo records in "fleet.vehicle" where:
      | license_plate | = | MD-LIFECYCLE-001 |
    Then API response should be empty
```

---

## TypeScript API Example (Complete)

```typescript
import { OdooJsonRpcClient } from '../src/api/clients/OdooJsonRpcClient';

async function vehicleApiTest() {
  // Initialize client
  const odooApi = new OdooJsonRpcClient('http://localhost:8069');

  try {
    // 1. AUTHENTICATE
    console.log('🔐 Authenticating...');
    const auth = await odooApi.authenticate('logistics_qa_db', 'admin', 'admin');
    console.log(`✅ Authenticated as user ${auth.uid}`);

    // 2. CREATE
    console.log('\n📝 Creating vehicle...');
    const vehicleData = {
      license_plate: `MD-API-${Date.now()}`,
      model_id: 1,
      vin: 'TEST1234567890',
      fuel_type: 'diesel',
    };
    const vehicleId = await odooApi.create('fleet.vehicle', vehicleData);
    console.log(`✅ Created vehicle ID: ${vehicleId}`);

    // 3. READ
    console.log('\n📖 Reading vehicle...');
    const vehicle = await odooApi.read('fleet.vehicle', vehicleId, [
      'license_plate',
      'model_id',
      'vin',
      'fuel_type',
    ]);
    console.log('✅ Vehicle details:', vehicle);

    // 4. SEARCH
    console.log('\n🔍 Searching vehicles...');
    const domain = [['license_plate', 'ilike', 'MD-API%']];
    const vehicles = await odooApi.searchRead('fleet.vehicle', domain);
    console.log(`✅ Found ${vehicles.length} vehicles`);

    // 5. UPDATE
    console.log('\n✏️ Updating vehicle...');
    await odooApi.write('fleet.vehicle', vehicleId, {
      odometer_value: 15000,
    });
    console.log('✅ Vehicle updated');

    // 6. DELETE
    console.log('\n🗑️ Deleting vehicle...');
    await odooApi.unlink('fleet.vehicle', vehicleId);
    console.log('✅ Vehicle deleted');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run test
vehicleApiTest().catch(console.error);
```

---

## Troubleshooting

### Issue: 401 Unauthorized

**Cause**: Session expired or invalid credentials

**Solution**:

```typescript
// Re-authenticate
await odooApi.authenticate('logistics_qa_db', 'admin', 'admin');
```

### Issue: CORS Errors in Browser

**Cause**: Odoo doesn't allow cross-origin requests by default

**Solution**: Run tests in Node.js environment (not browser) or configure Odoo CORS

### Issue: Timeout Errors

**Cause**: Slow network or complex queries

**Solution**:

```typescript
const client = new RestApiClient({
  baseUrl: 'http://localhost:8069',
  timeout: 60000, // Increase to 60 seconds
});
```

### Issue: Invalid Field Names

**Cause**: Using UI labels instead of database field names

**Solution**:

```typescript
// ❌ WRONG
{ "License Plate": "MD-001" }

// ✅ CORRECT
{ "license_plate": "MD-001" }
```

---

## References

- **Odoo JSON-RPC Documentation**: <https://www.odoo.com/documentation/17.0/developer/reference/external_api.html>
- **Odoo ORM Methods**: <https://www.odoo.com/documentation/17.0/developer/reference/backend/orm.html>
- **Source Code**: `src/api/clients/`
- **Step Definitions**: `src/steps/atomic/api.steps.ts`

---

**Last Updated**: January 2026  
**Framework Version**: 1.0.0  
**Maintained By**: QA Automation Team
