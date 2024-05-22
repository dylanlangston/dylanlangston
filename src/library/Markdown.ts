import { remark } from 'remark';
import remarkHtml from 'remark-html';
import remarkPresetLintConsistent from 'remark-preset-lint-consistent';
import remarkPresetLintRecommended from 'remark-preset-lint-recommended';

export class Markdown {
    public static Instance = new Markdown();

    // Function to validate Markdown file
    async validate(markdownString: string, con?: typeof console): Promise<boolean> {
        const result = await remark()
            .use(remarkPresetLintConsistent)
            .use(remarkPresetLintRecommended)
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
            const minifiedMarkdown = await remark().process(markdownString);
            return minifiedMarkdown.toString();
        } catch (error) {
            (con ?? console).error('Error while minifying Markdown:', error);
            return markdownString;
        }
    }

    // Function to convert Markdown to HTML
    async toHtml(markdownString: string, con?: typeof console): Promise<string> {
        try {
            const htmlOutput = await remark()
                .use(remarkHtml, {
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
