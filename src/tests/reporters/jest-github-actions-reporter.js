const { summary } = await import('./github-actions-summary.mjs')

let firstOutput = true;

class JestGitHubActionsReporter {
  onRunComplete(contexts, results) {
    if (firstOutput) {
      firstOutput = false;
    } else {
      summary.addSeparator();
    }

    summary.addHeading('Test Suites Summary', 3);
    summary.addRaw(`Total: ${results.numTotalTestSuites}`);
    summary.addRaw(`Passed: ${results.numPassedTestSuites}`);
    summary.addRaw(`Failed: ${results.numFailedTestSuites}`);

    if (results.numFailedTestSuites > 0) {
      summary.addHeading('Failed Test Suites', 4);
      results.testResults.forEach((suite) => {
        if (suite.testResults.some(test => test.status === 'failed')) {
          summary.addHeading(suite.testFilePath, 5);
          summary.addRaw(`Tests: ${suite.numPassedTests} passed, ${suite.numFailedTests} failed, ${suite.numTotalTests} total`);
          suite.testResults.forEach((test) => {
            if (test.status === 'failed') {
              summary.addHeading(test.fullName, 6);
              summary.addRaw(test.failureMessages.join('\n'));
              summary.addBreak();
            }
          });
        }
      });
    } else {
      summary.addHeading('All Tests Passed', 4);
    }

    summary.write({ overwrite: false });
  }
}

export default JestGitHubActionsReporter;