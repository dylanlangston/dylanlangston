import * as fs from 'fs';
import { TemplateType, Template } from '../library/Template';
import { Builder } from '../library/Builder';
import { Markdown } from '../library/Markdown';
import { SVG } from '../library/SVG';
import { jest } from '@jest/globals'

jest.mock('octokit', () => ({

}));

jest.mock('mime', () => ({

}));

jest.mock('handlebars', () => ({
    compile: jest.fn().mockReturnValue(() => 'compiledTemplate'),
    registerHelper: jest.fn()
}));

jest.mock('fs', () => {
    const actualFS: any = jest.requireActual('fs');
    return {
        ...actualFS,
        promises: {
            readFile: jest.fn(),
            mkdir: jest.fn(),
            writeFile: jest.fn()
        },
        readFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        existsSync: jest.fn().mockReturnValue(true),
        writeFileSync: jest.fn()
    }
});

jest.mock('path', () => {
    const actualPath: any = jest.requireActual('path');
    return {
        ...actualPath,
        resolve: jest.fn(),
        dirname: jest.fn().mockReturnValue('/mocked/dirname')
    }
});

jest.mock('../library/Markdown', () => {
    class MockedMarkdown {
        public static Instance = new MockedMarkdown();

        toHtml = jest.fn().mockReturnValue('<p>Mocked HTML</p>');
        minify = jest.fn().mockReturnValue('<p>Mocked HTML</p>');
        validate = jest.fn().mockReturnValue(true);
    };

    return {
        Markdown: MockedMarkdown
    };
});

jest.mock('../library/SVG', () => {
    class MockedSVG  {
        public static Instance = new MockedSVG();

        generateSVGFromConfig = jest.fn().mockReturnValue('<svg>Mocked SVG</svg>');
        minify = jest.fn().mockReturnValue('<svg>Mocked SVG</svg>');
        validate = jest.fn().mockReturnValue(true);
    };

    return {
        SVG: MockedSVG,
    };
});

describe('Builder', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Builder.create()', () => {
        it('should create a new builder instance', () => {
            const builder = Builder.create();
            expect(builder).toBeInstanceOf(Builder);
        });
    });

    describe('fluent API', () => {
        it('should build successfully with method chaining', async () => {
            const templates: Template[] = [
                new Template('template1.svg', 'output1.svg', TemplateType.SVG, {}),
                new Template('template2.md', 'output2.html', TemplateType.Markdown, {})
            ];

            await jest.runAllTimersAsync();
            
            const result = await Builder.create()
                .withTemplates(templates)
                .withVersion('1.0.0')
                .withDateTime(new Date())
                .build();

            expect(result).toEqual(templates);
            expect(fs.promises.writeFile).toHaveBeenCalledWith(expect.any(String), expect.any(String));
            expect(Markdown.Instance.minify).toHaveBeenCalledTimes(1);
            expect(SVG.Instance.generateSVGFromConfig).toHaveBeenCalledTimes(1);
        });

        it('should support withOutputFolder()', async () => {
            const templates: Template[] = [
                new Template('template1.svg', 'output1.svg', TemplateType.SVG, {})
            ];

            await Builder.create()
                .withTemplates(templates)
                .withVersion('1.0.0')
                .withDateTime(new Date())
                .withOutputFolder('custom-output')
                .build();

            const calls = (SVG.Instance.generateSVGFromConfig as jest.Mock).mock.calls[0];
            expect(calls[4]).toBe('custom-output'); // outputFolder
        });

        it('should support withDebug()', async () => {
            const templates: Template[] = [
                new Template('template1.svg', 'output1.svg', TemplateType.SVG, {})
            ];

            await Builder.create()
                .withTemplates(templates)
                .withVersion('1.0.0')
                .withDateTime(new Date())
                .withDebug(true)
                .build();

            const calls = (SVG.Instance.generateSVGFromConfig as jest.Mock).mock.calls[0];
            expect(calls[5]).toBe(true); // debug = true
        });

        it('should support withConsole()', async () => {
            const mockConsole = {
                log: jest.fn(),
                error: jest.fn(),
                warn: jest.fn(),
                info: jest.fn()
            } as any;

            const templates: Template[] = [
                new Template('template1.svg', 'output1.svg', TemplateType.SVG, {})
            ];

            await Builder.create()
                .withTemplates(templates)
                .withVersion('1.0.0')
                .withDateTime(new Date())
                .withConsole(mockConsole)
                .build();

            expect(mockConsole.log).toHaveBeenCalled();
        });

        it('should support skipGithubPages()', async () => {
            const templates: Template[] = [
                new Template('template1.svg', 'output1.svg', TemplateType.SVG, {})
            ];

            // With skipGithubPages, the build should not create dist folder files
            await Builder.create()
                .withTemplates(templates)
                .withVersion('1.0.0')
                .withDateTime(new Date())
                .skipGithubPages()
                .build();

            // Just verify it completes without error
            expect(SVG.Instance.generateSVGFromConfig).toHaveBeenCalledTimes(1);
        });
    });

});
