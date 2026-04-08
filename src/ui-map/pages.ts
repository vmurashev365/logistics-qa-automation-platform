/**
 * UI-MAP: Page URLs and Routes
 * Maps logical page keys to Odoo URLs
 * 
 * Usage: import { PAGES } from '../ui-map';
 * const url = PAGES.vehicles; // '/web#model=fleet.vehicle&view_type=list'
 */

export const PAGES = {
  // Authentication
  login: '/web/login',
  
  // Fleet Module
  vehicles: '/web#model=fleet.vehicle&view_type=list',
  vehicleForm: '/web#model=fleet.vehicle&view_type=form',
  drivers: '/web#model=fleet.driver&view_type=list',
  driverForm: '/web#model=fleet.driver&view_type=form',
  dashboard: '/web#action=fleet.fleet_vehicle_action',
  
  // Home
  home: '/web',
} as const;

export type PageKey = keyof typeof PAGES;

/**
 * Menu navigation mapping
 * Maps page keys to Odoo menu navigation paths
 */
export const MENU_NAVIGATION: Record<string, { app: string; menuItem?: string }> = {
  vehicles: { app: 'Fleet' },
  drivers: { app: 'Fleet', menuItem: 'Drivers' },
  dashboard: { app: 'Fleet' },
  loads: { app: 'Fleet', menuItem: 'Loads' },
} as const;

/**
 * Get page URL by key
 * @param pageKey - Logical page key
 * @returns URL path
 */
export function getPageUrl(pageKey: PageKey): string {
  return PAGES[pageKey];
}

/**
 * Check if page key exists
 * @param key - Key to check
 * @returns true if key exists in PAGES
 */
export function isValidPageKey(key: string): key is PageKey {
  return key in PAGES;
}
