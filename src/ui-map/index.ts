/**
 * UI-MAP: Barrel Export
 * Central export for all UI mapping constants
 * 
 * The UI-MAP pattern decouples tests from UI selectors,
 * making tests more maintainable and readable.
 * 
 * Usage:
 *   import { UI_MAP } from '../ui-map';
 *   const fieldLabel = UI_MAP.fields.licensePlate;
 *   const buttonLabel = UI_MAP.buttons.save;
 *   const pageUrl = UI_MAP.pages.vehicles;
 *   const message = UI_MAP.messages.vehicleSaved;
 */

// Import modules and types
import { 
  PAGES, 
  PageKey, 
  getPageUrl, 
  isValidPageKey, 
  MENU_NAVIGATION 
} from './pages';
import { 
  FIELDS, 
  FieldKey, 
  getFieldLabel, 
  isValidFieldKey, 
  getFieldAliases, 
  FIELD_ALIASES 
} from './fields';
import { 
  BUTTONS, 
  ButtonKey, 
  getButtonLabel, 
  isValidButtonKey, 
  getButtonAliases, 
  BUTTON_ALIASES 
} from './buttons';
import { 
  MESSAGES, 
  MessageKey, 
  getMessageText, 
  isValidMessageKey, 
  getMessagePattern, 
  matchesMessage, 
  MESSAGE_PATTERNS 
} from './messages';
import {
  TabletSelectors,
  TabletConstants,
  DeviceProfiles,
  NetworkProfiles,
  TabletSelectorKey,
  DeviceProfileKey,
  NetworkProfileKey,
} from './tablet';

// Re-export all
export { 
  PAGES, PageKey, getPageUrl, isValidPageKey, MENU_NAVIGATION,
  FIELDS, FieldKey, getFieldLabel, isValidFieldKey, getFieldAliases, FIELD_ALIASES,
  BUTTONS, ButtonKey, getButtonLabel, isValidButtonKey, getButtonAliases, BUTTON_ALIASES,
  MESSAGES, MessageKey, getMessageText, isValidMessageKey, getMessagePattern, matchesMessage, MESSAGE_PATTERNS,
  TabletSelectors, TabletConstants, DeviceProfiles, NetworkProfiles,
  TabletSelectorKey, DeviceProfileKey, NetworkProfileKey,
};

/**
 * Unified UI-MAP object
 * Provides convenient access to all UI mappings
 */
export const UI_MAP = {
  pages: PAGES,
  fields: FIELDS,
  buttons: BUTTONS,
  messages: MESSAGES,
  
  // Tablet-specific selectors and constants
  tablet: {
    selectors: TabletSelectors,
    constants: TabletConstants,
    devices: DeviceProfiles,
    networks: NetworkProfiles,
  },
  
  // Aliases for fallback matching
  aliases: {
    fields: FIELD_ALIASES,
    buttons: BUTTON_ALIASES,
  },
  
  // Menu navigation
  menuNavigation: MENU_NAVIGATION,
  
  // Patterns for flexible matching
  patterns: MESSAGE_PATTERNS,
} as const;

/**
 * Type for any UI-MAP key
 */
export type UiMapKey = PageKey | FieldKey | ButtonKey | MessageKey;

/**
 * Resolve any key from UI-MAP
 * Attempts to find the key in pages, fields, buttons, or messages
 * @param key - Key to resolve
 * @returns Resolved value or undefined
 */
export function resolveUiMapKey(key: string): string | undefined {
  if (isValidPageKey(key)) return PAGES[key];
  if (isValidFieldKey(key)) return FIELDS[key];
  if (isValidButtonKey(key)) return BUTTONS[key];
  if (isValidMessageKey(key)) return MESSAGES[key];
  return undefined;
}

/**
 * Get the category of a UI-MAP key
 * @param key - Key to check
 * @returns Category name or undefined
 */
export function getKeyCategory(key: string): 'pages' | 'fields' | 'buttons' | 'messages' | undefined {
  if (isValidPageKey(key)) return 'pages';
  if (isValidFieldKey(key)) return 'fields';
  if (isValidButtonKey(key)) return 'buttons';
  if (isValidMessageKey(key)) return 'messages';
  return undefined;
}

// Default export
export default UI_MAP;
