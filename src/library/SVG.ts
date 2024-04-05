import * as fs from 'fs';
import * as SVGO from 'svgo';
import { DOMParser, XMLSerializer } from 'xmldom';
import postcss from 'postcss';
import postcssrc from 'postcss-load-config';
import * as cheerio from 'cheerio';

export class SVG {
    public static Instance = new SVG();

    private parser = new DOMParser();

    async processCSS(svg: string): Promise<string> {
        const $ = cheerio.load(svg, { xmlMode: true });

        const cssContent: string[] = [];
        $('style').each((_: number, element: cheerio.Element) => {
            cssContent.push($(element).text());
            $(element).remove();
        });

        const combinedCssContent = cssContent.join('\n');

        const { plugins, options } = await postcssrc();
        const result = await postcss(plugins).process(combinedCssContent, options);

        $('foreignObject').append(`<style>${result.css}</style>`)

        return $.xml();
    }

    // Function to validate SVG file
    validate(svgString: string): boolean {
        try {
            this.parser.parseFromString(svgString, 'image/svg+xml');
            return true;
        } catch (error) {
            console.error('Invalid SVG:', error);
            return false;
        }
    }

    // Function to minify SVG file
    async minify(svgString: string): Promise<string> {
        try {
            const result = SVGO.optimize(await this.processCSS(svgString));
            return result.data;
        } catch (error) {
            console.error('Error while minifying SVG:', error);
            return svgString;
        }
    }
}