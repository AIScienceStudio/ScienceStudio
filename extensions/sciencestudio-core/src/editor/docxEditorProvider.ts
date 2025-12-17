import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { FileServer } from '../server/fileServer';

/**
 * DocxEditorProvider - OnlyOffice integration for Word document editing
 *
 * Architecture:
 * - Uses OnlyOffice Document Server running in Docker
 * - Documents are copied to a shared folder accessible by the embedded file server
 * - WebView embeds OnlyOffice editor via iframe
 * - File server runs on host, accessible from Docker via host.docker.internal
 */
export class DocxEditorProvider implements vscode.CustomEditorProvider<DocxDocument> {
    public static readonly viewType = 'sciencestudio.docxEditor';

    private static readonly ONLYOFFICE_URL = 'http://localhost:8080';
    private fileServer: FileServer;
    private documentsFolder: string = '';

    private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<DocxDocument>>();
    public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

    private fileServerReady: Promise<void>;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.fileServer = FileServer.getInstance();
        this.documentsFolder = path.join(context.globalStorageUri.fsPath, 'documents');

        console.log(`ScienceStudio documents folder: ${this.documentsFolder}`);

        // Start file server and track when it's ready
        this.fileServerReady = this.initFileServer();
    }

    /**
     * Initialize the file server
     */
    private async initFileServer(): Promise<void> {
        try {
            // Ensure documents folder exists
            if (!fs.existsSync(this.documentsFolder)) {
                fs.mkdirSync(this.documentsFolder, { recursive: true });
            }

            await this.fileServer.start(this.documentsFolder, 8081);
            console.log(`File server started on port ${this.fileServer.getPort()}`);
            console.log(`Serving files from: ${this.documentsFolder}`);
        } catch (e) {
            console.error('Failed to start file server:', e);
            vscode.window.showErrorMessage(`Failed to start file server: ${e}`);
            throw e;
        }
    }

    /**
     * Open a .docx document
     */
    async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        _token: vscode.CancellationToken
    ): Promise<DocxDocument> {
        // Wait for file server to be ready
        await this.fileServerReady;

        const document = new DocxDocument(uri);

        // Copy document to shared folder for OnlyOffice access
        await document.copyToShared(this.documentsFolder);

        console.log(`Document opened: ${uri.fsPath}`);
        console.log(`Shared as: ${document.getSharedFileName()}`);

        return document;
    }

    /**
     * Resolve the custom editor (create WebView)
     */
    async resolveCustomEditor(
        document: DocxDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        // Generate unique document key for OnlyOffice
        const docKey = document.getDocumentKey();
        const sharedFileName = document.getSharedFileName();
        // Use host.docker.internal so OnlyOffice in Docker can access the file server on host
        const docUrl = this.fileServer.getDockerAccessibleUrl(sharedFileName);
        const callbackUrl = this.fileServer.getCallbackUrl();
        const fileName = path.basename(document.uri.fsPath);

        console.log(`Opening document: ${fileName}`);
        console.log(`Document URL for OnlyOffice: ${docUrl}`);
        console.log(`Callback URL: ${callbackUrl}`);

        webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview,
            DocxEditorProvider.ONLYOFFICE_URL,
            docUrl,
            docKey,
            fileName,
            callbackUrl
        );

        // Handle messages from WebView
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'ready':
                    console.log('OnlyOffice editor ready');
                    break;
                case 'save':
                    await this.handleSave(document, message.data);
                    break;
                case 'inline-ai-request':
                    await this.handleInlineAI(document, webviewPanel, message);
                    break;
                case 'error':
                    vscode.window.showErrorMessage(`OnlyOffice error: ${message.error}`);
                    break;
            }
        });

        // Show status
        vscode.window.setStatusBarMessage('OnlyOffice: Loading document...', 5000);
    }

    /**
     * Save the document
     */
    async saveCustomDocument(
        document: DocxDocument,
        cancellation: vscode.CancellationToken
    ): Promise<void> {
        await document.save();
    }

    async saveCustomDocumentAs(
        document: DocxDocument,
        destination: vscode.Uri,
        cancellation: vscode.CancellationToken
    ): Promise<void> {
        await document.saveAs(destination);
    }

    async revertCustomDocument(
        document: DocxDocument,
        cancellation: vscode.CancellationToken
    ): Promise<void> {
        await document.revert();
    }

    async backupCustomDocument(
        document: DocxDocument,
        context: vscode.CustomDocumentBackupContext,
        cancellation: vscode.CancellationToken
    ): Promise<vscode.CustomDocumentBackup> {
        return document.backup(context.destination);
    }

    /**
     * Handle inline AI requests from WebView
     */
    private async handleInlineAI(
        document: DocxDocument,
        webviewPanel: vscode.WebviewPanel,
        message: InlineAIRequest
    ): Promise<void> {
        // Send progress update
        webviewPanel.webview.postMessage({
            type: 'inline-ai-response',
            status: 'streaming',
            progress: 'Processing your request...'
        });

        // TODO: Connect to Claude Code via MCP
        // For now, send a placeholder response
        setTimeout(() => {
            webviewPanel.webview.postMessage({
                type: 'inline-ai-response',
                status: 'complete',
                result: `[AI Response for "${message.command}" on: "${message.selection.substring(0, 50)}..."]`,
                citations: []
            });
        }, 1000);
    }

    /**
     * Handle document save from OnlyOffice callback
     */
    private async handleSave(document: DocxDocument, data: any): Promise<void> {
        try {
            await document.save();
            vscode.window.setStatusBarMessage('Document saved', 2000);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save: ${error}`);
        }
    }

    /**
     * Generate WebView HTML with OnlyOffice editor
     */
    private getHtmlForWebview(
        webview: vscode.Webview,
        onlyofficeUrl: string,
        documentUrl: string,
        documentKey: string,
        fileName: string,
        callbackUrl: string
    ): string {
        const nonce = this.getNonce();

        // For OnlyOffice, we need a permissive CSP since it loads many resources
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *; img-src * data: blob:; frame-src *; style-src * 'unsafe-inline';">
                <title>${fileName} - ScienceStudio</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body, html {
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background: var(--vscode-editor-background, #1e1e1e);
                        /* Fix for Chrome 128+ zoom coordinate issue */
                        zoom: 1 !important;
                        -webkit-text-size-adjust: 100%;
                    }
                    #editor-container {
                        width: 100%;
                        height: 100%;
                        /* Ensure no transforms that could affect coordinates */
                        transform: none !important;
                        zoom: 1 !important;
                    }
                    /* Fix OnlyOffice iframe zoom issues */
                    #editor-container iframe {
                        zoom: 1 !important;
                        transform-origin: 0 0;
                    }
                    #loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        color: var(--vscode-foreground, #ccc);
                        font-family: var(--vscode-font-family, sans-serif);
                    }
                    #loading .spinner {
                        width: 40px;
                        height: 40px;
                        border: 3px solid var(--vscode-editor-foreground, #333);
                        border-top-color: var(--vscode-button-background, #0e639c);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 16px;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    #error {
                        display: none;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        color: var(--vscode-errorForeground, #f44);
                        font-family: var(--vscode-font-family, sans-serif);
                        text-align: center;
                        padding: 20px;
                    }
                    #error h2 {
                        margin-bottom: 12px;
                    }
                    #error p {
                        color: var(--vscode-foreground, #ccc);
                        max-width: 500px;
                        line-height: 1.5;
                    }
                    #error code {
                        background: var(--vscode-textCodeBlock-background, #333);
                        padding: 8px 16px;
                        border-radius: 4px;
                        margin-top: 12px;
                        display: block;
                    }

                    /* Inline AI popup */
                    #inline-ai-popup {
                        display: none;
                        position: fixed;
                        background: var(--vscode-editorWidget-background, #252526);
                        border: 1px solid var(--vscode-editorWidget-border, #454545);
                        border-radius: 8px;
                        padding: 12px;
                        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                        z-index: 10000;
                        min-width: 300px;
                        max-width: 400px;
                    }
                    #inline-ai-popup.visible {
                        display: block;
                    }
                    #inline-ai-popup h4 {
                        color: var(--vscode-foreground, #ccc);
                        margin-bottom: 8px;
                        font-size: 12px;
                    }
                    .ai-commands {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                        margin-bottom: 10px;
                    }
                    .ai-cmd {
                        background: var(--vscode-button-secondaryBackground, #3a3d41);
                        color: var(--vscode-button-secondaryForeground, #ccc);
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                    .ai-cmd:hover {
                        background: var(--vscode-button-secondaryHoverBackground, #45494e);
                    }
                    .ai-cmd.primary {
                        background: var(--vscode-button-background, #0e639c);
                        color: var(--vscode-button-foreground, #fff);
                    }
                    #custom-prompt {
                        width: 100%;
                        padding: 8px;
                        background: var(--vscode-input-background, #3c3c3c);
                        color: var(--vscode-input-foreground, #ccc);
                        border: 1px solid var(--vscode-input-border, #3c3c3c);
                        border-radius: 4px;
                        font-size: 12px;
                    }
                    #custom-prompt::placeholder {
                        color: var(--vscode-input-placeholderForeground, #888);
                    }
                    #ai-progress {
                        color: var(--vscode-foreground, #ccc);
                        font-size: 12px;
                        padding: 8px 0;
                    }
                    #ai-result {
                        background: var(--vscode-textCodeBlock-background, #2d2d2d);
                        padding: 10px;
                        border-radius: 4px;
                        margin-top: 8px;
                        font-size: 13px;
                        line-height: 1.5;
                        max-height: 200px;
                        overflow-y: auto;
                    }
                    .ai-result-actions {
                        display: flex;
                        gap: 8px;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div id="loading">
                    <div class="spinner"></div>
                    <p>Loading OnlyOffice Document Server...</p>
                    <p style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Make sure Docker is running with: docker-compose up -d</p>
                </div>

                <div id="error">
                    <h2>Could not connect to OnlyOffice</h2>
                    <p>The OnlyOffice Document Server is not running. Please start it with:</p>
                    <code>docker-compose up -d</code>
                    <p style="margin-top: 16px; font-size: 12px;">Then reload this editor.</p>
                </div>

                <div id="editor-container"></div>

                <!-- Inline AI Popup (Cmd+K) -->
                <div id="inline-ai-popup">
                    <h4>What do you want to do?</h4>
                    <div class="ai-commands">
                        <button class="ai-cmd primary" data-cmd="refine">Refine</button>
                        <button class="ai-cmd" data-cmd="expand">Expand</button>
                        <button class="ai-cmd" data-cmd="add-citations">Add citations</button>
                        <button class="ai-cmd" data-cmd="find-sources">Find sources</button>
                        <button class="ai-cmd" data-cmd="verify">Verify claim</button>
                        <button class="ai-cmd" data-cmd="strengthen">Strengthen</button>
                    </div>
                    <input type="text" id="custom-prompt" placeholder="Or type a custom instruction...">
                    <div id="ai-progress" style="display: none;"></div>
                    <div id="ai-result" style="display: none;"></div>
                    <div class="ai-result-actions" style="display: none;">
                        <button class="ai-cmd primary" id="accept-btn">Accept</button>
                        <button class="ai-cmd" id="edit-btn">Edit</button>
                        <button class="ai-cmd" id="reject-btn">Reject</button>
                    </div>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const onlyofficeUrl = '${onlyofficeUrl}';
                    const documentUrl = '${documentUrl}';
                    const documentKey = '${documentKey}';
                    const fileName = '${fileName}';
                    const callbackUrl = '${callbackUrl}';

                    let docEditor = null;
                    let selectedText = '';
                    let selectionContext = {};

                    // Check if OnlyOffice is available
                    async function checkOnlyOffice() {
                        try {
                            const response = await fetch(onlyofficeUrl + '/healthcheck', {
                                mode: 'no-cors',
                                timeout: 5000
                            });
                            return true;
                        } catch (e) {
                            return false;
                        }
                    }

                    // Initialize OnlyOffice editor
                    async function initEditor() {
                        const isAvailable = await checkOnlyOffice();

                        if (!isAvailable) {
                            document.getElementById('loading').style.display = 'none';
                            document.getElementById('error').style.display = 'flex';
                            vscode.postMessage({ type: 'error', error: 'OnlyOffice not available' });
                            return;
                        }

                        // Load OnlyOffice API script
                        const script = document.createElement('script');
                        script.src = onlyofficeUrl + '/web-apps/apps/api/documents/api.js';
                        script.onload = () => {
                            document.getElementById('loading').style.display = 'none';
                            createEditor();
                        };
                        script.onerror = () => {
                            document.getElementById('loading').style.display = 'none';
                            document.getElementById('error').style.display = 'flex';
                        };
                        document.head.appendChild(script);
                    }

                    function createEditor() {
                        console.log('=== OnlyOffice Configuration ===');
                        console.log('Document URL:', documentUrl);
                        console.log('Document Key:', documentKey);
                        console.log('Callback URL:', callbackUrl);
                        console.log('OnlyOffice URL:', onlyofficeUrl);
                        console.log('================================');

                        docEditor = new DocsAPI.DocEditor('editor-container', {
                            document: {
                                fileType: 'docx',
                                key: documentKey,
                                title: fileName,
                                url: documentUrl,
                                permissions: {
                                    edit: true,
                                    download: true,
                                    print: true,
                                    review: true,
                                    comment: true
                                }
                            },
                            editorConfig: {
                                mode: 'edit',
                                lang: 'en',
                                callbackUrl: callbackUrl,
                                user: {
                                    id: 'sciencestudio-user',
                                    name: 'Researcher'
                                },
                                customization: {
                                    autosave: true,
                                    chat: false,
                                    comments: true,
                                    compactHeader: true,
                                    compactToolbar: false,
                                    forcesave: true,
                                    help: false,
                                    hideRightMenu: false,
                                    logo: {
                                        image: '',
                                        imageDark: ''
                                    },
                                    toolbarNoTabs: false,
                                    uiTheme: 'theme-dark'
                                }
                            },
                            events: {
                                onReady: () => {
                                    vscode.postMessage({ type: 'ready' });
                                    // Fix for zoom cursor offset issue
                                    setTimeout(fixZoomOffset, 500);
                                },
                                onAppReady: () => {
                                    // Called when app is fully loaded
                                    setTimeout(fixZoomOffset, 100);
                                },
                                onDocumentStateChange: (event) => {
                                    // Document modified
                                    if (event.data) {
                                        vscode.postMessage({ type: 'modified' });
                                    }
                                },
                                onError: (event) => {
                                    vscode.postMessage({ type: 'error', error: event.data });
                                }
                            },
                            type: 'desktop',
                            width: '100%',
                            height: '100%'
                        });
                    }

                    // Inline AI popup
                    const popup = document.getElementById('inline-ai-popup');
                    const progressEl = document.getElementById('ai-progress');
                    const resultEl = document.getElementById('ai-result');
                    const actionsEl = document.querySelector('.ai-result-actions');

                    function showPopup(x, y) {
                        popup.style.left = x + 'px';
                        popup.style.top = y + 'px';
                        popup.classList.add('visible');
                    }

                    function hidePopup() {
                        popup.classList.remove('visible');
                        progressEl.style.display = 'none';
                        resultEl.style.display = 'none';
                        actionsEl.style.display = 'none';
                    }

                    // Handle AI commands
                    document.querySelectorAll('.ai-cmd[data-cmd]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const command = btn.dataset.cmd;
                            sendAIRequest(command);
                        });
                    });

                    document.getElementById('custom-prompt').addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            sendAIRequest('custom', e.target.value);
                        }
                    });

                    function sendAIRequest(command, customPrompt) {
                        progressEl.style.display = 'block';
                        progressEl.textContent = 'Processing...';

                        vscode.postMessage({
                            type: 'inline-ai-request',
                            selection: selectedText,
                            context: selectionContext,
                            command: command,
                            customPrompt: customPrompt
                        });
                    }

                    // Handle keyboard shortcuts
                    document.addEventListener('keydown', (e) => {
                        // Cmd+K or Ctrl+K for inline AI
                        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                            e.preventDefault();
                            // Get selection from OnlyOffice if available
                            // For now, show popup at center
                            const x = window.innerWidth / 2 - 150;
                            const y = window.innerHeight / 2 - 100;
                            showPopup(x, y);
                        }
                        // Escape to close popup
                        if (e.key === 'Escape') {
                            hidePopup();
                        }
                    });

                    // Handle messages from extension
                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        switch (message.type) {
                            case 'inline-ai-response':
                                if (message.status === 'streaming') {
                                    progressEl.textContent = message.progress;
                                } else if (message.status === 'complete') {
                                    progressEl.style.display = 'none';
                                    resultEl.style.display = 'block';
                                    resultEl.textContent = message.result;
                                    actionsEl.style.display = 'flex';
                                } else if (message.status === 'error') {
                                    progressEl.textContent = 'Error: ' + message.error;
                                }
                                break;
                        }
                    });

                    // Accept/Reject buttons
                    document.getElementById('accept-btn').addEventListener('click', () => {
                        // TODO: Insert text into OnlyOffice
                        hidePopup();
                    });
                    document.getElementById('reject-btn').addEventListener('click', hidePopup);

                    // Fix for VS Code WebView + Chrome zoom cursor offset issue
                    // The issue is that devicePixelRatio affects mouse coordinates
                    function fixZoomOffset() {
                        try {
                            const iframe = document.querySelector('#editor-container iframe');
                            if (!iframe) {
                                console.log('No iframe found yet, retrying...');
                                setTimeout(fixZoomOffset, 200);
                                return;
                            }

                            const dpr = window.devicePixelRatio || 1;
                            console.log('Device Pixel Ratio:', dpr);
                            console.log('Screen size:', window.screen.width, 'x', window.screen.height);
                            console.log('Window inner size:', window.innerWidth, 'x', window.innerHeight);

                            // For Retina/HiDPI displays, we need to counter-scale the iframe
                            // This makes the iframe render at 1:1 physical pixels
                            if (dpr > 1) {
                                const container = document.getElementById('editor-container');

                                // Scale down by DPR, then size up to compensate
                                iframe.style.transform = 'scale(' + (1/dpr) + ')';
                                iframe.style.transformOrigin = 'top left';
                                iframe.style.width = (100 * dpr) + '%';
                                iframe.style.height = (100 * dpr) + '%';
                                iframe.style.position = 'absolute';
                                iframe.style.top = '0';
                                iframe.style.left = '0';

                                container.style.position = 'relative';
                                container.style.overflow = 'hidden';

                                console.log('Applied HiDPI fix: scale=', 1/dpr, 'size=', (100*dpr)+'%');
                            }
                        } catch (e) {
                            console.error('Error fixing zoom offset:', e);
                        }
                    }

                    // Re-apply fix on window resize (zoom might change)
                    window.addEventListener('resize', () => {
                        setTimeout(fixZoomOffset, 100);
                    });

                    // Initialize
                    initEditor();
                </script>
            </body>
            </html>
        `;
    }

    private getNonce(): string {
        return crypto.randomBytes(16).toString('hex');
    }
}

/**
 * Document model for .docx files
 */
class DocxDocument implements vscode.CustomDocument {
    private _sharedPath: string = '';
    private _sharedFileName: string = '';
    private _documentKey: string = '';

    constructor(public readonly uri: vscode.Uri) {
        // Generate unique key for this document session
        this._documentKey = crypto.randomBytes(8).toString('hex');
    }

    /**
     * Copy document to shared folder for OnlyOffice access
     */
    async copyToShared(sharedFolder: string): Promise<void> {
        // Ensure folder exists
        if (!fs.existsSync(sharedFolder)) {
            fs.mkdirSync(sharedFolder, { recursive: true });
        }

        const fileName = path.basename(this.uri.fsPath);
        this._sharedFileName = `${this._documentKey}_${fileName}`;
        this._sharedPath = path.join(sharedFolder, this._sharedFileName);

        // Copy file
        await fs.promises.copyFile(this.uri.fsPath, this._sharedPath);
        console.log(`Copied document to: ${this._sharedPath}`);
    }

    /**
     * Get the shared file name (for URL construction)
     */
    getSharedFileName(): string {
        return this._sharedFileName;
    }

    /**
     * Get unique document key for OnlyOffice
     */
    getDocumentKey(): string {
        return this._documentKey;
    }

    /**
     * Save document back to original location
     */
    async save(): Promise<void> {
        if (this._sharedPath && fs.existsSync(this._sharedPath)) {
            await fs.promises.copyFile(this._sharedPath, this.uri.fsPath);
        }
    }

    /**
     * Save document to new location
     */
    async saveAs(destination: vscode.Uri): Promise<void> {
        if (this._sharedPath && fs.existsSync(this._sharedPath)) {
            await fs.promises.copyFile(this._sharedPath, destination.fsPath);
        }
    }

    /**
     * Revert to original file
     */
    async revert(): Promise<void> {
        if (this._sharedPath) {
            await fs.promises.copyFile(this.uri.fsPath, this._sharedPath);
        }
    }

    /**
     * Create backup
     */
    async backup(destination: vscode.Uri): Promise<vscode.CustomDocumentBackup> {
        await fs.promises.copyFile(this._sharedPath || this.uri.fsPath, destination.fsPath);
        return {
            id: destination.fsPath,
            delete: async () => {
                try {
                    await fs.promises.unlink(destination.fsPath);
                } catch { }
            }
        };
    }

    /**
     * Cleanup when document is closed
     */
    dispose(): void {
        // Clean up shared file
        if (this._sharedPath && fs.existsSync(this._sharedPath)) {
            fs.unlinkSync(this._sharedPath);
        }
    }
}

/**
 * Types for inline AI communication
 */
interface InlineAIRequest {
    type: 'inline-ai-request';
    selection: string;
    context: {
        before: string;
        after: string;
        section: string;
        documentPath: string;
    };
    command: string;
    customPrompt?: string;
}

interface InlineAIResponse {
    type: 'inline-ai-response';
    status: 'streaming' | 'complete' | 'error';
    progress?: string;
    result?: string;
    citations?: any[];
    error?: string;
}
