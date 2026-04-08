/**
 * UI-MAP: Button Labels
 * Maps logical button keys to UI labels
 * 
 * Usage: import { BUTTONS } from '../ui-map';
 * const label = BUTTONS.save; // 'Save'
 */

export const BUTTONS = {
  // CRUD actions
  create: 'New',
  new: 'New',
  save: 'Save',
  edit: 'Edit',
  discard: 'Discard',
  discardChanges: 'Discard changes',
  delete: 'Delete',
  archive: 'Archive',
  unarchive: 'Unarchive',
  duplicate: 'Duplicate',
  
  // Search/Filter
  search: 'Search',
  filter: 'Filters',
  groupBy: 'Group By',
  favorites: 'Favorites',
  
  // Navigation
  back: 'Back',
  cancel: 'Cancel',
  close: 'Close',
  confirm: 'Confirm',
  ok: 'Ok',
  
  // Authentication
  login: 'Log in',
  logout: 'Log out',
  
  // Actions
  print: 'Print',
  export: 'Export',
  import: 'Import',
  send: 'Send',
  refresh: 'Refresh',
  
  // Fleet-specific
  newRequest: 'New Request',
  assignDriver: 'Assign Driver',
  unassignDriver: 'Unassign Driver',
  logOdometer: 'Log Odometer',
} as const;

export type ButtonKey = keyof typeof BUTTONS;

/**
 * Odoo button aliases
 * Maps button keys to Odoo-specific variants
 */
export const BUTTON_ALIASES: Record<string, string[]> = {
  create: ['New', 'Create'],
  discard: ['Discard changes', 'Discard'],
  save: ['Save', 'Save & Close', 'Save & New'],
  delete: ['Delete', 'Delete Record'],
} as const;

/**
 * Get button label by key
 * @param buttonKey - Logical button key
 * @returns UI label
 */
export function getButtonLabel(buttonKey: ButtonKey): string {
  return BUTTONS[buttonKey];
}

/**
 * Check if button key exists
 * @param key - Key to check
 * @returns true if key exists in BUTTONS
 */
export function isValidButtonKey(key: string): key is ButtonKey {
  return key in BUTTONS;
}

/**
 * Get all aliases for a button
 * @param buttonKey - Logical button key
 * @returns Array of possible labels including the primary one
 */
export function getButtonAliases(buttonKey: string): string[] {
  const primaryLabel = BUTTONS[buttonKey as ButtonKey];
  const aliases = BUTTON_ALIASES[buttonKey] || [];
  return primaryLabel ? [primaryLabel, ...aliases] : aliases;
}
