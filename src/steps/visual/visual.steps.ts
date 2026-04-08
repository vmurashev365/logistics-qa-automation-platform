import { Then } from '@cucumber/cucumber';

import { CustomWorld } from '../../support/custom-world';
import { assertPageMatchesBaseline } from '../../visual/visual';

Then('the page should match visual baseline {string}', { timeout: 60000 }, async function (this: CustomWorld, name: string) {
  await assertPageMatchesBaseline(this.page, name, { fullPage: true });
});
