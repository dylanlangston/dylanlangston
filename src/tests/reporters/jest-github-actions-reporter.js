/** @type {import('@jest/reporters').Reporter} */
class JestGitHubActionsReporter {
  /**
   * @param {object} contexts
   * @param {import('@jest/reporters').AggregatedResult} results
   */
  async onRunComplete(contexts, results) {
    const { EOL } = await import('os');
    const { summary } = await import('./github-actions-summary.mjs')

    if (await summary.previousSummaryPresent()) {
      summary.addSeparator();
    }

    results.testResults.forEach((suite) => {
      suite.testResults.forEach((test) => {
        const status = test.status === 'passed' ? 'Success' : 'Failure';
        summary.addHeading(`🤡 Unit - '${test.fullName}' - ${status}`, 4);
        summary.addRaw(`Duration: ${test.duration}ms`, true);
        if (test.status === 'failed') {
          summary.addQuote(test.failureMessages.join(EOL));
        }
      });
    });

    summary.write({ overwrite: false });
  }
}

export default JestGitHubActionsReporter;