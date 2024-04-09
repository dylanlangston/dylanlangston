import * as SVGO from 'svgo';
import { DOMParser } from '@xmldom/xmldom';
import postcss from 'postcss';
import postcssrc from 'postcss-load-config';
import * as cheerio from 'cheerio';
import { SVG as SVGjs, registerWindow } from '@svgdotjs/svg.js';

export class SVG {
    public static Instance = new SVG();

    private svgdom = import('svgdom');

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

        $('svg').append(`<style>${result.css}</style>`)

        return $.xml();
    }

    // Function to validate SVG file
    validate(svgString: string, con?: typeof console): boolean {
        try {
            this.parser.parseFromString(svgString, 'image/svg+xml');
            return true;
        } catch (error) {
            (con ?? console).error('Invalid SVG:', error);
            return false;
        }
    }

    // Function to minify SVG file
    async minify(svgString: string, con?: typeof console): Promise<string> {
        try {
            const result = SVGO.optimize(await this.processCSS(svgString));
            return result.data;
        } catch (error) {
            (con ?? console).error('Error while minifying SVG:', error);
            return svgString;
        }
    }
    
    async generateSVGFromConfig(config: any): Promise<string> {
        const window = (await this.svgdom).createSVGWindow()
        const document = window.document

        registerWindow(window, document)

        const draw = SVGjs()
            .attr("preserveAspectRatio", "xMinYMin none")
            .attr("viewBox", "0 0 1600 800")
            .size(1600, 900);


        function executeFunction(parent: any, funcName: string, params: any) {
            const func: Function = parent[funcName];
            if (typeof func === 'function') {
                const paramKeys = typeof params === 'object' ? Object.keys(params) : [];

                if (paramKeys.findIndex(p => p == funcName) != -1) {
                    const parameters = params[funcName];
                    const result = func.apply(parent, Array.isArray(parameters) ? parameters : [ parameters ]);

                    for (let chainedFunctionName of paramKeys.filter(p => p != funcName)) {
                        executeFunction(result, chainedFunctionName, params[chainedFunctionName]);
                    }
                }
                else {
                    func.apply(parent, Array.isArray(params) ? params : [ params ]);
                }
            }
        }

        for (const svgDraw of Object.keys(config)) {
            for (const funcName in config[svgDraw]) {
                if (config[svgDraw].hasOwnProperty(funcName)) {
                    const params = config[svgDraw][funcName];
                    executeFunction(draw, funcName, params);
                }
            }
        }

        return draw.svg();
    }

}