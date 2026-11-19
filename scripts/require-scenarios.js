const { Formatter } = require('@cucumber/cucumber');

module.exports = class RequireScenarios extends Formatter {
  constructor(options) {
    super(options);
    this.selected = false;
    options.eventBroadcaster.on('envelope', ({ testCase }) => {
      if (testCase) this.selected = true;
    });
  }

  async finished() {
    this.log(this.selected ? 'Accessibility selection contained scenarios.\n' : 'Accessibility selection contained zero scenarios.\n');
    await super.finished();
    if (!this.selected) {
      throw new Error('No runnable scenarios matched. The Loads accessibility scenarios are marked @wip.');
    }
  }
};
