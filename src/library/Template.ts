export enum TemplateType {
    SVG = "SVG",
    Markdown = "Markdown"
  }

export class Template {
    in: string;
    out: string | null;
    data: any;
    type: TemplateType;

    constructor(templateFileNameIn: string, generatedFileNameOut: string | null, type: TemplateType, data: any) {
        this.in = templateFileNameIn;
        this.out = generatedFileNameOut;
        this.data = data;
        this.type = type;
    }
}