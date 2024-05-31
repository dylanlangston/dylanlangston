import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as WebSocket from 'ws'; // Import WebSocket module
import { build, get_default_templates, cwd, outDir } from './library/Builder';
import { Markdown } from './library/Markdown';
import { NullLogger } from './library/NullLogger';
import { default as mime } from 'mime';

const port = 8080;

async function startServer(watch: boolean) {
    let server: http.Server | undefined;
    let wss: WebSocket.WebSocketServer | undefined;

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
                if (client.readyState === WebSocket.WebSocket.OPEN) {
                    client.send('reload');
                }
            });
        }

        try {
            if (server == undefined) {
                server = http.createServer(async (req, res) => {
                    if (req.url) {
                        const requestedFile = req.url == "/" ? "/ReadMe.md" : new URL(req.url, `http://localhost:${port}/`).pathname;
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
                                    case "DarkSVGVarient":
                                    case "SVG":
                                        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
                                        res.end(file);
                                        return;
                                    default:
                                        throw "Not Implemented!";
                                }
                            }
                            const file = fs.readFileSync(filename);
                            const contentType = mime.getType(filename) || 'application/octet-stream';
                            res.writeHead(200, { 'Content-Type': contentType });
                            res.end(file);
                            return;
                        }
                    }
                    res.writeHead(404, 'File Not Found');
                    res.end();
                });

                wss = new WebSocket.WebSocketServer({ server });
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

    if (!watch) return;

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
    fs.watch(path.resolve(cwd, 'build-config.json'), watcher);
    watchDirectoriesRecusively(path.resolve(cwd, 'templates'), watcher);
}

const watchDirectoriesRecusively = (dirPath: string, innerWatcher: fs.WatchListener<string>): void => {
    const watcher: fs.WatchListener<string> = (eventType, filename) => {
        if (filename) {
            innerWatcher(eventType, filename);

            if (eventType === 'rename') {
                const filePath: string = path.join(dirPath, filename.toString());
                fs.stat(filePath, (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
                    if (!err && stats.isDirectory()) {
                        watchDirectoriesRecusively(filePath, innerWatcher);
                    }
                });
            }
        }
    }
    fs.watch(dirPath, watcher);

    fs.readdir(dirPath, (err: NodeJS.ErrnoException | null, files: string[]) => {
        if (err) {
            console.error(`Error reading directory ${dirPath}:`, err);
            return;
        }

        files.forEach(file => {
            const filePath: string = path.join(dirPath, file);
            fs.stat(filePath, (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
                if (err) {
                    console.error(`Error stating file ${filePath}:`, err);
                    return;
                }

                if (stats.isDirectory()) {
                    watchDirectoriesRecusively(filePath, innerWatcher);
                }
            });
        });
    });
};

startServer(typeof process.env.dont_watch === 'undefined').catch(err => {
    console.error('Error starting server:', err);
    process.exit(1);
});
