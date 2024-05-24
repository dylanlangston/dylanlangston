import * as path from 'path';
import { DefaultArtifactClient } from '@actions/artifact';
import Summary from './github-actions-summary';
import type * as reporterTypes from 'playwright/types/testReporter';


const artifactClient = new DefaultArtifactClient();
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
async function uploadArtifact(filePath: string, browser: string, testName: string): Promise<string> {
  const fileName = `${testName}-${browser}-${path.basename(filePath)}`;
  try {
    const uploadResponse = await artifactClient.uploadArtifact(fileName, [filePath], '/');
    const runId = process.env.GITHUB_RUN_ID;
    return `https://github.com/${owner}/${repo}/suites/artifacts/${runId}/${uploadResponse.id}`;
  }
  catch (err) {
    console.log(err);
    throw err;
  }
}

class PlaywrightGitHubActionsReporter implements reporterTypes.Reporter {
  private summary = new Summary();

  async onTestEnd(test: reporterTypes.TestCase, result: reporterTypes.TestResult): Promise<void> {
    const testName = test.title;
    const status = result.status === 'passed' ? 'success' : 'failure';
    const browser = test.parent.project()!.name;
    const summaryTitle = `🎭 ${testName} ${browser} test result: ${status} (Attempt #${test.retries + 1})`;
    const duration = `Duration: ${result.duration}ms`;

    if (result.status === 'failed') {
      const error = result.error?.message?.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      this.summary.addHeading(summaryTitle, 4);
      this.summary.addRaw(`${duration}`, true);
      this.summary.addQuote(error!);
      const attachments = result.attachments || [];
      const snapshotFiles = attachments.filter((a: any) => a.name.toLowerCase().endsWith(".png"));
      const actualImage = snapshotFiles.find(s => s.name.endsWith("-actual.png"));
      const diffImage = snapshotFiles.find(s => s.name.endsWith("-diff.png"));
      const expectedImage = snapshotFiles.find(s => s.name.endsWith("-expected.png"));

      if (actualImage && diffImage && expectedImage) {
        const [actualURL, diffURL, expectedURL] = await Promise.all([
          uploadArtifact(actualImage.path!, browser, testName),
          uploadArtifact(diffImage.path!, browser, testName),
          uploadArtifact(expectedImage.path!, browser, testName)
        ]);

        this.summary.addEOL();
        this.summary.addRaw('| Original | Diff | Actual |', true);
        this.summary.addRaw('|---|---|---|', true);
        this.summary.addRaw(`| ![Original](${actualURL}) | ![Diff](${diffURL}) | ![Actual](${expectedURL}) |`, true);
      }
    } else {
      this.summary.addHeading(summaryTitle, 4);
      this.summary.addRaw(`${duration}\n`);
    }

    await this.summary.write({ overwrite: false });
  }
}

export default PlaywrightGitHubActionsReporter;
