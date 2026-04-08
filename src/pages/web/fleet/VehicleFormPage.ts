/**
 * VehicleFormPage - Page object for Fleet Vehicle Form view
 * Handles vehicle creation and editing in Odoo Fleet module
 */

import { Page } from 'playwright';
import { OdooBasePage } from '../../base/OdooBasePage';
import { UI_MAP, FieldKey, isValidFieldKey } from '../../../ui-map';

/**
 * Vehicle form data interface
 */
export interface VehicleFormData {
  licensePlate?: string;
  model?: string;
  vehicleType?: string;
  driver?: string;
  odometer?: string;
  acquisitionDate?: string;
  fuelType?: string;
  color?: string;
  vin?: string;
  seats?: string;
  doors?: string;
  horsepower?: string;
  co2?: string;
}

/**
 * VehicleFormPage - Fleet Vehicle Form Page Object
 */
export class VehicleFormPage extends OdooBasePage {
  // Page-specific selectors
  private readonly formSelectors = {
    // Form containers
    formView: '.o_form_view',
    formSheet: '.o_form_sheet',
    
    // Fields (by name attribute)
    licensePlateInput: '[name="license_plate"] input, input[name="license_plate"]',
    modelSelect: '[name="model_id"]',
    driverSelect: '[name="driver_id"]',
    odometerInput: '[name="odometer"] input',
    
    // Buttons
    saveButton: '.o_form_button_save',
    discardButton: '.o_form_button_cancel',
    editButton: '.o_form_button_edit',
    
    // Dropdowns
    dropdownMenu: '.o_m2o_dropdown_option, .ui-menu-item, .dropdown-item',
    autocompleteDropdown: '.o-autocomplete--dropdown-menu',
    
    // Status
    statusBar: '.o_form_statusbar',
    notification: '.o_notification_content',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Get the URL for this page
   * Note: Form URL is dynamic, navigate via VehiclesListPage.clickCreate()
   */
  get url(): string {
    // Form URL is dynamic based on vehicle ID
    return UI_MAP.pages.vehicleForm;
  }

  /**
   * Check if we're on the vehicle form view
   */
  async isOnVehicleForm(): Promise<boolean> {
    try {
      const formView = this.page.locator(this.formSelectors.formView);
      return await formView.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for form to be ready
   */
  async waitForFormReady(): Promise<void> {
    await this.waitForLoadingComplete();
    await this.page.locator(this.formSelectors.formView).waitFor({ 
      state: 'visible', 
      timeout: 10000 
    });
  }

  /**
   * Fill a field by its UI-MAP key
   * @param fieldKey - Logical field key from UI-MAP
   * @param value - Value to fill
   */
  async fillField(fieldKey: string, value: string): Promise<void> {
    // Get label from UI-MAP
    const fieldLabel = isValidFieldKey(fieldKey) 
      ? UI_MAP.fields[fieldKey as FieldKey]
      : fieldKey; // Fallback to raw key if not in UI-MAP

    // Try multiple strategies for filling the field
    try {
      // Strategy 1: By label with exact match
      const fieldByLabel = this.page.getByLabel(fieldLabel, { exact: true });
      if (await fieldByLabel.isVisible({ timeout: 2000 })) {
        await fieldByLabel.fill(value);
        return;
      }
    } catch {
      // Continue to next strategy
    }

    try {
      // Strategy 2: By label with partial match (Odoo adds ? to some labels)
      const fieldByPartialLabel = this.page.getByLabel(new RegExp(fieldLabel, 'i'));
      if (await fieldByPartialLabel.isVisible({ timeout: 2000 })) {
        await fieldByPartialLabel.fill(value);
        return;
      }
    } catch {
      // Continue to next strategy
    }

    try {
      // Strategy 3: By role textbox
      const fieldByRole = this.page.getByRole('textbox', { name: new RegExp(fieldLabel, 'i') });
      if (await fieldByRole.isVisible({ timeout: 2000 })) {
        await fieldByRole.fill(value);
        return;
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 4: By name attribute (snake_case conversion)
    const snakeCaseKey = this.toSnakeCase(fieldKey);
    const fieldByName = this.page.locator(`[name="${snakeCaseKey}"] input, input[name="${snakeCaseKey}"]`);
    if (await fieldByName.isVisible({ timeout: 2000 })) {
      await fieldByName.fill(value);
      return;
    }

    throw new Error(`Could not find field: ${fieldKey} (label: ${fieldLabel})`);
  }

  /**
   * Fill license plate field
   * @param plate - License plate value
   */
  async fillLicensePlate(plate: string): Promise<void> {
    await this.fillField('licensePlate', plate);
  }

  /**
   * Fill model field
   * @param model - Model name
   */
  async fillModel(model: string): Promise<void> {
    await this.fillField('model', model);
  }

  /**
   * Select driver from dropdown
   * @param driverName - Driver name to select
   */
  async selectDriver(driverName: string): Promise<void> {
    const driverField = this.page.locator(this.formSelectors.driverSelect);
    
    // Click to open dropdown
    await driverField.click();
    
    // Wait for dropdown options
    await this.page.waitForSelector(this.formSelectors.dropdownMenu, { 
      state: 'visible',
      timeout: 5000 
    });
    
    // Select the driver
    await this.page.locator(`${this.formSelectors.dropdownMenu}:has-text("${driverName}")`).first().click();
    
    await this.waitForLoadingComplete();
  }

  /**
   * Select model from dropdown
   * @param modelName - Model name to select
   */
  async selectModel(modelName: string): Promise<void> {
    const modelField = this.page.locator(this.formSelectors.modelSelect);
    
    // Click to open dropdown
    await modelField.click();
    
    // Wait for dropdown options
    await this.page.waitForSelector(this.formSelectors.dropdownMenu, { 
      state: 'visible',
      timeout: 5000 
    });
    
    // Select the model
    await this.page.locator(`${this.formSelectors.dropdownMenu}:has-text("${modelName}")`).first().click();
    
    await this.waitForLoadingComplete();
  }

  /**
   * Fill odometer value
   * @param value - Odometer reading
   */
  async fillOdometer(value: string): Promise<void> {
    await this.fillField('odometer', value);
  }

  /**
   * Click Save button
   */
  async clickSave(): Promise<void> {
    await super.clickSave();
  }

  /**
   * Click Edit button
   */
  async clickEdit(): Promise<void> {
    await super.clickEdit();
  }

  /**
   * Click Discard button
   */
  async clickDiscard(): Promise<void> {
    await super.clickDiscard();
  }

  /**
   * Wait for success notification
   * @param timeout - Timeout in milliseconds
   */
  async waitForSuccessMessage(timeout: number = 5000): Promise<string> {
    const notification = this.page.locator(this.formSelectors.notification);
    await notification.waitFor({ state: 'visible', timeout });
    
    const text = await notification.textContent();
    
    // Verify it's a success message
    if (text && (text.toLowerCase().includes('saved') || 
                 text.toLowerCase().includes('created') ||
                 text.toLowerCase().includes('updated'))) {
      return text;
    }
    
    return text || '';
  }

  /**
   * Check if form has validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    const errorFields = this.page.locator('.o_field_invalid, .is-invalid');
    return await errorFields.count() > 0;
  }

  /**
   * Get validation error messages
   */
  async getValidationErrors(): Promise<string[]> {
    const errors: string[] = [];
    const errorElements = this.page.locator('.o_notification_content.text-danger, .invalid-feedback');
    const count = await errorElements.count();
    
    for (let i = 0; i < count; i++) {
      const text = await errorElements.nth(i).textContent();
      if (text) errors.push(text.trim());
    }
    
    return errors;
  }

  /**
   * Fill multiple form fields
   * @param data - Object with field keys and values
   */
  async fillForm(data: VehicleFormData): Promise<void> {
    for (const [fieldKey, value] of Object.entries(data)) {
      if (value) {
        // Handle special fields that need dropdowns
        if (fieldKey === 'driver') {
          await this.selectDriver(value);
        } else if (fieldKey === 'model' && value.includes(' ')) {
          // If model looks like a selection (has space), use dropdown
          await this.selectModel(value);
        } else {
          await this.fillField(fieldKey, value);
        }
      }
    }
  }

  /**
   * Get current license plate value
   */
  async getLicensePlate(): Promise<string> {
    const input = this.page.locator(this.formSelectors.licensePlateInput);
    return (await input.inputValue()) || '';
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
