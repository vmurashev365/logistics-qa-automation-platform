/**
 * CouchDB/PouchDB Client for Offline Sync Mock
 * Uses PouchDB-node for local storage simulation
 * 
 * Features:
 * - Local document storage (no external CouchDB required)
 * - Put, Get, BulkDocs operations
 * - Conflict resolution simulation
 * - Deterministic behavior for testing
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PouchDB = require('pouchdb-node');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const memoryAdapter = require('pouchdb-adapter-memory');

// Register memory adapter
PouchDB.plugin(memoryAdapter);

/**
 * Document with PouchDB metadata
 */
export interface PouchDocument {
  _id: string;
  _rev?: string;
  _deleted?: boolean;
  [key: string]: unknown;
}

/**
 * PouchDB put response
 */
export interface PutResponse {
  ok: boolean;
  id: string;
  rev: string;
}

/**
 * Bulk operation result
 */
export interface BulkResult {
  ok?: boolean;
  id: string;
  rev?: string;
  error?: boolean;
  reason?: string;
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  documentId: string;
  currentRev: string;
  conflictingRev: string;
  resolvedWith: 'local' | 'remote' | 'merge';
}

/**
 * Offline sync status
 */
export interface SyncStatus {
  pending: number;
  synced: number;
  conflicts: number;
  lastSync: number | null;
}

/**
 * CouchDB/PouchDB Client
 * Provides offline sync mock functionality using PouchDB-node
 */
export class CouchClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;
  private dbName: string;
  private conflictLog: ConflictInfo[] = [];
  private syncStatus: SyncStatus = {
    pending: 0,
    synced: 0,
    conflicts: 0,
    lastSync: null,
  };

  constructor(dbName: string) {
    this.dbName = dbName;
    // Create in-memory database for testing
    this.db = new PouchDB(dbName, { adapter: 'memory' });
    console.log(`📱 PouchDB initialized: ${dbName} (in-memory)`);
  }

  // ============================================
  // BASIC OPERATIONS
  // ============================================

  /**
   * Put (create or update) a document
   * @param id - Document ID
   * @param doc - Document content
   * @returns Put response with id and rev
   */
  async put(id: string, doc: Record<string, unknown>): Promise<PutResponse> {
    try {
      // Check if document exists to get current revision
      let existingRev: string | undefined;
      try {
        const existing = await this.db.get(id);
        existingRev = existing._rev;
      } catch {
        // Document doesn't exist, this is a new document
      }

      const documentToSave: PouchDocument = {
        ...doc,
        _id: id,
        ...(existingRev && { _rev: existingRev }),
      };

      const response = await this.db.put(documentToSave);
      this.syncStatus.pending++;

      return {
        ok: true,
        id: response.id,
        rev: response.rev,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to put document ${id}: ${message}`);
    }
  }

  /**
   * Get a document by ID
   * @param id - Document ID
   * @returns Document content or null if not found
   */
  async get<T = Record<string, unknown>>(id: string): Promise<(T & PouchDocument) | null> {
    try {
      const doc = await this.db.get(id);
      return doc as T & PouchDocument;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).status === 404) {
        return null;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get document ${id}: ${message}`);
    }
  }

  /**
   * Bulk insert/update documents
   * @param docs - Array of documents with _id
   * @returns Array of results
   */
  async bulkDocs(docs: PouchDocument[]): Promise<BulkResult[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = await this.db.bulkDocs(docs);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedResults: BulkResult[] = results.map((result: any, index: number) => {
        if ('error' in result && result.error) {
          return {
            id: docs[index]._id,
            error: true,
            reason: 'message' in result ? result.message : 'Unknown error',
          };
        }
        this.syncStatus.pending++;
        return {
          ok: true,
          id: 'id' in result ? result.id : docs[index]._id,
          rev: 'rev' in result ? result.rev : undefined,
        };
      });

      return mappedResults;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Bulk operation failed: ${message}`);
    }
  }

  /**
   * Delete a document by ID
   * @param id - Document ID
   */
  async delete(id: string): Promise<void> {
    try {
      const doc = await this.db.get(id);
      await this.db.remove(doc);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).status === 404) {
        // Document doesn't exist, nothing to delete
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete document ${id}: ${message}`);
    }
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Get all documents in the database
   */
  async allDocs<T = Record<string, unknown>>(): Promise<(T & PouchDocument)[]> {
    try {
      const result = await this.db.allDocs({ include_docs: true });
      return result.rows
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((row: any) => row.doc && !row.id.startsWith('_'))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) => row.doc as T & PouchDocument);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get all documents: ${message}`);
    }
  }

  /**
   * Find documents matching criteria
   * Simple implementation using allDocs and filter
   */
  async find<T = Record<string, unknown>>(
    predicate: (doc: T & PouchDocument) => boolean
  ): Promise<(T & PouchDocument)[]> {
    const allDocs = await this.allDocs<T>();
    return allDocs.filter(predicate);
  }

  // ============================================
  // SYNC SIMULATION
  // ============================================

  /**
   * Simulate sync to remote server
   * In mock mode, just updates status counters
   */
  async simulateSync(): Promise<SyncStatus> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Move pending to synced
    this.syncStatus.synced += this.syncStatus.pending;
    this.syncStatus.pending = 0;
    this.syncStatus.lastSync = Date.now();

    return { ...this.syncStatus };
  }

  /**
   * Simulate a conflict scenario
   * @param documentId - ID of the conflicting document
   * @param localVersion - Local document version
   * @param remoteVersion - Remote document version
   * @param resolution - How to resolve ('local', 'remote', or 'merge')
   */
  async simulateConflict(
    documentId: string,
    localVersion: Record<string, unknown>,
    remoteVersion: Record<string, unknown>,
    resolution: 'local' | 'remote' | 'merge' = 'local'
  ): Promise<ConflictInfo> {
    // Store local version first
    const localResult = await this.put(documentId, { ...localVersion, source: 'local' });

    // Create conflict info
    const conflict: ConflictInfo = {
      documentId,
      currentRev: localResult.rev,
      conflictingRev: 'remote-conflict-rev',
      resolvedWith: resolution,
    };

    // Resolve based on strategy
    let resolvedDoc: Record<string, unknown>;
    switch (resolution) {
      case 'remote':
        resolvedDoc = { ...remoteVersion, source: 'remote' };
        break;
      case 'merge':
        resolvedDoc = { ...localVersion, ...remoteVersion, source: 'merged' };
        break;
      case 'local':
      default:
        resolvedDoc = { ...localVersion, source: 'local' };
    }

    await this.put(documentId, resolvedDoc);
    
    this.conflictLog.push(conflict);
    this.syncStatus.conflicts++;

    return conflict;
  }

  /**
   * Get conflict log
   */
  getConflictLog(): ConflictInfo[] {
    return [...this.conflictLog];
  }

  /**
   * Clear conflict log
   */
  clearConflictLog(): void {
    this.conflictLog = [];
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  /**
   * Close the database
   */
  async close(): Promise<void> {
    await this.db.close();
    console.log(`🔒 PouchDB closed: ${this.dbName}`);
  }

  /**
   * Destroy the database (delete all data)
   */
  async destroy(): Promise<void> {
    await this.db.destroy();
    console.log(`🗑️ PouchDB destroyed: ${this.dbName}`);
  }

  /**
   * Get database info
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getInfo(): Promise<any> {
    return this.db.info();
  }

  /**
   * Get database name
   */
  getName(): string {
    return this.dbName;
  }
}

export default CouchClient;
