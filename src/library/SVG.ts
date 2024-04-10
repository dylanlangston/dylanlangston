import * as SVGO from 'svgo';
import { DOMParser } from '@xmldom/xmldom';
import postcss from 'postcss';
import postcssrc from 'postcss-load-config';
import * as cheerio from 'cheerio';
import { SVG as SVGjs, registerWindow, extend, Defs, ForeignObject, Svg } from '@svgdotjs/svg.js';

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
    async minify(svgString: string, debug: boolean, con?: typeof console): Promise<string> {
        try {
            const result = SVGO.optimize(debug ? svgString : await this.processCSS(svgString), {
                multipass: true,
                js2svg: {
                    indent: 2,
                    pretty: debug,
                },
                plugins: [
                    {
                        name: "preset-default",
                        params: {
                            overrides: {
                                removeViewBox: false,
                                removeEmptyContainers: false
                            }
                        }
                    },
                    {
                        name: "removeEditorsNSData",
                        params: {
                            additionalNamespaces: ['http://svgjs.dev/svgjs']
                        }
                    },
                ]
            });
            return result.data;
        } catch (error) {
            (con ?? console).error('Error while minifying SVG:', error);
            return svgString;
        }
    }
    
    async generateSVGFromConfig(config: any): Promise<string> {
        const window = (await this.svgdom).createSVGWindow()
        const document = window.document

        registerWindow(window, document);

        extend(Defs, {
            addDef: function(object: any) {
                (<any>this).add(SVGjs(object));
            }
        })

        extend(ForeignObject, {
            addObject: function(object: any) {
                (<any>this).add(object);
            }
        })

        const draw = SVGjs();

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

        function parseConfig(draw: Svg, config: any) {
            for (const svgDraw of Object.keys(config)) {
                if (typeof config[svgDraw] === 'object') {
                    for (const funcName in config[svgDraw]) {
                        if (config[svgDraw].hasOwnProperty(funcName)) {
                            const params = config[svgDraw][funcName];
                            executeFunction(draw, funcName, params);
                        }
                    }
                }
                else {
                    draw.attr(svgDraw, config[svgDraw]);
                }
            }
        }
        parseConfig(draw, config);

        return draw.svg();
    }

}