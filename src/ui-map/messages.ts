/**
 * UI-MAP: Success/Error Messages
 * Maps logical message keys to expected UI text
 * 
 * Usage: import { MESSAGES } from '../ui-map';
 * const msg = MESSAGES.vehicleSaved; // 'saved'
 */

export const MESSAGES = {
  // Vehicle messages
  vehicleSaved: 'saved',
  vehicleCreated: 'created',
  vehicleDeleted: 'deleted',
  vehicleArchived: 'archived',
  
  // Driver messages
  driverSaved: 'saved',
  driverCreated: 'created',
  driverAssigned: 'assigned',
  driverUnassigned: 'unassigned',
  
  // Authentication messages
  loginSuccess: 'Welcome',
  invalidCredentials: 'Invalid credentials',
  accessDenied: 'Access Denied',
  sessionExpired: 'Session expired',
  
  // Validation messages
  requiredField: 'required',
  invalidFormat: 'Invalid format',
  duplicateRecord: 'already exists',
  
  // Generic success/error
  recordSaved: 'saved',
  recordCreated: 'created',
  recordDeleted: 'deleted',
  operationFailed: 'failed',
  
  // Form validation
  missingLicensePlate: 'License Plate',
  missingModel: 'Model',
  missingDriver: 'Driver',
} as const;

export type MessageKey = keyof typeof MESSAGES;

/**
 * Message patterns for flexible matching
 * Some messages may vary slightly in Odoo
 */
export const MESSAGE_PATTERNS: Record<string, RegExp> = {
  vehicleSaved: /saved|recorded|updated/i,
  vehicleCreated: /created|added|new/i,
  vehicleDeleted: /deleted|removed/i,
  loginSuccess: /welcome|logged in|dashboard/i,
  invalidCredentials: /invalid|wrong|incorrect/i,
  requiredField: /required|mandatory|missing/i,
} as const;

/**
 * Get message text by key
 * @param messageKey - Logical message key
 * @returns Expected message text
 */
export function getMessageText(messageKey: MessageKey): string {
  return MESSAGES[messageKey];
}

/**
 * Check if message key exists
 * @param key - Key to check
 * @returns true if key exists in MESSAGES
 */
export function isValidMessageKey(key: string): key is MessageKey {
  return key in MESSAGES;
}

/**
 * Get message pattern for flexible matching
 * @param messageKey - Logical message key
 * @returns RegExp pattern or undefined
 */
export function getMessagePattern(messageKey: string): RegExp | undefined {
  return MESSAGE_PATTERNS[messageKey];
}

/**
 * Check if text matches a message
 * @param text - Text to check
 * @param messageKey - Message key to match against
 * @returns true if text matches the message pattern or contains the message
 */
export function matchesMessage(text: string, messageKey: MessageKey): boolean {
  const pattern = MESSAGE_PATTERNS[messageKey];
  if (pattern) {
    return pattern.test(text);
  }
  return text.toLowerCase().includes(MESSAGES[messageKey].toLowerCase());
}
