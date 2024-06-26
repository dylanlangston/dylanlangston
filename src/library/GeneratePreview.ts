import * as fs from 'fs';
import * as path from 'path';
import { outDir } from './Builder';
import { Markdown } from './Markdown';
import { default as mime } from 'mime';
import { Template } from './Template';

export class Preview {
    constructor(
        public type: string,
        public content: string | Buffer
    ) {}
}

export async function generateWebPreview(requestedFile: string, templates: Template[]): Promise<Preview> {
    const matchingTemplates = templates.filter(t => '/' + t.out == requestedFile);
    const filename = path.join(outDir, requestedFile);
    if (fs.existsSync(filename)) {
        if (matchingTemplates.length == 1) {
            const file = fs.readFileSync(filename, 'utf8');
            switch (matchingTemplates[0].type) {
                case "Markdown":
                    return new Preview('text/html', `
                    <html>
                        <head>
                            <title>${requestedFile}</title>
                            <style>
                                ${fs.readFileSync('node_modules/github-markdown-css/github-markdown.css', 'utf8')}
                            </style>
                            <script>
                                const socket = new WebSocket((window.location.protocol == 'https:' ? 'wss://' : 'ws://') + window.location.hostname + ':' + window.location.port);
                                socket.onmessage = (event) => event.data === 'reload' ? window.location.reload() : null;
                            </script>
                        </head>
                        <body class="markdown-body">
                            ${await Markdown.Instance.toHtml(file)}
                        </body>
                    </html>
                    `);
                case "DarkSVGVarient":
                case "SVG":
                    return new Preview('image/svg+xml', file);
                default:
                    throw "Not Implemented!";
            }
        }
        const file = fs.readFileSync(filename);
        const contentType = mime.getType(filename) || 'application/octet-stream';
        return new Preview(contentType, file);
    }
    throw "File not found: " + filename;
}