import type { Page } from 'playwright';

export abstract class BasePage {
  constructor(
    protected readonly page: Page,
    protected readonly defaultTimeout = 30000
  ) {}
}

export default BasePage;
