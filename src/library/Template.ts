export enum TemplateType {
    SVG = "SVG",
    Markdown = "Markdown",
    DarkSVGVarient = "DarkSVGVarient"
  }

export type SVGTemplate = {
    in: string;
    out: string | null;
    minify: boolean;
    data: any | {
        files?: string[]
    };
}

export type MarkdownTemplate = {
    in: string;
    out: string | null;
    minify: boolean;
    data: any;
}

export type DarkSVGVarient = {
    in: string;
    out: string | null;
}

export class Template implements SVGTemplate, MarkdownTemplate, DarkSVGVarient {
    in: string;
    out: string | null;
    data: any | {
        files?: string[]
    };
    type: TemplateType;
    minify: boolean = true;

    constructor(templateFileNameIn: string, generatedFileNameOut: string | null, type: TemplateType, data: any, minify: boolean = true) {
        this.in = templateFileNameIn;
        this.out = generatedFileNameOut;
        this.data = data;
        this.type = type;
        this.minify = minify;
    }
}
