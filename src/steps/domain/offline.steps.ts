/**
 * Offline Sync Domain Steps
 * Cucumber steps for offline sync (PouchDB) testing
 * 
 * Usage:
 *   Given I have offline data for vehicle "MD-OFF-001"
 *   When I sync offline data
 *   Then offline document "vehicle-001" should exist
 *   Then offline sync status should show "synced"
 */

import { When, Then, Given, DataTable } from '@cucumber/cucumber';
import { CustomWorld } from '../../support/custom-world';

// ============================================
// OFFLINE DATA SETUP
// ============================================

Given(
  'I have offline data for vehicle {string}',
  async function (this: CustomWorld, plate: string) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const docId = `vehicle-${plate}`;
    await this.offlineClient.put(docId, {
      type: 'vehicle',
      licensePlate: plate,
      createdOffline: true,
      timestamp: Date.now(),
    });

    this.setTestData('lastOfflineDocId', docId);
    console.log(`📱 Created offline document: ${docId}`);
  }
);

Given(
  'I have offline data:',
  async function (this: CustomWorld, dataTable: DataTable) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const rows = dataTable.hashes();
    const docs = rows.map(row => ({
      _id: row.id,
      type: row.type || 'generic',
      ...row,
    }));

    await this.offlineClient.bulkDocs(docs);
    this.setTestData('offlineDocsCreated', docs.length);
    console.log(`📱 Created ${docs.length} offline documents`);
  }
);

Given(
  'offline database is empty',
  async function (this: CustomWorld) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    // Get all docs and delete them
    const allDocs = await this.offlineClient.allDocs();
    for (const doc of allDocs) {
      await this.offlineClient.delete(doc._id);
    }
    console.log(`🗑️ Cleared offline database`);
  }
);

// ============================================
// OFFLINE DOCUMENT OPERATIONS
// ============================================

When(
  'I store offline document {string} with data:',
  async function (this: CustomWorld, docId: string, dataTable: DataTable) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const data = dataTable.rowsHash();
    await this.offlineClient.put(docId, {
      ...data,
      timestamp: Date.now(),
    });

    this.setTestData('lastOfflineDocId', docId);
  }
);

When(
  'I update offline document {string} with:',
  async function (this: CustomWorld, docId: string, dataTable: DataTable) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const updates = dataTable.rowsHash();
    const existing = await this.offlineClient.get(docId);
    
    if (!existing) {
      throw new Error(`Offline document "${docId}" not found`);
    }

    await this.offlineClient.put(docId, {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    });
  }
);

When(
  'I delete offline document {string}',
  async function (this: CustomWorld, docId: string) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    await this.offlineClient.delete(docId);
  }
);

// ============================================
// SYNC OPERATIONS
// ============================================

When(
  'I sync offline data',
  async function (this: CustomWorld) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const status = await this.offlineClient.simulateSync();
    this.setTestData('lastSyncStatus', status);
    console.log(`🔄 Sync complete: ${status.synced} documents synced`);
  }
);

When(
  'I simulate sync conflict for document {string}',
  async function (this: CustomWorld, docId: string) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const conflictInfo = await this.offlineClient.simulateConflict(
      docId,
      { localField: 'local-value', timestamp: Date.now() },
      { remoteField: 'remote-value', timestamp: Date.now() - 1000 },
      'local' // Resolve with local version
    );

    this.setTestData('lastConflict', conflictInfo);
    console.log(`⚠️ Simulated conflict for: ${docId}, resolved with: ${conflictInfo.resolvedWith}`);
  }
);

When(
  'I simulate sync conflict for document {string} resolved with {string}',
  async function (this: CustomWorld, docId: string, resolution: string) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const validResolutions = ['local', 'remote', 'merge'];
    if (!validResolutions.includes(resolution)) {
      throw new Error(`Invalid resolution strategy: ${resolution}. Use: ${validResolutions.join(', ')}`);
    }

    const conflictInfo = await this.offlineClient.simulateConflict(
      docId,
      { localField: 'local-value', timestamp: Date.now() },
      { remoteField: 'remote-value', timestamp: Date.now() - 1000 },
      resolution as 'local' | 'remote' | 'merge'
    );

    this.setTestData('lastConflict', conflictInfo);
  }
);

// ============================================
// DOCUMENT ASSERTIONS
// ============================================

Then(
  'offline document {string} should exist',
  async function (this: CustomWorld, docId: string) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const doc = await this.offlineClient.get(docId);
    if (!doc) {
      throw new Error(`Offline document "${docId}" not found`);
    }
  }
);

Then(
  'offline document {string} should not exist',
  async function (this: CustomWorld, docId: string) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const doc = await this.offlineClient.get(docId);
    if (doc) {
      throw new Error(`Offline document "${docId}" should not exist but was found`);
    }
  }
);

Then(
  'offline document {string} should have field {string} with value {string}',
  async function (this: CustomWorld, docId: string, field: string, expectedValue: string) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const doc = await this.offlineClient.get<Record<string, unknown>>(docId);
    if (!doc) {
      throw new Error(`Offline document "${docId}" not found`);
    }

    const actualValue = String(doc[field] ?? '');
    if (actualValue !== expectedValue) {
      throw new Error(
        `Expected "${docId}.${field}" to be "${expectedValue}", but got "${actualValue}"`
      );
    }
  }
);

Then(
  'offline document {string} should match:',
  async function (this: CustomWorld, docId: string, dataTable: DataTable) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const doc = await this.offlineClient.get<Record<string, unknown>>(docId);
    if (!doc) {
      throw new Error(`Offline document "${docId}" not found`);
    }

    const expected = dataTable.rowsHash();
    const errors: string[] = [];

    for (const [field, expectedValue] of Object.entries(expected)) {
      const actualValue = String(doc[field] ?? '');
      if (actualValue !== expectedValue) {
        errors.push(`${field}: expected "${expectedValue}", got "${actualValue}"`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Document "${docId}" data mismatch:\n${errors.join('\n')}`);
    }
  }
);

// ============================================
// SYNC STATUS ASSERTIONS
// ============================================

Then(
  'offline sync status should show {string}',
  async function (this: CustomWorld, expectedStatus: string) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const status = this.offlineClient.getSyncStatus();

    switch (expectedStatus.toLowerCase()) {
      case 'synced':
        if (status.pending > 0) {
          throw new Error(`Expected all synced, but ${status.pending} documents pending`);
        }
        break;
      case 'pending':
        if (status.pending === 0) {
          throw new Error('Expected pending documents, but none found');
        }
        break;
      case 'conflicts':
        if (status.conflicts === 0) {
          throw new Error('Expected conflicts, but none found');
        }
        break;
      default:
        throw new Error(`Unknown status: ${expectedStatus}. Use: synced, pending, conflicts`);
    }
  }
);

Then(
  'offline sync should have {int} pending documents',
  async function (this: CustomWorld, expectedPending: number) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const status = this.offlineClient.getSyncStatus();
    if (status.pending !== expectedPending) {
      throw new Error(`Expected ${expectedPending} pending, but got ${status.pending}`);
    }
  }
);

Then(
  'offline sync should have {int} conflicts',
  async function (this: CustomWorld, expectedConflicts: number) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const status = this.offlineClient.getSyncStatus();
    if (status.conflicts !== expectedConflicts) {
      throw new Error(`Expected ${expectedConflicts} conflicts, but got ${status.conflicts}`);
    }
  }
);

// ============================================
// CONFLICT ASSERTIONS
// ============================================

Then(
  'conflict log should have {int} entries',
  async function (this: CustomWorld, expectedCount: number) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const conflicts = this.offlineClient.getConflictLog();
    if (conflicts.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} conflicts in log, but got ${conflicts.length}`);
    }
  }
);

Then(
  'last conflict should be resolved with {string}',
  async function (this: CustomWorld, expectedResolution: string) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const conflicts = this.offlineClient.getConflictLog();
    if (conflicts.length === 0) {
      throw new Error('No conflicts in log');
    }

    const lastConflict = conflicts[conflicts.length - 1];
    if (lastConflict.resolvedWith !== expectedResolution) {
      throw new Error(
        `Expected conflict resolved with "${expectedResolution}", but was "${lastConflict.resolvedWith}"`
      );
    }
  }
);

// ============================================
// DATABASE INFO
// ============================================

Then(
  'offline database should have {int} documents',
  async function (this: CustomWorld, expectedCount: number) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    const allDocs = await this.offlineClient.allDocs();
    if (allDocs.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} documents, but got ${allDocs.length}`);
    }
  }
);

When(
  'I clear offline conflict log',
  async function (this: CustomWorld) {
    if (!this.offlineClient) {
      throw new Error('Offline client not initialized. Ensure OFFLINE_MODE=mock in environment.');
    }

    this.offlineClient.clearConflictLog();
  }
);
