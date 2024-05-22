import * as fs from 'fs';
import * as path from 'path';
import { default as Handlebars } from 'handlebars';
import { TemplateType, Template } from './Template';
import { SVG } from './SVG';
import { Markdown } from './Markdown';
import { GitHubStatsFetcher } from './GithubStats';
import * as yaml from 'js-yaml';
import packageJson from '../package.json';
import { default as mime } from 'mime';

export const cwd = process.cwd();
const templatesFilePath = path.join(cwd, 'build-config.json');
export const outDir = path.join(cwd, 'out');

export function get_default_templates(): Template[] {
    return JSON.parse(fs.readFileSync(templatesFilePath, 'utf8'));
}

export async function build(templates: Template[], debug: boolean = false, con?: typeof console): Promise<void> {
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
    }

    async function populateTemplate(template: string, input: any): Promise<any> {
        input.build_time = new Date();
        input.build_version = packageJson.version;
        if (input.files && Array.isArray(input.files)) {
            const newFilesObj: any = {};
            for (let i = 0; i < input.files.length; i++) {
                const file: string = input.files[i];
                const contentType = mime.getType(file) || 'application/octet-stream';
                const fileContent = fs.readFileSync(path.join(cwd, 'static', file), { encoding: 'base64' });

                newFilesObj[file.replace('.', '_')] = `data:${contentType};base64,${fileContent}`;
            }
            input.files = newFilesObj;
        }
        if (input.github && Object.keys(input.github).includes("username")) {
            const githubStats = new GitHubStatsFetcher(input.github.username, process.env.PERSONAL_ACCESS_TOKEN ?? process.env.GITHUB_TOKEN);
            input.github = await githubStats.fetchStats(debug);
        }
        return input;
    }
    async function validate(type: TemplateType, input: string): Promise<boolean> {
        switch (type) {
            case TemplateType.SVG:
                return SVG.Instance.validate(input)
            case TemplateType.Markdown:
                return await Markdown.Instance.validate(input);
            default:
                throw `Not Implemented: ${type}`;
        }
    }
    async function minify(type: TemplateType, input: string): Promise<string> {
        switch (type) {
            case TemplateType.SVG:
                return await SVG.Instance.minify(input, debug, con)
            case TemplateType.Markdown:
                return await Markdown.Instance.minify(input, con);
            default:
                throw `Not Implemented: ${type}`;
        }
    }

    for (let template of templates) {
        const templateSource = fs.readFileSync(path.join(cwd, 'templates', template.in), 'utf8');
        const handlebars = Handlebars.compile(templateSource);
        const data = await populateTemplate(template.in, template.data);
        let file: string;

        switch (template.type) {
            case TemplateType.SVG:
                const config: any = yaml.load(handlebars(data));
                file = await SVG.Instance.generateSVGFromConfig(config);
                break;
            case TemplateType.Markdown:
                file = handlebars(data);
                break;
            default:
                throw `Not Implemented: ${template.type}`;
        }

        if (!(await validate(template.type, file))) throw `Invalid ${template.type} template: '${template.in}'`;

        const minifiedOutput = await minify(template.type, file);

        if (template.out != null) {
            const outFile = path.join(outDir, template.out);
            fs.writeFileSync(outFile, minifiedOutput);

            (con ?? console).log(`${template.type} file generated: '${outFile}'`);
        }
    }
}