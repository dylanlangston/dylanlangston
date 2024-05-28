
import * as fs from 'fs';
import * as path from 'path';
import { cwd } from './Builder';
import { default as Handlebars } from 'handlebars';
import { default as mime } from 'mime';
import packageJson from '../package.json';
import { GitHubStatsFetcher } from './GithubStats';

export function register() {
    Handlebars.registerHelper('await', function (promise: Promise<any>, options: any) {
        return new Promise((resolve, reject) => {
            promise
                .then(value => {
                    resolve(options.fn(value));
                })
                .catch(error => {
                    reject(error);
                });
        });
    });

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

    const buildtime = new Date();;
    Handlebars.registerHelper('build_info', function (this: any, type: string) {
        switch (type) {
            case "version":
                return packageJson.version;
            case "time":
                return buildtime;
            default:
                throw "Not Implemented";
        }
    });
}