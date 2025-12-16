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

export class Builder {
    private _templates: Template[] = [];
    private _version: string = '1.0.0';
    private _dateTime: Date = new Date();
    private _outputFolder: string = '';
    private _disableAnimation: boolean = false;
    private _debug: boolean = false;
    private _console?: typeof console;
    private _skipGithubPages: boolean = false;

    withTemplates(templates: Template[]): this {
        this._templates = templates;
        return this;
    }

    withVersion(version: string): this {
        this._version = version;
        return this;
    }

    withDateTime(dateTime: Date): this {
        this._dateTime = dateTime;
        return this;
    }

    withOutputFolder(outputFolder: string): this {
        this._outputFolder = outputFolder;
        return this;
    }

    withDebug(debug: boolean): this {
        this._debug = debug;
        return this;
    }

    withConsole(con: typeof console): this {
        this._console = con;
        return this;
    }

    skipGithubPages(): this {
        this._skipGithubPages = true;
        return this;
    }

    async build(): Promise<Template[]> {
        registerHandlerbarHelpers(this._version, this._dateTime, this._debug);

        if (!fs.existsSync(outDir(this._outputFolder))) {
            await fsPromises.mkdir(outDir(this._outputFolder), {
                recursive: true
            });
        }

        const originalTemplates = JSON.parse(JSON.stringify(this._templates));

        for (let template of this._templates) {
            await this._processTemplate(template);
        }

        if (!this._debug && !this._skipGithubPages) {
            await this._buildGithubPagesSite(originalTemplates);
        }

        return this._templates;
    }

    private async _processTemplate(template: Template): Promise<void> {
        if (template.type == TemplateType.DarkSVGVarient) {
            await this._processDarkVariant(template);
            return;
        }

        if (template.type == TemplateType.AnimationDisabledSVG) {
            await this._processAnimationDisabledVariant(template);
            return;
        }

        if (template.type == TemplateType.DarkAnimationDisabledSVG) {
            await this._processDarkAnimationDisabledVariant(template);
            return;
        }

        await this._processBaseTemplate(template);
    }

    private async _processDarkVariant(template: Template): Promise<void> {
        const originalTemplate = this._findOriginalTemplate(template.in);
        const darkTemplate = this._cloneTemplate(originalTemplate);
        darkTemplate.out = template.out;
        darkTemplate.data.darkThemeClass = "dark";
        await this._processBaseTemplate(darkTemplate);
    }

    private async _processAnimationDisabledVariant(template: Template): Promise<void> {
        const originalTemplate = this._findOriginalTemplate(template.in);
        const noAnimTemplate = this._cloneTemplate(originalTemplate);
        noAnimTemplate.out = template.out;
        
        const originalDisableAnimation = this._disableAnimation;
        this._disableAnimation = true;
        await this._processBaseTemplate(noAnimTemplate);
        this._disableAnimation = originalDisableAnimation;
    }

    private async _processDarkAnimationDisabledVariant(template: Template): Promise<void> {
        const originalTemplate = this._findOriginalTemplate(template.in);
        const darkNoAnimTemplate = this._cloneTemplate(originalTemplate);
        darkNoAnimTemplate.out = template.out;
        darkNoAnimTemplate.data.darkThemeClass = "dark";
        
        const originalDisableAnimation = this._disableAnimation;
        this._disableAnimation = true;
        await this._processBaseTemplate(darkNoAnimTemplate);
        this._disableAnimation = originalDisableAnimation;
    }

    private _findOriginalTemplate(outputName: string): Template {
        const originalTemplate = this._templates.find(t => t.out == outputName);
        if (!originalTemplate) {
            throw `Original template not found for: ${outputName}`;
        }
        return originalTemplate;
    }

    private _cloneTemplate(template: Template): Template {
        return JSON.parse(JSON.stringify(template));
    }

    private async _processBaseTemplate(template: Template): Promise<void> {
        const templateSource = await fsPromises.readFile(path.join(cwd, 'templates', template.in), 'utf8');
        const handlebars = await compileAsync(templateSource);
        let file: string;

        switch (template.type) {
            case TemplateType.SVG:
                const config: any = yaml.load(await handlebars(template.data));
                file = await SVG.Instance.generateSVGFromConfig(
                    config,
                    template.data,
                    this._version,
                    this._dateTime,
                    this._outputFolder,
                    this._debug,
                    this._console
                );
                break;
            case TemplateType.Markdown:
                file = await handlebars(template.data);
                break;
            default:
                throw `Not Implemented: ${template.type}`;
        }

        if (!(await this._validate(template.type, file))) {
            throw `Invalid ${template.type} template: '${template.in}'`;
        }

        if (template.minify !== false) {
            file = await this._minify(template.type, file);
        }

        if (template.out != null) {
            const outFile = path.join(outDir(this._outputFolder), template.out);
            await fsPromises.writeFile(outFile, file);

            (this._console ?? console).log(`${template.type} file generated: '${outFile}'`);
        }
        else {
            template.out = file;
        }
    }

    private async _validate(type: TemplateType, input: string): Promise<boolean> {
        switch (type) {
            case TemplateType.SVG:
            case TemplateType.DarkSVGVarient:
            case TemplateType.AnimationDisabledSVG:
            case TemplateType.DarkAnimationDisabledSVG:
                return SVG.Instance.validate(input)
            case TemplateType.Markdown:
                return await Markdown.Instance.validate(input);
            default:
                throw `Not Implemented: ${type}`;
        }
    }

    private async _minify(type: TemplateType, input: string): Promise<string> {
        switch (type) {
            case TemplateType.SVG:
            case TemplateType.DarkSVGVarient:
            case TemplateType.AnimationDisabledSVG:
            case TemplateType.DarkAnimationDisabledSVG:
                return await SVG.Instance.minify(input, this._disableAnimation, this._debug, this._console)
            case TemplateType.Markdown:
                return await Markdown.Instance.minify(input, this._console);
            default:
                throw `Not Implemented: ${type}`;
        }
    }

    private async _buildGithubPagesSite(templates: Template[]) {
        if (!fs.existsSync(distDir(this._outputFolder))) {
            await fsPromises.mkdir(distDir(this._outputFolder));
        }

        for (let template of templates) {
            if (template.out) {
                const preview = await generateWebPreview('/' + template.out, templates, this._outputFolder);
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

    static create(): Builder {
        return new Builder();
    }

    static withDefaults(): Builder {
        return new Builder().withTemplates(get_default_templates());
    }
}