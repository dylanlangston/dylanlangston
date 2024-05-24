import * as fs from 'fs/promises';
import * as path from 'path';
import { DefaultArtifactClient } from '@actions/artifact';
import Summary from './github-actions-summary';
import type * as reporterTypes from 'playwright/types/testReporter';


const artifactClient = new DefaultArtifactClient();
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
async function uploadImages(files: string[], parentDir: string, browser: string, testName: string, attempt: number): Promise<string> {
  const fileName = `${testName}-${browser}-${attempt}`;
  console.log(fileName);
  console.log(files);
  console.log(parentDir);
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

let firstOutput: boolean = true;

class PlaywrightGitHubActionsReporter implements reporterTypes.Reporter {
  private summary = new Summary();

  onTestEnd(test: reporterTypes.TestCase, result: reporterTypes.TestResult): void {
    const testName = test.title;
    const status = result.status === 'passed' ? 'success' : 'failure';
    const browser = test.parent.project()!.name;
    const summaryTitle = `🎭 ${testName} ${browser} test result: ${status} (Attempt #${result.retry + 1})`;
    const duration = `Duration: ${result.duration}ms`;

    setTimeout(async () => {
      if (firstOutput) {
        firstOutput = false;
      }
      else {
        this.summary.addSeparator();
      }

      if (result.status === 'failed') {
        const error = cleanText(result.error!.message!);
        this.summary.addHeading(summaryTitle, 4);
        this.summary.addRaw(`${duration}`, true);
        this.summary.addQuote(error!);
        const attachments = result.attachments || [];
        const snapshotFiles = attachments.filter((a: any) => a.name.toLowerCase().endsWith(".png"));
        const actualImage = snapshotFiles.find(s => s.name.endsWith("-actual.png"));
        const diffImage = snapshotFiles.find(s => s.name.endsWith("-diff.png"));
        const expectedImage = snapshotFiles.find(s => s.name.endsWith("-expected.png"));

        if (actualImage && diffImage && expectedImage) {
          const imagesUrl = await uploadImages([actualImage.path!, expectedImage.path!, diffImage.path!], path.dirname(actualImage.path!), browser, testName, result.retry)
          this.summary.addLink("Screenshots", imagesUrl)
        }
      } else {
        this.summary.addHeading(summaryTitle, 4);
        this.summary.addRaw(`${duration}\n`);
      }

      await this.summary.write({ overwrite: false });
    });
  }
}

export default PlaywrightGitHubActionsReporter;
