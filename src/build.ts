import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { TemplateType, Template } from './library/Template';
import { SVG } from './library/SVG';
import { Markdown } from './library/Markdown';
const packageJson = require('./package.json');

const templatesFilePath = path.join(__dirname, 'build-config.json');
const templates: Template[] = JSON.parse(fs.readFileSync(templatesFilePath, 'utf8'));

const outDir = path.join(__dirname, 'out');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}

async function build(templates: Template[]): Promise<boolean> {
    function populateTemplate(template: string, input: any): any {
        switch (template) {
            case "dylan.svg.hbs":
                return input;
            case "readme.md.hbs":
                input.time = new Date();
                input.version = packageJson.version;
                return input;
            default:
                throw `Not Implemented: '${template}'`;
        }
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
                return await SVG.Instance.minify(input)
            case TemplateType.Markdown:
                return await Markdown.Instance.minify(input);
            default:
                throw `Not Implemented: ${type}`;
        }
    }

    for (let template of templates) {
        try {
            const templateSource = fs.readFileSync(path.join(__dirname, 'templates', template.in), 'utf8');
            const handlebars = Handlebars.compile(templateSource);
            const data = populateTemplate(template.in, template.data);
            const output = handlebars(data);
            
            if (!(await validate(template.type, output))) return false;

            const minifiedOutput = await minify(template.type, output);

            if (template.out != null) {
                const outFile = path.join(outDir, template.out);
                fs.writeFileSync(outFile, minifiedOutput);

                console.log(`${template.type} file generated: '${outFile}'`);
            }
        } catch (error) {
            console.error('Unknown Error:', error);
            return false;
        }
    }
    return true;
}

build(templates).then((result) => {
    if (result) {
        console.log(`Build Successful ✨`);
    }
    else {
        console.log(`Build Failed ⚠️`);
        process.exit(1);
    }
}, error => {
    console.error('Unknown Error:', error);
});

