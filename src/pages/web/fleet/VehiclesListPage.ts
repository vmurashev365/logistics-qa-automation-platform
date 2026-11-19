/**
 * VehiclesListPage - Page object for Fleet Vehicles List view
 * Handles vehicle list operations in Odoo Fleet module
 */

import { Page } from 'playwright';
import { OdooBasePage } from '../../base/OdooBasePage';
import { firstVisible } from '../../../utils/wait';

/**
 * Vehicle data interface
 */
export interface VehicleData {
  licensePlate?: string;
  model?: string;
  driver?: string;
  status?: string;
  tags?: string[];
}

/**
 * VehiclesListPage - Fleet Vehicles List Page Object
 */
export class VehiclesListPage extends OdooBasePage {
  // Page-specific selectors
  private readonly vehicleSelectors = {
    // List view
    vehicleRow: '.o_data_row',
    licensePlateColumn: 'td[data-field="license_plate"]',
    modelColumn: 'td[data-field="model_id"]',
    driverColumn: 'td[data-field="driver_id"]',
    
    // Form fields
    licensePlateInput: 'input[name="license_plate"]',
    modelSelect: 'div[name="model_id"] input',
    driverSelect: 'div[name="driver_id"] input',
    
    // Buttons
    createVehicleBtn: '.o_list_button_add',
    
    // Views
    vehiclesListView: '.o_list_view',
    vehicleFormView: '.o_form_view',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to Vehicles page (list or kanban view)
   * @param baseUrl - Base URL of Odoo instance
   */
  async navigateToVehicles(baseUrl: string): Promise<void> {
    // Open the Fleet "Vehicles" action and wait for its list or kanban view. (No networkidle:
    // Odoo keeps connections open, so it never arrives and only burns its timeout.)
    const url = `${baseUrl}/web#action=fleet.fleet_vehicle_action`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page
      .locator('.o_action_manager')
      .locator('.o_kanban_view, .o_list_view')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Check if we're on the Vehicles list page
   */
  async isOnVehiclesListPage(): Promise<boolean> {
    try {
      await this.waitForLoadingComplete();
      
      // Check URL contains fleet.vehicle
      const url = this.page.url();
      if (!url.includes('fleet.vehicle')) {
        return false;
      }
      
      // Check list view is visible
      return await this.isListView();
    } catch {
      return false;
    }
  }

  /**
   * Click Create button to open new vehicle form
   */
  async clickCreateVehicle(): Promise<void> {
    // Click New button - in Odoo 17 it's labeled "New"
    const newBtn = this.page.getByRole('button', { name: /^new$/i }).first();
    await newBtn.click({ timeout: 5000 });
    
    // Wait for form to appear
    await this.page.locator('.o_form_view').waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Check if we're on the Vehicle form (create/edit)
   */
  async isOnVehicleForm(): Promise<boolean> {
    await this.waitForLoadingComplete();
    return await this.isFormView();
  }

  /**
   * Fill License Plate field
   * @param licensePlate - License plate value
   */
  async fillLicensePlate(licensePlate: string): Promise<void> {
    await this.waitForLoadingComplete();
    
    // Try label-based selector first
    const field = this.page.getByLabel(/license plate/i);
    if (await field.isVisible()) {
      await field.fill(licensePlate);
    } else {
      // Fallback to name selector
      await this.page.locator(this.vehicleSelectors.licensePlateInput).fill(licensePlate);
    }
  }

  /**
   * Get License Plate field value
   */
  async getLicensePlateValue(): Promise<string> {
    await this.waitForLoadingComplete();
    
    // Try label-based selector first
    const field = this.page.getByLabel(/license plate/i);
    if (await field.isVisible()) {
      return await field.inputValue();
    }
    
    // Fallback to name selector
    return await this.page.locator(this.vehicleSelectors.licensePlateInput).inputValue();
  }

  // Model and driver are chosen in VehicleFormPage (chooseModel) and by the driver-assignment
  // step, which pick the exact suggestion and fail otherwise, never "the first one offered".

  /**
   * Save vehicle form
   */
  async saveVehicle(): Promise<void> {
    await this.clickSave();
  }

  /**
   * Get list of license plates from the list view
   */
  async getLicensePlatesFromList(): Promise<string[]> {
    await this.waitForLoadingComplete();
    
    const licensePlates: string[] = [];
    const cells = this.page.locator(this.vehicleSelectors.licensePlateColumn);
    const count = await cells.count();
    
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent();
      if (text) {
        licensePlates.push(text.trim());
      }
    }
    
    return licensePlates;
  }

  /**
   * Search for vehicle by license plate
   * @param licensePlate - License plate to search
   */
  async searchByLicensePlate(licensePlate: string): Promise<void> {
    await this.search(licensePlate);
  }

  /**
   * Get vehicle count in list
   */
  async getVehicleCount(): Promise<number> {
    return await this.getListRowCount();
  }

  /**
   * Click on vehicle row by license plate
   * Works in both List view (.o_data_row) and Kanban view (.o_kanban_record)
   * @param licensePlate - License plate of vehicle to click
   */
  async clickVehicleByLicensePlate(licensePlate: string): Promise<void> {
    await this.waitForLoadingComplete();
    const escaped = licensePlate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Wait for the vehicle in whichever view is shown, preferring: list row, the kanban card's
    // click area (its text starts with the plate, e.g. "MD-AUDIT-001: Audi/A1"), any kanban card
    // with the plate. Sample records Odoo shows for an empty model are excluded.
    const real = '.o_content:not(.o_view_sample_data)';
    const target = await firstVisible(
      [
        this.page.locator(`${real} .o_data_row`).filter({ has: this.page.locator(`td:has-text("${licensePlate}")`) }),
        this.page.locator(`${real} .o_kanban_record .oe_kanban_global_click`).filter({ hasText: new RegExp(`^${escaped}`) }),
        this.page.locator(`${real} .o_kanban_record`).filter({ hasText: licensePlate }),
      ],
      10000
    );
    if (!target) {
      throw new Error(`Vehicle "${licensePlate}" is not shown in the vehicles list or kanban`);
    }
    await target.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Alias for clickVehicleByLicensePlate
   * @param licensePlate - License plate of vehicle to click
   */
  async clickVehicleByPlate(licensePlate: string): Promise<void> {
    await this.clickVehicleByLicensePlate(licensePlate);
  }

  /**
   * Search for vehicle by license plate
   * @param licensePlate - License plate to search
   */
  async searchVehicle(licensePlate: string): Promise<void> {
    await this.search(licensePlate);
  }

  /**
   * Get vehicle row locator by license plate
   * @param licensePlate - License plate to find
   */
  getVehicleByPlate(licensePlate: string) {
    return this.page.locator('.o_data_row').filter({
      has: this.page.locator(`td:has-text("${licensePlate}")`)
    }).first();
  }

  /**
   * Check if vehicle exists in list by license plate
   * @param licensePlate - License plate to check
   */
  async vehicleExistsInList(licensePlate: string): Promise<boolean> {
    await this.waitForLoadingComplete();
    
    const licensePlates = await this.getLicensePlatesFromList();
    return licensePlates.includes(licensePlate);
  }

  /**
   * Delete current vehicle (from form view)
   */
  async deleteVehicle(): Promise<void> {
    await this.waitForLoadingComplete();
    
    // Click Action menu
    const actionBtn = this.page.getByRole('button', { name: /action/i });
    await actionBtn.click();
    
    // Click Delete
    const deleteOption = this.page.getByRole('menuitem', { name: /delete/i });
    await deleteOption.click();
    
    // Confirm deletion in modal
    const confirmBtn = this.page.getByRole('button', { name: /ok|confirm|yes/i });
    await confirmBtn.click();
    
    await this.waitForLoadingComplete();
  }
}

export default VehiclesListPage;
