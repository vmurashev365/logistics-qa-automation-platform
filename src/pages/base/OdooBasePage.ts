/**
 * OdooBasePage - Base class for Odoo-specific page objects
 * Extends BasePage with Odoo-specific functionality
 */

import { Page, Locator } from 'playwright';
import { BasePage } from './BasePage';
import { sleep } from '../../utils/wait';

/**
 * Odoo page base class
 * All Odoo page objects should extend this class
 */
export abstract class OdooBasePage extends BasePage {
  // Common Odoo selectors
  protected readonly selectors = {
    // Loading indicators
    loadingOverlay: '.o_loading',
    blockUI: '.blockUI',
    
    // Navigation
    appMenu: '.o_main_navbar',
    breadcrumb: '.o_breadcrumb',
    
    // Views
    listView: '.o_list_view',
    formView: '.o_form_view',
    kanbanView: '.o_kanban_view',
    
    // Buttons
    createButton: '.o_list_button_add, .o_form_button_create',
    saveButton: '.o_form_button_save',
    discardButton: '.o_form_button_cancel',
    editButton: '.o_form_button_edit',
    
    // Notifications
    notification: '.o_notification',
    notificationSuccess: '.o_notification.bg-success',
    notificationDanger: '.o_notification.bg-danger',
    
    // Modal
    modal: '.modal',
    modalDialog: '.modal-dialog',
    modalClose: '.modal .btn-close',
    
    // Search
    searchInput: '.o_searchview_input',
    searchFacet: '.o_searchview_facet',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Wait for Odoo to be fully loaded and ready
   */
  async waitForOdooReady(): Promise<void> {
    // Wait for loading overlay to disappear
    await this.waitForLoadingComplete();
    
    // Wait for main navbar to be visible
    await this.page.waitForSelector(this.selectors.appMenu, {
      state: 'visible',
      timeout: this.defaultTimeout,
    });
  }

  /**
   * Wait for Odoo loading indicator to disappear
   */
  async waitForLoadingComplete(): Promise<void> {
    try {
      // Wait for loading overlay to disappear (if present)
      const loadingOverlay = this.page.locator(this.selectors.loadingOverlay);
      const isLoadingVisible = await loadingOverlay.isVisible().catch(() => false);
      if (isLoadingVisible) {
        await loadingOverlay.waitFor({ state: 'hidden', timeout: 10000 });
      }
      
      // Wait for blockUI to disappear (if present)
      const blockUI = this.page.locator(this.selectors.blockUI);
      const isBlockUIVisible = await blockUI.isVisible().catch(() => false);
      if (isBlockUIVisible) {
        await blockUI.waitFor({ state: 'hidden', timeout: 10000 });
      }
    } catch {
      // Loading indicators might not appear, that's OK
    }
    
    // Small delay to ensure stability
    await sleep(100);
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const navbar = this.page.locator(this.selectors.appMenu);
      return await navbar.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get breadcrumb text
   */
  async getBreadcrumbText(): Promise<string> {
    const breadcrumb = this.page.locator(this.selectors.breadcrumb);
    return (await breadcrumb.textContent()) || '';
  }

  /**
   * Check if currently in list view
   */
  async isListView(): Promise<boolean> {
    const listView = this.page.locator(this.selectors.listView);
    return await listView.isVisible();
  }

  /**
   * Check if currently in form view
   */
  async isFormView(): Promise<boolean> {
    const formView = this.page.locator(this.selectors.formView);
    return await formView.isVisible();
  }

  /**
   * Check if currently in kanban view
   */
  async isKanbanView(): Promise<boolean> {
    const kanbanView = this.page.locator(this.selectors.kanbanView);
    return await kanbanView.isVisible();
  }

  /**
   * Click Create button
   */
  async clickCreate(): Promise<void> {
    await this.waitForLoadingComplete();
    const createBtn = this.page.locator(this.selectors.createButton).first();
    await createBtn.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click Save button
   */
  async clickSave(): Promise<void> {
    await this.waitForLoadingComplete();
    const saveBtn = this.page.locator(this.selectors.saveButton);
    await saveBtn.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click Discard button
   */
  async clickDiscard(): Promise<void> {
    await this.waitForLoadingComplete();
    const discardBtn = this.page.locator(this.selectors.discardButton);
    await discardBtn.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click Edit button
   */
  async clickEdit(): Promise<void> {
    await this.waitForLoadingComplete();
    const editBtn = this.page.locator(this.selectors.editButton);
    await editBtn.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Wait for notification to appear
   * @param type - 'success' | 'danger' | 'any'
   */
  async waitForNotification(type: 'success' | 'danger' | 'any' = 'any'): Promise<string> {
    let selector: string;
    switch (type) {
      case 'success':
        selector = this.selectors.notificationSuccess;
        break;
      case 'danger':
        selector = this.selectors.notificationDanger;
        break;
      default:
        selector = this.selectors.notification;
    }

    const notification = this.page.locator(selector).first();
    await notification.waitFor({ state: 'visible', timeout: 10000 });
    return (await notification.textContent()) || '';
  }

  /**
   * Close notification if visible
   */
  async closeNotification(): Promise<void> {
    const closeBtn = this.page.locator(`${this.selectors.notification} .btn-close`);
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  }

  /**
   * Check if modal is open
   */
  async isModalOpen(): Promise<boolean> {
    const modal = this.page.locator(this.selectors.modal);
    return await modal.isVisible();
  }

  /**
   * Close modal
   */
  async closeModal(): Promise<void> {
    const closeBtn = this.page.locator(this.selectors.modalClose);
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Search in list/kanban view
   * @param query - Search query
   */
  async search(query: string): Promise<void> {
    const searchInput = this.page.locator(this.selectors.searchInput);
    await searchInput.fill(query);
    await searchInput.press('Enter');
    await this.waitForLoadingComplete();
  }

  /**
   * Clear search filters
   */
  async clearSearch(): Promise<void> {
    const facets = this.page.locator(this.selectors.searchFacet);
    const count = await facets.count();
    
    for (let i = count - 1; i >= 0; i--) {
      const closeBtn = facets.nth(i).locator('.o_facet_remove');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await this.waitForLoadingComplete();
      }
    }
  }

  /**
   * Get row count in list view
   */
  async getListRowCount(): Promise<number> {
    await this.waitForLoadingComplete();
    const rows = this.page.locator('.o_list_view tbody tr.o_data_row');
    return await rows.count();
  }

  /**
   * Click on a row in list view by index
   * @param index - Row index (0-based)
   */
  async clickListRow(index: number): Promise<void> {
    await this.waitForLoadingComplete();
    const rows = this.page.locator('.o_list_view tbody tr.o_data_row');
    await rows.nth(index).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get Odoo field input by label
   * @param label - Field label text
   */
  getOdooField(label: string): Locator {
    // Odoo fields are often in a .o_field_widget container
    return this.page.locator(`.o_field_widget`).filter({
      has: this.page.locator(`label:has-text("${label}")`)
    }).locator('input, textarea, select').first();
  }

  /**
   * Fill Odoo field by label
   * @param label - Field label
   * @param value - Value to fill
   */
  async fillOdooField(label: string, value: string): Promise<void> {
    // Try standard label first
    let field = this.page.getByLabel(label);
    
    if (!(await field.isVisible())) {
      // Try Odoo-specific field selector
      field = this.getOdooField(label);
    }
    
    await field.fill(value);
  }

  /**
   * Get Odoo field value by label
   * @param label - Field label
   */
  async getOdooFieldValue(label: string): Promise<string> {
    // Try standard label first
    let field = this.page.getByLabel(label);
    
    if (!(await field.isVisible())) {
      // Try Odoo-specific field selector
      field = this.getOdooField(label);
    }
    
    return await field.inputValue();
  }
}

export default OdooBasePage;
