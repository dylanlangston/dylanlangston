import { Reporter, TestResult } from '@playwright/test';
import * as fs from 'fs';

class GitHubActionsReporter implements Reporter {
  onTestBegin(test: TestResult): void {
    console.log(`::group::Starting test: ${test.title}`);
  }

  onTestEnd(test: TestResult, result: any): void {
    const status = result.status === 'passed' ? 'success' : 'failure';
    const summary = `Test ${status}: ${test.title}`;
    const message = `Duration: ${result.duration}ms`;

    if (result.status === 'failed') {
      const error = result.errors[0].message;
      console.log(`::error title=${summary}::${message}\n${error}`);

      const attachments = result.attachments || [];
      const snapshotFiles = attachments.filter((a: any) => a.name === 'screenshot');

      if (snapshotFiles.length > 0) {
        console.log('| Original | Diff | Actual |');
        console.log('|---|---|---|');

        snapshotFiles.forEach((file: any) => {
          const filePath = file.path;
          if (fs.existsSync(filePath)) {
            const base64Image = fs.readFileSync(filePath, 'base64');
            const imageUrl = `data:image/png;base64,${base64Image}`;
            console.log(`| ![Original](${imageUrl}) | ![Diff](${imageUrl}) | ![Actual](${imageUrl}) |`);
          }
        });
      }
    } else {
      console.log(`::notice title=${summary}::${message}`);
    }

    console.log('::endgroup::');
  }

  onEnd(result: any): void {
    const status = result.status === 'passed' ? 'success' : 'failure';
    console.log(`::set-output name=tests-${status}::${result.status}`);
    console.log(`::group::Test run ${status}`);
    console.log(`Total tests: ${result.total}`);
    console.log(`Passed tests: ${result.passed}`);
    console.log(`Failed tests: ${result.failed}`);
    console.log('::endgroup::');
  }
}

export default GitHubActionsReporter;
