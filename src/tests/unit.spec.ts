import * as fs from 'fs';
import { TemplateType, Template } from '../library/Template';
import { build } from '../library/Builder';
import { Markdown } from '../library/Markdown';
import { SVG } from '../library/SVG';

jest.mock('handlebars', () => ({
    compile: jest.fn().mockReturnValue(() => 'compiledTemplate')
}));

jest.mock('fs', () => {
    const actualFS = jest.requireActual('fs');
    return {
        ...actualFS,
        promises: {
            readFile: jest.fn(),
        },
        readFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        existsSync: jest.fn(),
        writeFileSync: jest.fn()
    }
});

jest.mock('path', () => {
    const actualPath = jest.requireActual('path');
    return {
        ...actualPath,
        resolve: jest.fn(),
        dirname: jest.fn().mockReturnValue('/mocked/dirname')
    }
});

jest.mock('../library/Markdown', () => {
    class MockedMarkdown {
        public static Instance = new MockedMarkdown();

        minify = jest.fn().mockResolvedValue('<p>Mocked HTML</p>');
        validate = jest.fn().mockResolvedValue(true);
    };

    return {
        Markdown: MockedMarkdown
    };
});

jest.mock('../library/SVG', () => {
    class MockedSVG  {
        public static Instance = new MockedSVG();

        generateSVGFromConfig = jest.fn().mockResolvedValue('<svg>Mocked SVG</svg>');
        minify = jest.fn().mockResolvedValue('<svg>Mocked SVG</svg>');
        validate = jest.fn().mockResolvedValue(true);
    };

    return {
        SVG: MockedSVG,
    };
});

describe('build function', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should build successfully', async () => {
        const templates: Template[] = [
            new Template('template1.svg', 'output1.svg', TemplateType.SVG, {}),
            new Template('template2.md', 'output2.html', TemplateType.Markdown, {})
        ];

        await jest.runAllTimersAsync();
        await build(templates);

        expect(fs.writeFileSync).toHaveBeenCalledWith(expect.any(String), expect.any(String));
        expect(Markdown.Instance.minify).toHaveBeenCalledTimes(1);
        expect(SVG.Instance.generateSVGFromConfig).toHaveBeenCalledTimes(1);
    });

});
