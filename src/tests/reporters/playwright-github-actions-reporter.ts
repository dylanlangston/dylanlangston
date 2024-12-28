import * as fs from 'fs/promises';
import * as path from 'path';
import { DefaultArtifactClient } from '@actions/artifact';
import { summary } from './github-actions-summary.mjs';
import type * as reporterTypes from 'playwright/types/testReporter';


const artifactClient = new DefaultArtifactClient();
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
async function uploadImages(files: string[], parentDir: string, browser: string, testName: string, attempt: number): Promise<string> {
  const fileName = `${testName}-${browser}-${attempt}`.replace('/', '-');
  const uploadResponse = await artifactClient.uploadArtifact(fileName, files, parentDir, {
    compressionLevel: 0
  });
  const runId = process.env.GITHUB_RUN_ID;
  return `https://github.com/${owner}/${repo}/actions/runs/${runId}/artifacts/${uploadResponse.id}`;
}

const ansiRegex = new RegExp(
  "[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]",
  "g"
);

function cleanText(input: string): string {
  const cleanText = input.replace(ansiRegex, "");
  return cleanText.trim();
}

class PlaywrightGitHubActionsReporter implements reporterTypes.Reporter {
  onTestEnd(test: reporterTypes.TestCase, result: reporterTypes.TestResult): void {
    const testName = test.title;
    const status = result.status === 'passed' ? 'Success' : 'Failure';
    const browser = test.parent.project()!.name;
    const summaryTitle = `🎭 Integration - '${testName} ${browser}' - ${status} (Attempt #${result.retry + 1})`;
    const duration = `Duration: ${result.duration}ms`;

    setTimeout(async () => {
      if (await summary.previousSummaryPresent()) {
        summary.addSeparator();
      }

      if (result.status === 'failed') {
        const error = cleanText(result.error!.message!);
        summary.addHeading(summaryTitle, 4);
        summary.addRaw(`${duration}`, true);
        summary.addQuote(error!);
        const attachments = result.attachments || [];
        const snapshotFiles = attachments.filter((a: any) => a.name.toLowerCase().endsWith(".png"));
        const actualImage = snapshotFiles.find(s => s.name.endsWith("-actual.png"));
        const diffImage = snapshotFiles.find(s => s.name.endsWith("-diff.png"));
        //const expectedImage = snapshotFiles.find(s => s.name.endsWith("-expected.png"));

        if (actualImage && diffImage) {
          const imagesUrl = await uploadImages([actualImage.path!, diffImage.path!], path.dirname(actualImage.path!), browser, testName, result.retry)
          summary.addLink("Screenshots", imagesUrl)
        }
      } else {
        summary.addHeading(summaryTitle, 4);
        summary.addRaw(`${duration}`, true);
      }

      await summary.write({ overwrite: false });
    });
  }
}

export default PlaywrightGitHubActionsReporter;
