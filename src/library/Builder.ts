import * as fs from 'fs';
const fsPromises = fs.promises;
import * as path from 'path';
import { TemplateType, Template } from './Template';
import { SVG } from './SVG';
import { Markdown } from './Markdown';
import * as yaml from 'js-yaml';
import { compileAsync, register as registerHandlerbarHelpers } from './HandlebarsHelpers';
import { generateWebPreview } from './GeneratePreview';

export const cwd = process.cwd();
const templatesFilePath = path.join(cwd, 'build-config.json');
export function outDir(...args: string[]) {
    return path.join(cwd, 'out', ...args);;
} 
export function distDir(...args: string[]) {
    return path.join(cwd, 'dist', ...args)
}

export function get_default_templates(): Template[] {
    return JSON.parse(fs.readFileSync(templatesFilePath, 'utf8'));
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
async function processTemplate(template: Template, templates: Template[], version: string, dateTime: Date, outputFolder: string = '', debug: boolean = false, con?: typeof console) {
    if (template.type == TemplateType.DarkSVGVarient) {
        const originalSVGTemplate: Template = JSON.parse(JSON.stringify(templates.find(t => t.out == template.in)));
        originalSVGTemplate.out = template.out;
        originalSVGTemplate.data.darkThemeClass = "dark";
        await processTemplate(originalSVGTemplate, templates, version, dateTime, outputFolder, debug, con);
        return;
    }

    const templateSource = await fsPromises.readFile(path.join(cwd, 'templates', template.in), 'utf8');
    const handlebars = await compileAsync(templateSource);
    let file: string;

    switch (template.type) {
        case TemplateType.SVG:
            const config: any = yaml.load(await handlebars(template.data));
            file = await SVG.Instance.generateSVGFromConfig(config, template.data, version, dateTime, outputFolder, debug, con);
            break;
        case TemplateType.Markdown:
            file = await handlebars(template.data);
            break;
        default:
            throw `Not Implemented: ${template.type}`;
    }

    if (!(await validate(template.type, file))) throw `Invalid ${template.type} template: '${template.in}'`;

    if (template.minify !== false) {
        file = await minify(template.type, file, debug, con);
    }

    if (template.out != null) {
        const outFile = path.join(outDir(outputFolder), template.out);
        await fsPromises.writeFile(outFile, file);

        (con ?? console).log(`${template.type} file generated: '${outFile}'`);
    }
    else template.out = file;
}

export async function build(templates: Template[], version: string, dateTime: Date, outputFolder: string = '', debug: boolean = false, con?: typeof console): Promise<Template[]> {
    registerHandlerbarHelpers(version, dateTime, debug);

    if (!fs.existsSync(outDir(outputFolder))) {
        fsPromises.mkdir(outDir(outputFolder));
    }

    const originalTemplates = JSON.parse(JSON.stringify(templates));

    for (let template of templates) {
        await processTemplate(template, templates, version, dateTime, outputFolder, debug, con);
    }

    if (!debug) await build_github_pages_site(originalTemplates, outputFolder, con);
    return templates;
}

export async function build_github_pages_site(templates: Template[], outputFolder: string, con?: typeof console) {
    if (!fs.existsSync(distDir(outputFolder))) {
        await fsPromises.mkdir(distDir(outputFolder));
    }

    for (let template of templates) {
        if (template.out) {
            const preview = await generateWebPreview('/' + template.out, templates, outputFolder);
            const out = path.join(distDir(''), template.out);
            switch (template.type) {
                case TemplateType.Markdown:
                    if (template.out == "ReadMe.md") {
                        await fsPromises.writeFile(path.join(distDir(''), 'index.html'), preview.content);
                        return;
                    }
                default:
                    await fsPromises.writeFile(out, preview.content);
            }
        }
    }
}