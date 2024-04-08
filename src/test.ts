import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { build, default_templates, outDir } from './library/Builder';
import { Markdown } from './library/Markdown';
import { NullLogger } from './library/NullLogger';

const port = 8080;

async function startServer() {
    let server: http.Server | undefined;

    const rebuildAndStartServer = async () => {
        const result = await build(default_templates, new NullLogger());
        if (!result) {
            console.error("Build Failed ⚠️");
            return;
        }
        console.log(`Build Successful ✨`);

        try {
            if (server == undefined) {
                server = http.createServer(async (req, res) => {
                    if (req.url) {
                        const filename = req.url == "/" ? "/ReadMe.md" : req.url;
                        const matchingTemplates = default_templates.filter(t => '/' + t.out == filename);
                        if (matchingTemplates.length == 1) {
                            const filename = path.join(outDir, matchingTemplates[0].out!);
                            if (fs.existsSync(filename)) {
                                const file = fs.readFileSync(filename, 'utf8');
                                switch (matchingTemplates[0].type) {
                                    case "Markdown":
                                        res.writeHead(200, { 'Content-Type': 'text/html' });
                                        res.end(await await Markdown.Instance.toHtml(file))
                                        return;
                                    case "SVG":
                                        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
                                        res.end(file);
                                        return;
                                }
                            }
                        }
                    }
                    res.writeHead(404, 'File Not Found');
                    res.end();
                });
                server.listen(port, () => {
                    console.log(`Server is running on 'http://localhost:${port}/'`);
                });
            }
        } catch (error) {
            console.error('Error starting server:', error);
        }
    };

    await rebuildAndStartServer();

    let debounce: NodeJS.Timeout | undefined;
    fs.watch(path.resolve(__dirname, 'templates'), (eventType, filename) => {
        if (debounce) {
            clearTimeout(debounce);
        }
        debounce = setTimeout(async () => {
            if (filename && eventType === 'change') {
                console.log(`File ${filename} changed`);
                await rebuildAndStartServer();
            }

            debounce = undefined;
        }, 500);
    });
}

startServer().catch(err => {
    console.error('Error starting server:', err);
});
