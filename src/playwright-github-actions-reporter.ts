import * as path from 'path';
import * as artifact from '@actions/artifact';
import Summary from './github-actions-summary';

import type * as reporterTypes from 'playwright/types/testReporter';

const artifactClient = new artifact.DefaultArtifactClient();
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
async function uploadArtifact(filePath: string): Promise<string> {
    const fileName = path.basename(filePath);
    const uploadResponse = await artifactClient.uploadArtifact(fileName, [filePath], '.', {
        
    });

    const runId = process.env.GITHUB_RUN_ID;
    return `https://github.com/${owner}/${repo}/suites/artifacts/${runId}/${uploadResponse.id}`;
}

class PlaywrightGitHubActionsReporter implements reporterTypes.Reporter {
  private summary = new Summary();

  async onTestEnd(test: reporterTypes.TestCase, result: reporterTypes.TestResult): Promise<void> {

    const status = result.status === 'passed' ? 'success' : 'failure';
    const summaryTitle = `🎭 ${test.parent.project()?.name} test result: ${status} (Attempt #${test.retries + 1})`;
    const duration = `Duration: ${result.duration}ms`;

    if (result.status === 'failed') {
      const error = result.error?.message;
      this.summary.addHeading(summaryTitle, 4);
      this.summary.addRaw(`${duration}`, true);
      this.summary.addQuote(error!);
      const attachments = result.attachments || [];
      const snapshotFiles = attachments.filter((a: any) => a.name.toLowerCase().endsWith(".png"));
      const actualImage = snapshotFiles.find(s => s.name.endsWith("-actual.png"));
      const diffImage = snapshotFiles.find(s => s.name.endsWith("-diff.png"));
      const expectedImage = snapshotFiles.find(s => s.name.endsWith("-expected.png"));

      if (actualImage && diffImage && expectedImage) {
        this.summary.addRaw('| Original | Diff | Actual |', true);
        this.summary.addRaw('|---|---|---|', true);
        this.summary.addRaw(`| ![Original](${await uploadArtifact(actualImage.path!)}) | ![Diff](${await uploadArtifact(diffImage.path!)}) | ![Actual](${await uploadArtifact(expectedImage.path!)}) |`, true);
      }
    } else {
      this.summary.addHeading(summaryTitle, 4);
      this.summary.addRaw(`${duration}\n`);
    }

    this.summary.addSeparator();
    this.summary.write({overwrite: false});
  }
}

export default PlaywrightGitHubActionsReporter;
