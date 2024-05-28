import * as fs from 'fs';
import * as path from 'path';
import { default as Handlebars } from 'handlebars';
import { TemplateType, Template } from './Template';
import { SVG } from './SVG';
import { Markdown } from './Markdown';
import { GitHubStatsFetcher } from './GithubStats';
import * as yaml from 'js-yaml';
import { default as mime } from 'mime';
import { register as registerHandlerbarHelpers } from './HandlebarsHelpers';

registerHandlerbarHelpers();

export const cwd = process.cwd();
const templatesFilePath = path.join(cwd, 'build-config.json');
export const outDir = path.join(cwd, 'out');

export function get_default_templates(): Template[] {
    return JSON.parse(fs.readFileSync(templatesFilePath, 'utf8'));
}

async function populateTemplate(template: string, input: any, debug: boolean = false): Promise<any> {
    if (input.github && Object.keys(input.github).includes("username") && !input.githubPrepopulated) {
        const githubStats = new GitHubStatsFetcher(input.github.username, process.env.PERSONAL_ACCESS_TOKEN ?? process.env.GITHUB_TOKEN);
        input.github = await githubStats.fetchStats(debug);
        input.githubPrepopulated = true;
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
async function minify(type: TemplateType, input: string, debug: boolean = false, con?: typeof console): Promise<string> {
    switch (type) {
        case TemplateType.SVG:
            return await SVG.Instance.minify(input, debug, con)
        case TemplateType.Markdown:
            return await Markdown.Instance.minify(input, con);
        default:
            throw `Not Implemented: ${type}`;
    }
}
async function processTemplate(template: Template, templates: Template[], debug: boolean = false, con?: typeof console) {
    if (template.type == TemplateType.DarkSVGVarient) {
        const originalSVGTemplate: Template = JSON.parse(JSON.stringify(templates.find(t => t.out == template.in)));
        originalSVGTemplate.out = template.out;
        originalSVGTemplate.data.darkThemeClass = "dark";
        await processTemplate(originalSVGTemplate, templates, debug, con);
        return;
    }

    const templateSource = fs.readFileSync(path.join(cwd, 'templates', template.in), 'utf8');
    const handlebars = Handlebars.compile(templateSource);
    const data = await populateTemplate(template.in, template.data, debug);
    let file: string;

    switch (template.type) {
        case TemplateType.SVG:
            const config: any = yaml.load(handlebars(data));
            file = await SVG.Instance.generateSVGFromConfig(config, data);
            break;
        case TemplateType.Markdown:
            file = handlebars(data);
            break;
        default:
            throw `Not Implemented: ${template.type}`;
    }

    if (!(await validate(template.type, file))) throw `Invalid ${template.type} template: '${template.in}'`;

    if (template.minify !== false) {
        file = await minify(template.type, file, debug, con);
    }

    if (template.out != null) {
        const outFile = path.join(outDir, template.out);
        fs.writeFileSync(outFile, file);

        (con ?? console).log(`${template.type} file generated: '${outFile}'`);
    }
    else template.out = file;
}

export async function build(templates: Template[], debug: boolean = false, con?: typeof console): Promise<Template[]> {
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
    }

    for (let template of templates) {
        await processTemplate(template, templates, debug, con);
    }
    return templates;
}