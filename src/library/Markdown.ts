export class Markdown {
    public static Instance = new Markdown();

    private remark = import('remark');
    private remarkPresetLintConsistent = import('remark-preset-lint-consistent');
    private remarkPresetLintRecommended = import('remark-preset-lint-recommended');

    // Function to validate Markdown file
    async validate(markdownString: string): Promise<boolean> {
        const result = await (await this.remark).remark()
            .use(<any>(await this.remarkPresetLintConsistent).default)
            .use(<any>(await this.remarkPresetLintRecommended).default)
            .process(markdownString);

        if (result.messages.length === 0) {
            return true;
        } else {
            console.error('Invalid Markdown:', result.messages);
            return false;
        }
    }

    // Function to minify Markdown file
    async minify(markdownString: string): Promise<string> {
        try {
            const minifiedMarkdown = await (await this.remark).remark().process(markdownString);
            return minifiedMarkdown.toString();
        } catch (error) {
            console.error('Error while minifying Markdown:', error);
            return markdownString;
        }
    }
}
