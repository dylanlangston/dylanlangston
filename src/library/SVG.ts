import * as SVGO from 'svgo';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import postcss from 'postcss';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';
import * as SVGjs from '@svgdotjs/svg.js';
import { build } from './Builder';
import { Template, TemplateType } from './Template';
import opentype from 'opentype.js';
import { readFile } from 'fs/promises';

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

    async processCSS(svg: string): Promise<string> {
        const xmlDoc = new DOMParser().parseFromString(svg, 'image/svg+xml');

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
            new DOMParser().parseFromString(svgString, 'image/svg+xml');
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
                                removeDoctype: undefined,
                                removeXMLProcInst: undefined,
                                removeComments: undefined,
                                removeMetadata: undefined,
                                removeEditorsNSData: undefined,
                                cleanupAttrs: undefined,
                                mergeStyles: undefined,
                                inlineStyles: {
                                    onlyMatchedOnce: false,
                                    removeMatchedSelectors: true,
                                    useMqs: ['prefers-color-scheme', 'prefers-reduced-motion'],
                                },
                                minifyStyles: undefined,
                                cleanupIds: undefined,
                                removeUselessDefs: undefined,
                                cleanupNumericValues: undefined,
                                convertColors: undefined,
                                removeUnknownsAndDefaults: {
                                    keepRoleAttr: true
                                },
                                removeNonInheritableGroupAttrs: undefined,
                                removeUselessStrokeAndFill: undefined,
                                removeViewBox: false,
                                cleanupEnableBackground: undefined,
                                removeHiddenElems: undefined,
                                removeEmptyText: undefined,
                                convertShapeToPath: undefined,
                                convertEllipseToCircle: undefined,
                                moveElemsAttrsToGroup: undefined,
                                moveGroupAttrsToElems: undefined,
                                collapseGroups: undefined,
                                convertPathData: undefined,
                                convertTransform: undefined,
                                removeEmptyAttrs: undefined,
                                removeEmptyContainers: undefined,
                                mergePaths: undefined,
                                removeUnusedNS: undefined,
                                sortAttrs: undefined,
                                sortDefsChildren: undefined,
                                removeTitle: false,
                                removeDesc: undefined,
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

    async generateSVGPathFromText(
        fontPath: string,
        text: string,
        fontSize: number,
        x: number,
        y: number
    ): Promise<string> {
        let font;
        if (fontPath.startsWith('http')) {
            const buffer = await fetch(fontPath).then(res => res.arrayBuffer());
            font = opentype.parse(buffer);
        }
        else {
            const file = await readFile(fontPath);
            font = opentype.parse(file.buffer);
        }
        // const font = await opentype.load(fontPath)
        const path = font.getPath(text, x, y, fontSize);
        return path.toPathData(2);
    }

    async generateSVGFromConfig(config: any, data: any, buildVersion: string, buildTime: Date, outputFolder: string, debug: boolean, con?: typeof console): Promise<string> {
        const window = (await this.svgdom).createSVGWindow()
        const document = window.document

        SVGjs.registerWindow(window, document);

        class TitleElement extends SVGjs.Container {
            constructor(title: string) {
                const titleNode: SVGGraphicsElement = SVGjs.create('title');
                titleNode.textContent = title;
                super(titleNode);
            }
        }

        class DescriptionElement extends SVGjs.Container {
            constructor(desc: string) {
                const descNode: SVGGraphicsElement = SVGjs.create('desc');
                descNode.textContent = desc;
                super(descNode)
            }
        }

        // Add a method to create a rounded rect
        SVGjs.extend(SVGjs.Container, {
            title: function (title: string) {
                return (<any>this).put(new TitleElement(title));
            },
            desc: function (desc: string) {
                return (<any>this).put(new DescriptionElement(desc));
            },
            raw: function (object: any) {
                (<SVGjs.Container>this).put(<SVGjs.Element>SVGjs.SVG(object));
            },
            import: async function (file: string) {
                const output = await build([new Template(file, null, TemplateType.SVG, data, false)], buildVersion, buildTime, outputFolder, debug, con);
                const xmlDoc = new DOMParser().parseFromString(output[0].out!, 'image/svg+xml');
                const svgElement = xmlDoc.getElementsByTagName('svg')[0];

                const xmlserializer = new XMLSerializer();
                Array.from(svgElement.childNodes)
                    .map(c => xmlserializer.serializeToString(c))
                    .forEach(c => {
                        (<SVGjs.Container>this).put(<SVGjs.Element>SVGjs.SVG(c));
                    });
            }
        });

        SVGjs.extend(SVGjs.Defs, {
            addDef: function (object: any) {
                (<SVGjs.Defs>this).add(<SVGjs.Element>SVGjs.SVG(object));
            }
        })

        SVGjs.extend(SVGjs.ForeignObject, {
            addObject: function (object: any) {
                (<SVGjs.ForeignObject>this).add(object);
            }
        })

        const draw = SVGjs.SVG();

        async function executeFunction(parent: any, funcName: string, params: any) {
            const func: Function = parent[funcName];
            if (typeof func === 'function') {
                const paramKeys = typeof params === 'object' ? Object.keys(params) : [];

                if (paramKeys.findIndex(p => p == funcName) != -1) {
                    const parameters = params[funcName];
                    let result;
                    if (func.constructor.name === 'AsyncFunction') {
                        result = await func.apply(parent, Array.isArray(parameters) ? parameters : [parameters]);
                    } else {
                        result = func.apply(parent, Array.isArray(parameters) ? parameters : [parameters]);
                    }

                    for (let chainedFunctionName of paramKeys.filter(p => p != funcName)) {
                        await executeFunction(result, chainedFunctionName, params[chainedFunctionName]);
                    }
                }
                else {
                    if (func.constructor.name === 'AsyncFunction') {
                        await func.apply(parent, Array.isArray(params) ? params : [params]);
                    } else {
                        func.apply(parent, Array.isArray(params) ? params : [params]);
                    }
                }
            } else {
                throw new Error(`Function not found ${funcName}`);
            }
        }

        async function parseConfig(draw: SVGjs.Svg, config: any) {
            for (const svgDraw of Object.keys(config)) {
                if (typeof config[svgDraw] === 'object') {
                    for (const funcName in config[svgDraw]) {
                        if (config[svgDraw].hasOwnProperty(funcName)) {
                            const params = config[svgDraw][funcName];
                            await executeFunction(draw, funcName, params);
                        }
                    }
                }
                else {
                    draw.attr(svgDraw, config[svgDraw]);
                }
            }
        }
        await parseConfig(draw, config);

        return draw.svg();
    }

}
