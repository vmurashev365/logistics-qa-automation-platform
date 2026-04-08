/**
 * CTI (Computer Telephony Integration) Types
 * Type definitions for CTI events and client interfaces
 */

/**
 * CTI Event types supported by the mock client
 */
export type CTIEventType = 
  | 'call_start' 
  | 'call_end' 
  | 'call_transfer' 
  | 'screen_pop'
  | 'call_hold'
  | 'call_resume'
  | 'dtmf_received';

/**
 * Call direction
 */
export type CallDirection = 'inbound' | 'outbound' | 'internal';

/**
 * Call state
 */
export type CallState = 
  | 'ringing' 
  | 'connected' 
  | 'on_hold' 
  | 'transferred' 
  | 'ended';

/**
 * CTI Event interface
 * Represents a single CTI event from the phone system
 */
export interface CTIEvent {
  /** Event type identifier */
  type: CTIEventType;
  /** Unix timestamp when event occurred */
  timestamp: number;
  /** Unique call identifier */
  callId: string;
  /** Caller phone number */
  from?: string;
  /** Callee phone number */
  to?: string;
  /** Call direction */
  direction?: CallDirection;
  /** Current call state */
  state?: CallState;
  /** Duration in seconds (for call_end events) */
  duration?: number;
  /** Transfer target (for call_transfer events) */
  transferTo?: string;
  /** Additional event payload */
  payload?: Record<string, unknown>;
}

/**
 * Screen pop data for displaying on incoming calls
 */
export interface ScreenPopData {
  /** Caller ID / phone number */
  callerId: string;
  /** Matched entity name (driver, customer, etc.) */
  entityName?: string;
  /** Entity type */
  entityType?: 'driver' | 'customer' | 'vendor' | 'unknown';
  /** Entity ID in the system */
  entityId?: number;
  /** Associated vehicle plate (if applicable) */
  vehiclePlate?: string;
  /** Additional display data */
  metadata?: Record<string, unknown>;
}

/**
 * CTI Client configuration
 */
export interface CTIClientConfig {
  /** Server URL (for real implementations) */
  serverUrl?: string;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Event log size limit */
  maxLogSize?: number;
}

/**
 * CTI Event listener callback type
 */
export type CTIEventListener = (event: CTIEvent) => void | Promise<void>;

/**
 * Scripted event for replay functionality
 */
export interface ScriptedEvent extends Omit<CTIEvent, 'timestamp'> {
  /** Delay before emitting this event (in ms) */
  delay?: number;
}

/**
 * CTI connection status
 */
export interface CTIConnectionStatus {
  /** Whether client is connected */
  connected: boolean;
  /** Last connection timestamp */
  connectedAt?: number;
  /** Last disconnect timestamp */
  disconnectedAt?: number;
  /** Number of events processed */
  eventsProcessed: number;
}
