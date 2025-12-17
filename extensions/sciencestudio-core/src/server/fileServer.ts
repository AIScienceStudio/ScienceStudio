import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Simple HTTP file server for serving documents to OnlyOffice
 * Runs on the host machine so OnlyOffice (in Docker) can access via host.docker.internal
 */
export class FileServer {
    private server: http.Server | null = null;
    private documentsFolder: string = '';
    private port: number = 8081;

    private static instance: FileServer | null = null;

    public static getInstance(): FileServer {
        if (!FileServer.instance) {
            FileServer.instance = new FileServer();
        }
        return FileServer.instance;
    }

    /**
     * Start the file server
     */
    async start(documentsFolder: string, port: number = 8081): Promise<void> {
        this.documentsFolder = documentsFolder;
        this.port = port;

        // Ensure documents folder exists
        if (!fs.existsSync(documentsFolder)) {
            fs.mkdirSync(documentsFolder, { recursive: true });
        }

        // If server already running, stop it first
        if (this.server) {
            await this.stop();
        }

        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });

            this.server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${this.port} already in use, trying next port...`);
                    this.port++;
                    this.server?.listen(this.port, '0.0.0.0');
                } else {
                    reject(err);
                }
            });

            this.server.listen(this.port, '0.0.0.0', () => {
                console.log(`ScienceStudio file server running on http://0.0.0.0:${this.port}`);
                resolve();
            });
        });
    }

    /**
     * Stop the file server
     */
    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.server = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Handle HTTP requests
     */
    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        // Set CORS headers for OnlyOffice
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // Handle callback from OnlyOffice
        if (req.url?.startsWith('/callback') && req.method === 'POST') {
            this.handleCallback(req, res);
            return;
        }

        // Serve files
        if (req.method === 'GET') {
            this.serveFile(req, res);
            return;
        }

        res.writeHead(405);
        res.end('Method not allowed');
    }

    /**
     * Serve a file from the documents folder
     */
    private serveFile(req: http.IncomingMessage, res: http.ServerResponse): void {
        const urlPath = decodeURIComponent(req.url || '/');
        const filePath = path.join(this.documentsFolder, urlPath);

        // Security: prevent directory traversal
        if (!filePath.startsWith(this.documentsFolder)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                console.log(`File not found: ${filePath}`);
                res.writeHead(404);
                res.end('Not found');
                return;
            }

            // Get content type
            const ext = path.extname(filePath).toLowerCase();
            const contentTypes: Record<string, string> = {
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.doc': 'application/msword',
                '.pdf': 'application/pdf',
                '.txt': 'text/plain',
                '.html': 'text/html',
                '.json': 'application/json'
            };

            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
            res.setHeader('Content-Length', stats.size);

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
            stream.on('error', () => {
                res.writeHead(500);
                res.end('Server error');
            });
        });
    }

    /**
     * Handle OnlyOffice save callback
     */
    private handleCallback(req: http.IncomingMessage, res: http.ServerResponse): void {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('OnlyOffice callback:', data);

                // Status codes: https://api.onlyoffice.com/editors/callback
                // 0 - no document with the key identifier could be found
                // 1 - document is being edited
                // 2 - document is ready for saving
                // 3 - document saving error has occurred
                // 4 - document is closed with no changes
                // 6 - document is being edited, but the current document state is saved
                // 7 - error has occurred while force saving the document

                if (data.status === 2 || data.status === 6) {
                    // Document ready for saving - download from data.url
                    if (data.url) {
                        this.downloadAndSaveDocument(data.url, data.key);
                    }
                }

                // Always respond with success to OnlyOffice
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 0 }));
            } catch (e) {
                console.error('Callback error:', e);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 0 }));
            }
        });
    }

    /**
     * Download saved document from OnlyOffice and save to local file
     */
    private async downloadAndSaveDocument(url: string, key: string): Promise<void> {
        try {
            // The key contains the original filename prefix
            const files = fs.readdirSync(this.documentsFolder);
            const matchingFile = files.find(f => f.startsWith(key));

            if (!matchingFile) {
                console.error(`No matching file found for key: ${key}`);
                return;
            }

            const targetPath = path.join(this.documentsFolder, matchingFile);

            // Download from OnlyOffice
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download: ${response.status}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(targetPath, buffer);
            console.log(`Document saved: ${targetPath}`);

            // Notify VS Code
            vscode.window.setStatusBarMessage('Document saved', 2000);
        } catch (e) {
            console.error('Failed to save document:', e);
            vscode.window.showErrorMessage(`Failed to save document: ${e}`);
        }
    }

    /**
     * Get the URL for accessing a file from OnlyOffice (running in Docker)
     */
    getDockerAccessibleUrl(fileName: string): string {
        // OnlyOffice runs in Docker, so use host.docker.internal
        return `http://host.docker.internal:${this.port}/${encodeURIComponent(fileName)}`;
    }

    /**
     * Get the callback URL for OnlyOffice
     */
    getCallbackUrl(): string {
        return `http://host.docker.internal:${this.port}/callback`;
    }

    /**
     * Get the current port
     */
    getPort(): number {
        return this.port;
    }

    /**
     * Check if server is running
     */
    isRunning(): boolean {
        return this.server !== null;
    }
}
