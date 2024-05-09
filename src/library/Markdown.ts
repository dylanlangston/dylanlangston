const remark = import('remark');
const remarkHtml = import('remark-html');
const remarkPresetLintConsistent = import('remark-preset-lint-consistent');
const remarkPresetLintRecommended = import('remark-preset-lint-recommended');

export class Markdown {
    public static Instance = new Markdown();

    // Function to validate Markdown file
    async validate(markdownString: string, con?: typeof console): Promise<boolean> {
        const result = await (await remark).remark()
            .use((await remarkPresetLintConsistent).default)
            .use((await remarkPresetLintRecommended).default)
            .process(markdownString);

        if (result.messages.length === 0) {
            return true;
        } else {
            (con ?? console).error('Invalid Markdown:', result.messages);
            return false;
        }
    }

    // Function to minify Markdown file
    async minify(markdownString: string, con?: typeof console): Promise<string> {
        try {
            const minifiedMarkdown = await (await remark).remark().process(markdownString);
            return minifiedMarkdown.toString();
        } catch (error) {
            (con ?? console).error('Error while minifying Markdown:', error);
            return markdownString;
        }
    }

    // Function to convert Markdown to HTML
    async toHtml(markdownString: string, con?: typeof console): Promise<string> {
        try {
            const htmlOutput = await (await remark).remark()
                .use((await remarkHtml).default, {
                    sanitize: false,
                })
                .process(markdownString);
            return htmlOutput.toString();
        } catch (error) {
            (con ?? console).error('Error while converting Markdown to HTML:', error);
            return markdownString;
        }
    }
    
}
