export class Markdown {
    public static Instance = new Markdown();

    private remark = import('remark');
    private remarkPresetLintConsistent = import('remark-preset-lint-consistent');
    private remarkPresetLintRecommended = import('remark-preset-lint-recommended');
    private remarkHtml = import('remark-html');

    // Function to validate Markdown file
    async validate(markdownString: string, con?: typeof console): Promise<boolean> {
        const result = await (await this.remark).remark()
            .use(<any>(await this.remarkPresetLintConsistent).default)
            .use(<any>(await this.remarkPresetLintRecommended).default)
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
            const minifiedMarkdown = await (await this.remark).remark().process(markdownString);
            return minifiedMarkdown.toString();
        } catch (error) {
            (con ?? console).error('Error while minifying Markdown:', error);
            return markdownString;
        }
    }

    // Function to convert Markdown to HTML
    async toHtml(markdownString: string, con?: typeof console): Promise<string> {
        try {
            const htmlOutput = await (await this.remark).remark()
                .use(await (await this.remarkHtml).default, {
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
