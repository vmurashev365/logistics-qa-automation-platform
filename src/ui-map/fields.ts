/**
 * UI-MAP: Form Field Labels
 * Maps logical field keys to UI labels
 * 
 * Usage: import { FIELDS } from '../ui-map';
 * const label = FIELDS.licensePlate; // 'License Plate'
 */

export const FIELDS = {
  // Vehicle fields
  licensePlate: 'License Plate',
  model: 'Model',
  modelName: 'Model Name',
  vehicleType: 'Vehicle Type',
  driver: 'Driver',
  assignedDriver: 'Assigned Driver',
  odometer: 'Odometer',
  currentOdometer: 'Current Odometer',
  acquisitionDate: 'Acquisition Date',
  immatriculation: 'Immatriculation Date',
  firstContractDate: 'First Contract Date',
  vin: 'Chassis Number',
  fuelType: 'Fuel Type',
  color: 'Color',
  seats: 'Seats Number',
  doors: 'Doors Number',
  brand: 'Brand',
  horsepower: 'Horsepower',
  horsepowerTax: 'Horsepower Taxation',
  power: 'Power',
  co2: 'CO2 Emissions',
  category: 'Category',
  tags: 'Tags',
  
  // Driver fields
  driverName: 'Name',
  driverPhone: 'Phone',
  driverMobile: 'Mobile',
  driverEmail: 'Email',
  driverCompany: 'Company',
  driverDepartment: 'Department',
  
  // Login fields
  login: 'Email',
  email: 'Email',
  password: 'Password',
  
  // Common fields
  name: 'Name',
  description: 'Description',
  notes: 'Notes',
  company: 'Company',
  active: 'Active',
} as const;

export type FieldKey = keyof typeof FIELDS;

/**
 * Odoo field name aliases
 * Some fields have different labels in Odoo UI (e.g., with '?' suffix)
 */
export const FIELD_ALIASES: Record<string, string[]> = {
  licensePlate: ['License Plate?', 'License Plate'],
  model: ['Model', 'Model Name'],
  driver: ['Driver', 'Assigned Driver'],
} as const;

/**
 * Get field label by key
 * @param fieldKey - Logical field key
 * @returns UI label
 */
export function getFieldLabel(fieldKey: FieldKey): string {
  return FIELDS[fieldKey];
}

/**
 * Check if field key exists
 * @param key - Key to check
 * @returns true if key exists in FIELDS
 */
export function isValidFieldKey(key: string): key is FieldKey {
  return key in FIELDS;
}

/**
 * Get all aliases for a field
 * @param fieldKey - Logical field key
 * @returns Array of possible labels including the primary one
 */
export function getFieldAliases(fieldKey: string): string[] {
  const primaryLabel = FIELDS[fieldKey as FieldKey];
  const aliases = FIELD_ALIASES[fieldKey] || [];
  return primaryLabel ? [primaryLabel, ...aliases] : aliases;
}
