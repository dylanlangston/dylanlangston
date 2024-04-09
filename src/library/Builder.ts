import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { TemplateType, Template } from './Template';
import { SVG } from './SVG';
import { Markdown } from './Markdown';
import * as yaml from 'js-yaml';
const packageJson = require('../package.json');

export const outDir = path.join(__dirname, '..', 'out');

const templatesFilePath = path.join(__dirname, '..', 'build-config.json');

export function get_default_templates(): Template[] {
    return JSON.parse(fs.readFileSync(templatesFilePath, 'utf8'));
}

export async function build(templates: Template[], con?: typeof console): Promise<void> {
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
    }

    function populateTemplate(template: string, input: any): any {
        input.build_time = new Date();
        input.build_version = packageJson.version;
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
                return await SVG.Instance.minify(input, con)
            case TemplateType.Markdown:
                return await Markdown.Instance.minify(input, con);
            default:
                throw `Not Implemented: ${type}`;
        }
    }

    for (let template of templates) {
        const templateSource = fs.readFileSync(path.join(__dirname, '..', 'templates', template.in), 'utf8');
        const handlebars = Handlebars.compile(templateSource);
        const data = populateTemplate(template.in, template.data);
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
            debugger;
        }
    }
}