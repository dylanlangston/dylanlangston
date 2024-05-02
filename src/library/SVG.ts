import * as SVGO from 'svgo';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import postcss from 'postcss';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';
import { SVG as SVGjs, registerWindow, extend, Defs, ForeignObject, Svg } from '@svgdotjs/svg.js';
const cssNanoPreset = cssnano({
    preset: [
        'default', {
            autoprefixer: true,
            cssDeclarationSorter: true,
            calc: true,
            colormin: true,
            convertValues: true,
            discardComments: true,
            discardDuplicates: true,
            discardEmpty: true,
            discardOverridden: true,
            discardUnused: true,
            mergeIdents: true,
            mergeLonghand: true,
            mergeRules: true,
            minifyFontValues: true,
            minifyGradients: true,
            minifyParams: true,
            minifySelectors: true,
            normalizeCharset: true,
            normalizeDisplayValues: true,
            normalizePositions: true,
            normalizeRepeatStyle: true,
            normalizeString: true,
            normalizeTimingFunctions: true,
            normalizeUnicode: true,
            normalizeUrl: true,
            normalizeWhitespace: true,
            orderedValues: true,
            reduceIdents: true,
            reduceInitial: true,
            reduceTransforms: true,
            svgo: true,
            uniqueSelectors: true,
            zindex: true
        }
    ]
});

export class SVG {
    public static Instance = new SVG();

    private svgdom = import('svgdom');

    private parser = new DOMParser();

    async processCSS(svg: string): Promise<string> {
        const xmlDoc = this.parser.parseFromString(svg, 'image/svg+xml');

        const cssContent: string[] = [];
        const styleElements = Array.from(xmlDoc.getElementsByTagName('style'));
        for (const styleElement of styleElements) {
            cssContent.push(styleElement.textContent || '');
            styleElement.parentNode?.removeChild(styleElement);
        }

        const combinedCssContent = cssContent.join('\n');

        const result = await postcss([autoprefixer, cssNanoPreset]).process(combinedCssContent, {
            from: undefined
        })

        const styleElement = xmlDoc.createElement('style');
        styleElement.textContent = result.css;
        const svgElement = xmlDoc.getElementsByTagName('svg')[0]
        svgElement.appendChild(styleElement);

        const updatedSVG = new XMLSerializer().serializeToString(xmlDoc);

        return updatedSVG;
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
            const result = SVGO.optimize(await this.processCSS(svgString), {
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
                                removeEmptyContainers: false,
                                inlineStyles: {
                                    onlyMatchedOnce: false,
                                    removeMatchedSelectors: true,
                                    useMqs: ['prefers-color-scheme', 'prefers-reduced-motion'],
                                }
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
            addDef: function (object: any) {
                (<any>this).add(SVGjs(object));
            }
        })

        extend(ForeignObject, {
            addObject: function (object: any) {
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
                    const result = func.apply(parent, Array.isArray(parameters) ? parameters : [parameters]);

                    for (let chainedFunctionName of paramKeys.filter(p => p != funcName)) {
                        executeFunction(result, chainedFunctionName, params[chainedFunctionName]);
                    }
                }
                else {
                    func.apply(parent, Array.isArray(params) ? params : [params]);
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