
import * as fs from 'fs';
import * as path from 'path';
import { build, cwd } from './Builder';
import { default as Handlebars } from 'handlebars';
import { default as mime } from 'mime';
import { GitHubStats, GitHubStatsFetcher } from './GithubStats';

// Extend the Handlebars compile method to handle async data
export async function compileAsync<T>(template: T) {
  
    const isPromise = (obj: any) => !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'

    const delegate = async (context: T) => {
        const hb = Handlebars.compile(template);

        const promises: Promise<any>[] = [];
    
        Handlebars.registerHelper("await", function(this: any, promise) {
            if (isPromise(promise)) {
                const id = promises.push(promise);
                return `\{\{await ${id - 1}\}\}`
            }
            else throw "Not a promise: " + JSON.stringify(promise);
        });
    
        const compiledTemplate = hb(context);
        const asyncResults = await Promise.all(promises);
        const compiledTemplateWithAsyncResults = compiledTemplate.replace(/\{\{await (\d+)\}\}/g, (match, id) => {
            return asyncResults[id];
        });
        return compiledTemplateWithAsyncResults;
    };
    return delegate;
  };

export function register(buildVersion: string, buildTime: Date, debug: boolean) {
    // Source - https://stackoverflow.com/a/16315366
    Handlebars.registerHelper('ifCond', function (this: any, v1, operator, v2, options) {
        switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this as any) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    });

    Handlebars.registerHelper('embed', function (this: any, file: string) {
        const contentType = mime.getType(file) || 'application/octet-stream';
        const fileContent = fs.readFileSync(path.join(cwd, 'static', file), { encoding: 'base64' });
        return `data:${contentType};base64,${fileContent}`;
    });

    Handlebars.registerHelper('build_info', function (this: any, type: string) {
        switch (type) {
            case "version":
                return buildVersion;
            case "time":
                return buildTime;
            case "date-month":
                return (buildTime.getMonth() + 1) + '/' + buildTime.getDate();
            default:
                throw "Not Implemented";
        }
    });

    const githubStatsMap: { [username: string] : Promise<GitHubStats>; } = {}
    Handlebars.registerHelper('fetch_github_stats', async function (this: any, username: string, statName: string) {
        const accessToken = process.env.PERSONAL_ACCESS_TOKEN ?? process.env.GITHUB_TOKEN;
        if (debug || !accessToken) {
            githubStatsMap[username] = new Promise((resolve) => resolve({
                username: this.userName,
                repos: 0,
                contributedRepos: 0,
                commits: 0,
                stars: 0,
                followers: 0,
                linesOfCode: 1,
                linesOfCodeAdded: 2,
                linesOfCodeRemoved: 1
            }));
        }
        else if (typeof githubStatsMap[username] === 'undefined') {
            const githubStats = new GitHubStatsFetcher(username, accessToken);
            githubStatsMap[username] = githubStats.fetchStats();
        }
        const statResult = ((await githubStatsMap[username]) as any)[statName];

        if (typeof statResult === 'undefined') throw `Missing github stat: '${statName}'`;
        return statResult;
    });
}
