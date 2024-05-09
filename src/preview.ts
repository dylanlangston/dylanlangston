import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as WebSocket from 'ws'; // Import WebSocket module
import { build, get_default_templates, outDir } from './library/Builder';
import { Markdown } from './library/Markdown';
import { NullLogger } from './library/NullLogger';

const port = 8080;

async function startServer() {
    let server: http.Server | undefined;
    let wss: WebSocket.Server | undefined;

    const mime = import('mime');

    const rebuildAndStartServer = async () => {
        const default_templates = get_default_templates();
        try {
            const result = await build(default_templates, true, new NullLogger());
        }
        catch (err) {
            console.error("Build Failed ⚠️\n", err);
            return;
        }

        console.clear();
        console.log(`Build Successful ✨`);

        if (wss) {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send('reload');
                }
            });
        }

        try {
            if (server == undefined) {
                server = http.createServer(async (req, res) => {
                    if (req.url) {
                        const requestedFile = req.url == "/" ? "/ReadMe.md" : req.url;
                        const matchingTemplates = default_templates.filter(t => '/' + t.out == requestedFile);
                        const filename = path.join(outDir, requestedFile);
                        if (fs.existsSync(filename)) {
                            if (matchingTemplates.length == 1) {
                                const file = fs.readFileSync(filename, 'utf8');
                                switch (matchingTemplates[0].type) {
                                    case "Markdown":
                                        res.writeHead(200, { 'Content-Type': 'text/html' });
                                        res.end(`
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
                                        return;
                                    case "SVG":
                                        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
                                        res.end(file);
                                        return;
                                    default:
                                        throw "Not Implemented!";
                                }
                            }
                            const file = fs.readFileSync(filename);
                            const contentType = (await mime).default.getType(filename) || 'application/octet-stream';
                            res.writeHead(200, { 'Content-Type': contentType });
                            res.end(file);
                            return;
                        }
                    }
                    res.writeHead(404, 'File Not Found');
                    res.end();
                });

                wss = new WebSocket.Server({ server });
                server.listen(port, () => {
                    console.log(`Server is running on 'http://localhost:${port}/'\nPress any key to exit...`);
                });
            }
        } catch (error) {
            console.error('Error starting server:', error);
        }
    };

    await rebuildAndStartServer();

    if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {
            console.log('Exiting ❌');
            process.exit();
        });
    }

    let debounce: NodeJS.Timeout | undefined;
    const watcher: fs.WatchListener<string> = (eventType, filename) => {
        if (debounce) {
            clearTimeout(debounce);
        }
        debounce = setTimeout(async () => {
            if (filename && eventType === 'change') {
                console.log(`File ${filename} changed`);
                try {
                    await rebuildAndStartServer();
                } catch (err) {
                    console.error(err);
                }
            }

            debounce = undefined;
        }, 500);
    };
    fs.watch(path.resolve(__dirname, 'build-config.json'), watcher);
    fs.watch(path.resolve(__dirname, 'templates'), watcher);
}

startServer().catch(err => {
    console.error('Error starting server:', err);
});
