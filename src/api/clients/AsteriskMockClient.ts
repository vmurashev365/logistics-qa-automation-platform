/**
 * Asterisk Mock Client for CTI Event Simulation
 * EventEmitter-based mock for Computer Telephony Integration testing
 * 
 * Features:
 * - Deterministic event emission (no real Asterisk required)
 * - Event types: call_start, call_end, call_transfer, screen_pop
 * - Scripted event replay for complex scenarios
 * - Event log for assertions
 * - Fully in-memory (no external dependencies)
 */

import { EventEmitter } from 'events';
import type {
  CTIEvent,
  CTIEventType,
  CTIEventListener,
  CTIClientConfig,
  CTIConnectionStatus,
  ScriptedEvent,
  ScreenPopData,
  CallDirection,
} from '../../types/cti';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CTIClientConfig = {
  autoReconnect: false,
  reconnectDelay: 5000,
  maxLogSize: 1000,
};

/**
 * Asterisk Mock Client
 * Simulates CTI events for testing phone integration features
 */
export class AsteriskMockClient extends EventEmitter {
  private eventLog: CTIEvent[] = [];
  private isConnected: boolean = false;
  private config: CTIClientConfig;
  private connectedAt: number | null = null;
  private disconnectedAt: number | null = null;
  private eventsProcessed: number = 0;
  private callIdCounter: number = 0;

  constructor(config: Partial<CTIClientConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

  /**
   * Simulate connection to Asterisk server
   */
  async connect(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 50));

    this.isConnected = true;
    this.connectedAt = Date.now();
    this.disconnectedAt = null;

    console.log('📞 CTI Mock Client connected');
    this.emit('connected');
  }

  /**
   * Simulate disconnection from Asterisk server
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.disconnectedAt = Date.now();

    console.log('📞 CTI Mock Client disconnected');
    this.emit('disconnected');
  }

  /**
   * Check if connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): CTIConnectionStatus {
    return {
      connected: this.isConnected,
      connectedAt: this.connectedAt ?? undefined,
      disconnectedAt: this.disconnectedAt ?? undefined,
      eventsProcessed: this.eventsProcessed,
    };
  }

  // ============================================
  // EVENT EMISSION
  // ============================================

  /**
   * Emit a CTI event
   * @param type - Event type (call_start, call_end, etc.)
   * @param payload - Event payload
   */
  emitEvent(
    type: CTIEventType | string,
    payload: Partial<Omit<CTIEvent, 'type' | 'timestamp'>> = {}
  ): CTIEvent {
    if (!this.isConnected) {
      throw new Error('CTI client not connected. Call connect() first.');
    }

    const event: CTIEvent = {
      type: type as CTIEventType,
      timestamp: Date.now(),
      callId: payload.callId || this.generateCallId(),
      from: payload.from,
      to: payload.to,
      direction: payload.direction,
      state: payload.state,
      duration: payload.duration,
      transferTo: payload.transferTo,
      payload: payload.payload,
    };

    // Add to log
    this.addToLog(event);

    // Emit the event
    this.emit('cti_event', event);
    this.emit(type, event);

    this.eventsProcessed++;
    
    return event;
  }

  /**
   * Emit a call_start event
   */
  emitCallStart(options: {
    from: string;
    to: string;
    direction?: CallDirection;
    callId?: string;
  }): CTIEvent {
    return this.emitEvent('call_start', {
      ...options,
      state: 'ringing',
      direction: options.direction || 'inbound',
    });
  }

  /**
   * Emit a call_end event
   */
  emitCallEnd(callId: string, duration: number = 0): CTIEvent {
    return this.emitEvent('call_end', {
      callId,
      duration,
      state: 'ended',
    });
  }

  /**
   * Emit a call_transfer event
   */
  emitCallTransfer(callId: string, transferTo: string): CTIEvent {
    return this.emitEvent('call_transfer', {
      callId,
      transferTo,
      state: 'transferred',
    });
  }

  /**
   * Emit a screen_pop event (displays caller info on screen)
   */
  emitScreenPop(data: ScreenPopData): CTIEvent {
    return this.emitEvent('screen_pop', {
      callId: this.generateCallId(),
      from: data.callerId,
      payload: {
        entityName: data.entityName,
        entityType: data.entityType,
        entityId: data.entityId,
        vehiclePlate: data.vehiclePlate,
        metadata: data.metadata,
      },
    });
  }

  // ============================================
  // SCRIPTED EVENTS
  // ============================================

  /**
   * Execute a scripted sequence of events
   * @param events - Array of events to emit with delays
   */
  async script(events: ScriptedEvent[]): Promise<CTIEvent[]> {
    if (!this.isConnected) {
      throw new Error('CTI client not connected. Call connect() first.');
    }

    const emittedEvents: CTIEvent[] = [];

    for (const scriptedEvent of events) {
      // Wait for delay if specified
      if (scriptedEvent.delay && scriptedEvent.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, scriptedEvent.delay));
      }

      // Emit the event
      const event = this.emitEvent(scriptedEvent.type, scriptedEvent);
      emittedEvents.push(event);
    }

    return emittedEvents;
  }

  /**
   * Script a complete call flow (start → end)
   */
  async scriptCallFlow(options: {
    from: string;
    to: string;
    duration: number;
    withScreenPop?: boolean;
    screenPopData?: Partial<ScreenPopData>;
  }): Promise<CTIEvent[]> {
    const callId = this.generateCallId();
    const events: ScriptedEvent[] = [];

    // Call start
    events.push({
      type: 'call_start',
      callId,
      from: options.from,
      to: options.to,
      direction: 'inbound',
      state: 'ringing',
    });

    // Optional screen pop
    if (options.withScreenPop) {
      events.push({
        type: 'screen_pop',
        callId,
        from: options.from,
        delay: 100,
        payload: {
          callerId: options.from,
          ...options.screenPopData,
        },
      });
    }

    // Call end
    events.push({
      type: 'call_end',
      callId,
      duration: options.duration,
      state: 'ended',
      delay: 500,
    });

    return this.script(events);
  }

  // ============================================
  // EVENT LOG MANAGEMENT
  // ============================================

  /**
   * Add event to log (with size limit)
   */
  private addToLog(event: CTIEvent): void {
    this.eventLog.push(event);

    // Trim log if exceeds max size
    const maxSize = this.config.maxLogSize ?? 1000;
    if (this.eventLog.length > maxSize) {
      this.eventLog = this.eventLog.slice(-maxSize);
    }
  }

  /**
   * Get all logged events
   */
  getEventLog(): CTIEvent[] {
    return [...this.eventLog];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: CTIEventType): CTIEvent[] {
    return this.eventLog.filter(e => e.type === type);
  }

  /**
   * Get events by call ID
   */
  getEventsByCallId(callId: string): CTIEvent[] {
    return this.eventLog.filter(e => e.callId === callId);
  }

  /**
   * Get the last event
   */
  getLastEvent(): CTIEvent | undefined {
    return this.eventLog[this.eventLog.length - 1];
  }

  /**
   * Get the last event of a specific type
   */
  getLastEventByType(type: CTIEventType): CTIEvent | undefined {
    for (let i = this.eventLog.length - 1; i >= 0; i--) {
      if (this.eventLog[i].type === type) {
        return this.eventLog[i];
      }
    }
    return undefined;
  }

  /**
   * Check if event type exists in log
   */
  hasEvent(type: CTIEventType): boolean {
    return this.eventLog.some(e => e.type === type);
  }

  /**
   * Count events by type
   */
  countEvents(type?: CTIEventType): number {
    if (!type) return this.eventLog.length;
    return this.eventLog.filter(e => e.type === type).length;
  }

  /**
   * Clear the event log
   */
  clearLog(): void {
    this.eventLog = [];
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  /**
   * Register a listener for CTI events
   */
  onCTIEvent(listener: CTIEventListener): this {
    return this.on('cti_event', listener);
  }

  /**
   * Register a listener for specific event type
   */
  onEventType(type: CTIEventType, listener: CTIEventListener): this {
    return this.on(type, listener);
  }

  /**
   * Register a one-time listener for CTI events
   */
  onceCTIEvent(listener: CTIEventListener): this {
    return this.once('cti_event', listener);
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Generate a unique call ID
   */
  private generateCallId(): string {
    this.callIdCounter++;
    return `call-${Date.now()}-${this.callIdCounter}`;
  }

  /**
   * Reset client state (for test cleanup)
   */
  reset(): void {
    this.eventLog = [];
    this.eventsProcessed = 0;
    this.callIdCounter = 0;
    this.removeAllListeners();
  }

  /**
   * Get statistics
   */
  getStats(): {
    eventsProcessed: number;
    logSize: number;
    eventsByType: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    
    for (const event of this.eventLog) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    return {
      eventsProcessed: this.eventsProcessed,
      logSize: this.eventLog.length,
      eventsByType,
    };
  }
}

export default AsteriskMockClient;
