const { summary } = await import('./github-actions-summary.mjs')

let firstOutput = true;

/** @type {import('@jest/reporters').Reporter} */
class JestGitHubActionsReporter {
  /**
   * @param {object} contexts
   * @param {import('@jest/reporters').AggregatedResult} results
   */
  onRunComplete(contexts, results) {
    if (firstOutput) {
      firstOutput = false;
    } else {
      summary.addSeparator();
    }

    results.testResults.forEach((suite) => {
      suite.testResults.forEach((test) => {
        const status = test.status === 'passed' ? 'success' : 'failure';
        summary.addHeading(`🤡 ${test.fullName} test result: ${status}`, 4);
        summary.addRaw(`Duration: ${test.duration}ms`, true);
        if (test.status === 'failed') {
          summary.addQuote(test.failureMessages.join('\n'));
        }
      });
    });

    summary.write({ overwrite: false });
  }
}

export default JestGitHubActionsReporter;