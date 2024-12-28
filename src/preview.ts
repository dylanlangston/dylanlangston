import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as WebSocket from 'ws'; // Import WebSocket module
import { build, get_default_templates, cwd, outDir } from './library/Builder';
import { NullLogger } from './library/NullLogger';
import { generateWebPreview, getServer } from './library/GeneratePreview';
import packageJson from './package.json';

const default_port = 8080;
const outputDir = 'preview';

async function startServer(watch: boolean, port: number) {
    let server: http.Server | undefined;
    let wss: WebSocket.WebSocketServer | undefined;

    const rebuildAndStartServer = async () => {
        const default_templates = get_default_templates();
        try {
            const result = await build(default_templates, packageJson.version, new Date(process.env.BUILD_TIME ?? new Date()), outputDir, true, new NullLogger());
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
                server = getServer(port, default_templates, outputDir);

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

startServer(typeof process.env.dont_watch === 'undefined', default_port).catch(err => {
    console.error('Error starting server:', err);
    process.exit(1);
});
