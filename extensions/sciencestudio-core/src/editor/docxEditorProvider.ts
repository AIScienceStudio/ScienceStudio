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
 *
 * Known Issue: Cursor offset in VS Code WebView
 * - See docs/issues/editor_related/cursor-offset-issue.md for details
 * - Multiple compensation strategies are implemented below
 */
export class DocxEditorProvider implements vscode.CustomEditorProvider<DocxDocument> {
    public static readonly viewType = 'sciencestudio.docxEditor';

    private static readonly ONLYOFFICE_URL = 'http://localhost:8080';
    private fileServer: FileServer;
    private documentsFolder: string = '';
    private activeWebviews: Map<string, vscode.WebviewPanel> = new Map();

    private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<DocxDocument>>();
    public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

    private fileServerReady: Promise<void>;
    private zoomLevelListener: vscode.Disposable | undefined;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.fileServer = FileServer.getInstance();
        this.documentsFolder = path.join(context.globalStorageUri.fsPath, 'documents');

        console.log(`ScienceStudio documents folder: ${this.documentsFolder}`);

        // Start file server and track when it's ready
        this.fileServerReady = this.initFileServer();

        // Listen for VS Code zoom level changes
        this.zoomLevelListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('window.zoomLevel')) {
                this.notifyZoomChange();
            }
        });
    }

    /**
     * Get current VS Code zoom level and calculate zoom factor
     */
    private getVSCodeZoomInfo(): { zoomLevel: number; zoomFactor: number } {
        const zoomLevel = vscode.workspace.getConfiguration('window').get<number>('zoomLevel') || 0;
        // Each zoom level step is 20% (factor of 1.2)
        const zoomFactor = Math.pow(1.2, zoomLevel);
        return { zoomLevel, zoomFactor };
    }

    /**
     * Notify all active WebViews of zoom level change
     */
    private notifyZoomChange(): void {
        const zoomInfo = this.getVSCodeZoomInfo();
        this.activeWebviews.forEach((panel) => {
            panel.webview.postMessage({
                type: 'vscode-zoom-changed',
                ...zoomInfo
            });
        });
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

        // Track this WebView for zoom notifications
        const docId = document.uri.toString();
        this.activeWebviews.set(docId, webviewPanel);
        webviewPanel.onDidDispose(() => {
            this.activeWebviews.delete(docId);
        });

        // Generate unique document key for OnlyOffice
        const docKey = document.getDocumentKey();
        const sharedFileName = document.getSharedFileName();
        // Use host.docker.internal so OnlyOffice in Docker can access the file server on host
        const docUrl = this.fileServer.getDockerAccessibleUrl(sharedFileName);
        const callbackUrl = this.fileServer.getCallbackUrl();
        const fileName = path.basename(document.uri.fsPath);

        // Get VS Code zoom info
        const zoomInfo = this.getVSCodeZoomInfo();

        console.log(`Opening document: ${fileName}`);
        console.log(`Document URL for OnlyOffice: ${docUrl}`);
        console.log(`Callback URL: ${callbackUrl}`);
        console.log(`VS Code zoom level: ${zoomInfo.zoomLevel}, factor: ${zoomInfo.zoomFactor}`);

        webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview,
            DocxEditorProvider.ONLYOFFICE_URL,
            docUrl,
            docKey,
            fileName,
            callbackUrl,
            zoomInfo
        );

        // Handle messages from WebView
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'ready':
                    console.log('OnlyOffice editor ready');
                    // Send initial zoom info after editor is ready
                    webviewPanel.webview.postMessage({
                        type: 'vscode-zoom-changed',
                        ...this.getVSCodeZoomInfo()
                    });
                    break;
                case 'save':
                    await this.handleSave(document, message.data);
                    break;
                case 'inline-ai-request':
                    await this.handleInlineAI(document, webviewPanel, message);
                    break;
                case 'diagnostic-log':
                    // Log diagnostic info from WebView
                    console.log('[WebView Diagnostic]', message.data);
                    break;
                case 'cursor-offset-detected':
                    // User reported cursor offset via calibration
                    console.log('[Cursor Offset]', message.offset);
                    vscode.window.showInformationMessage(
                        `Detected cursor offset: Y=${message.offset.y}px. Applying compensation...`
                    );
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
     * Includes comprehensive zoom compensation for cursor offset fix
     */
    private getHtmlForWebview(
        webview: vscode.Webview,
        onlyofficeUrl: string,
        documentUrl: string,
        documentKey: string,
        fileName: string,
        callbackUrl: string,
        zoomInfo: { zoomLevel: number; zoomFactor: number }
    ): string {
        const nonce = this.getNonce();

        // Initial VS Code zoom info passed from extension
        const initialZoomLevel = zoomInfo.zoomLevel;
        const initialZoomFactor = zoomInfo.zoomFactor;

        // For OnlyOffice, we need a permissive CSP since it loads many resources
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *; img-src * data: blob:; frame-src *; style-src * 'unsafe-inline';">
                <title>${fileName} - ScienceStudio</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body, html {
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background: var(--vscode-editor-background, #1e1e1e);
                    }
                    #editor-container {
                        width: 100%;
                        height: 100%;
                        position: relative;
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
                    @keyframes spin { to { transform: rotate(360deg); } }
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
                    #error code {
                        background: var(--vscode-textCodeBlock-background, #333);
                        padding: 8px 16px;
                        border-radius: 4px;
                        margin-top: 12px;
                        display: block;
                    }

                    /* Diagnostic Panel */
                    #diagnostic-panel {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        background: rgba(0,0,0,0.85);
                        color: #0f0;
                        font-family: monospace;
                        font-size: 11px;
                        padding: 10px;
                        border-radius: 6px;
                        z-index: 99999;
                        max-width: 350px;
                        display: none;
                        border: 1px solid #333;
                    }
                    #diagnostic-panel.visible { display: block; }
                    #diagnostic-panel h5 {
                        color: #fff;
                        margin-bottom: 8px;
                        font-size: 12px;
                    }
                    #diagnostic-panel .row {
                        display: flex;
                        justify-content: space-between;
                        margin: 2px 0;
                    }
                    #diagnostic-panel .label { color: #888; }
                    #diagnostic-panel .value { color: #0f0; }
                    #diagnostic-panel .warning { color: #ff0; }
                    #diagnostic-panel .error { color: #f00; }
                    #diagnostic-panel .section {
                        border-top: 1px solid #333;
                        margin-top: 8px;
                        padding-top: 8px;
                    }
                    #diagnostic-panel button {
                        background: #0e639c;
                        color: white;
                        border: none;
                        padding: 4px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 10px;
                        margin: 2px;
                    }
                    #diagnostic-panel button:hover { background: #1177bb; }
                    #diagnostic-panel button.active { background: #2a2; }

                    /* Click Indicator */
                    .click-indicator {
                        position: fixed;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        pointer-events: none;
                        z-index: 99998;
                        transform: translate(-50%, -50%);
                    }
                    .click-indicator.actual {
                        background: rgba(255, 0, 0, 0.5);
                        border: 2px solid red;
                    }
                    .click-indicator.expected {
                        background: rgba(0, 255, 0, 0.5);
                        border: 2px solid lime;
                    }

                    /* Calibration Overlay */
                    #calibration-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.7);
                        z-index: 99997;
                        display: none;
                        align-items: center;
                        justify-content: center;
                    }
                    #calibration-overlay.visible { display: flex; }
                    #calibration-target {
                        width: 40px;
                        height: 40px;
                        border: 3px solid #0f0;
                        border-radius: 50%;
                        position: relative;
                    }
                    #calibration-target::before,
                    #calibration-target::after {
                        content: '';
                        position: absolute;
                        background: #0f0;
                    }
                    #calibration-target::before {
                        width: 2px;
                        height: 100%;
                        left: 50%;
                        transform: translateX(-50%);
                    }
                    #calibration-target::after {
                        height: 2px;
                        width: 100%;
                        top: 50%;
                        transform: translateY(-50%);
                    }
                    #calibration-instructions {
                        position: absolute;
                        bottom: 100px;
                        color: white;
                        font-size: 18px;
                        text-align: center;
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
                    #inline-ai-popup.visible { display: block; }
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
                    .ai-cmd:hover { background: var(--vscode-button-secondaryHoverBackground, #45494e); }
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
                </div>

                <div id="editor-container"></div>

                <!-- Diagnostic Panel (Cmd+Shift+D to toggle) -->
                <div id="diagnostic-panel">
                    <h5>Cursor Offset Diagnostics</h5>
                    <div class="row"><span class="label">VS Code Zoom Level:</span><span class="value" id="diag-vscode-zoom">${initialZoomLevel}</span></div>
                    <div class="row"><span class="label">VS Code Zoom Factor:</span><span class="value" id="diag-vscode-factor">${initialZoomFactor.toFixed(3)}</span></div>
                    <div class="row"><span class="label">Device Pixel Ratio:</span><span class="value" id="diag-dpr">-</span></div>
                    <div class="row"><span class="label">Window Inner Size:</span><span class="value" id="diag-window-size">-</span></div>
                    <div class="row"><span class="label">Chrome Version:</span><span class="value" id="diag-chrome">-</span></div>
                    <div class="section">
                        <div class="row"><span class="label">Active Strategy:</span><span class="value" id="diag-strategy">None</span></div>
                        <div class="row"><span class="label">Applied Zoom:</span><span class="value" id="diag-applied-zoom">1.0</span></div>
                        <div class="row"><span class="label">Detected Offset:</span><span class="value" id="diag-offset">0, 0</span></div>
                    </div>
                    <div class="section">
                        <div style="margin-bottom: 6px;">Compensation Strategy:</div>
                        <button id="strat-none">None</button>
                        <button id="strat-chrome128">Chrome128</button>
                        <button id="strat-vscode">VSCode</button>
                        <button id="strat-dpr">DPR</button>
                        <button id="strat-combined">Combined</button>
                        <button id="strat-auto" class="active">Auto</button>
                    </div>
                    <div class="section">
                        <button id="btn-calibrate">Calibrate Offset</button>
                        <button id="btn-test-click">Test Click Mode</button>
                    </div>
                </div>

                <!-- Calibration Overlay -->
                <div id="calibration-overlay">
                    <div id="calibration-target"></div>
                    <div id="calibration-instructions">Click precisely on the center of the target<br><small>Press ESC to cancel</small></div>
                </div>

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
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const onlyofficeUrl = '${onlyofficeUrl}';
                    const documentUrl = '${documentUrl}';
                    const documentKey = '${documentKey}';
                    const fileName = '${fileName}';
                    const callbackUrl = '${callbackUrl}';

                    // ============================================
                    // CURSOR OFFSET FIX - COMPREHENSIVE SOLUTION
                    // ============================================

                    // State
                    let docEditor = null;
                    let vscodeZoomLevel = ${initialZoomLevel};
                    let vscodeZoomFactor = ${initialZoomFactor};
                    let currentStrategy = 'auto';
                    let detectedOffset = { x: 0, y: 0 };
                    let testClickMode = false;
                    let calibrationMode = false;

                    // Detect Chrome version for Chrome 128+ fix
                    function getChromeVersion() {
                        const match = navigator.userAgent.match(/Chrome\\/(\\d+)/);
                        return match ? parseInt(match[1]) : 0;
                    }

                    // Log diagnostic info
                    function logDiagnostic(data) {
                        console.log('[Diagnostic]', data);
                        vscode.postMessage({ type: 'diagnostic-log', data });
                    }

                    // Update diagnostic panel
                    function updateDiagnostics() {
                        const dpr = window.devicePixelRatio || 1;
                        const chromeVer = getChromeVersion();

                        document.getElementById('diag-dpr').textContent = dpr.toFixed(2);
                        document.getElementById('diag-window-size').textContent = window.innerWidth + ' x ' + window.innerHeight;
                        document.getElementById('diag-chrome').textContent = chromeVer || 'N/A';
                        document.getElementById('diag-vscode-zoom').textContent = vscodeZoomLevel;
                        document.getElementById('diag-vscode-factor').textContent = vscodeZoomFactor.toFixed(3);
                        document.getElementById('diag-offset').textContent = detectedOffset.x.toFixed(1) + ', ' + detectedOffset.y.toFixed(1);

                        // Highlight potential issues
                        const dprEl = document.getElementById('diag-dpr');
                        dprEl.className = 'value' + (dpr > 1 ? ' warning' : '');

                        const chromeEl = document.getElementById('diag-chrome');
                        chromeEl.className = 'value' + (chromeVer >= 128 ? ' warning' : '');
                    }

                    // ============================================
                    // COMPENSATION STRATEGIES
                    // ============================================

                    const strategies = {
                        // No compensation
                        none: () => ({ zoom: 1, transform: 'none', description: 'No compensation' }),

                        // Chrome 128+ CSS zoom fix (from OnlyOffice issue #2859)
                        chrome128: () => {
                            const chromeVer = getChromeVersion();
                            if (chromeVer < 128) return strategies.none();

                            const dpr = window.devicePixelRatio || 1;
                            const zoomLevel = Math.round(dpr * 100);
                            const ratio = (100 * 100) / zoomLevel;
                            return {
                                zoom: ratio / 100,
                                transform: 'none',
                                description: 'Chrome 128+ zoom: ' + (ratio).toFixed(1) + '%'
                            };
                        },

                        // VS Code zoom level compensation
                        vscode: () => {
                            if (vscodeZoomFactor === 1) return strategies.none();
                            return {
                                zoom: 1 / vscodeZoomFactor,
                                transform: 'none',
                                description: 'VS Code zoom: ' + (100 / vscodeZoomFactor).toFixed(1) + '%'
                            };
                        },

                        // Device Pixel Ratio compensation
                        dpr: () => {
                            const dpr = window.devicePixelRatio || 1;
                            if (dpr === 1) return strategies.none();
                            return {
                                zoom: 1,
                                transform: 'scale(' + (1/dpr) + ')',
                                transformSize: dpr,
                                description: 'DPR scale: ' + (1/dpr).toFixed(3)
                            };
                        },

                        // Combined: Chrome128 + VSCode + DPR
                        combined: () => {
                            const dpr = window.devicePixelRatio || 1;
                            const chromeVer = getChromeVersion();

                            let totalFactor = 1;

                            // Apply VS Code zoom compensation
                            if (vscodeZoomFactor !== 1) {
                                totalFactor *= (1 / vscodeZoomFactor);
                            }

                            // Apply Chrome 128 compensation
                            if (chromeVer >= 128 && dpr > 1) {
                                const zoomLevel = Math.round(dpr * 100);
                                totalFactor *= ((100 * 100) / zoomLevel) / 100;
                            }

                            return {
                                zoom: totalFactor,
                                transform: 'none',
                                description: 'Combined: ' + (totalFactor * 100).toFixed(1) + '%'
                            };
                        },

                        // Auto-detect best strategy
                        auto: () => {
                            const dpr = window.devicePixelRatio || 1;
                            const chromeVer = getChromeVersion();

                            // Priority: Combined if multiple factors present
                            if ((vscodeZoomFactor !== 1) && (chromeVer >= 128 || dpr > 1)) {
                                return { ...strategies.combined(), autoSelected: 'combined' };
                            }

                            // Chrome 128+ with high DPR
                            if (chromeVer >= 128 && dpr > 1) {
                                return { ...strategies.chrome128(), autoSelected: 'chrome128' };
                            }

                            // VS Code zoom only
                            if (vscodeZoomFactor !== 1) {
                                return { ...strategies.vscode(), autoSelected: 'vscode' };
                            }

                            // DPR only (non-Chrome 128)
                            if (dpr > 1) {
                                return { ...strategies.dpr(), autoSelected: 'dpr' };
                            }

                            return { ...strategies.none(), autoSelected: 'none' };
                        }
                    };

                    // Apply compensation strategy to iframe
                    function applyStrategy(strategyName) {
                        const iframe = document.querySelector('#editor-container iframe');
                        if (!iframe) {
                            console.log('No iframe found, retrying...');
                            setTimeout(() => applyStrategy(strategyName), 200);
                            return;
                        }

                        const container = document.getElementById('editor-container');
                        const strategy = strategies[strategyName]();

                        logDiagnostic({
                            strategy: strategyName,
                            result: strategy,
                            dpr: window.devicePixelRatio,
                            vscodeZoom: vscodeZoomFactor,
                            chrome: getChromeVersion()
                        });

                        // Reset styles first
                        iframe.style.zoom = '';
                        iframe.style.transform = '';
                        iframe.style.transformOrigin = '';
                        iframe.style.width = '';
                        iframe.style.height = '';
                        iframe.style.position = '';
                        container.style.overflow = '';

                        // Apply zoom if specified
                        if (strategy.zoom && strategy.zoom !== 1) {
                            iframe.style.zoom = strategy.zoom;
                        }

                        // Apply transform if specified
                        if (strategy.transform && strategy.transform !== 'none') {
                            iframe.style.transform = strategy.transform;
                            iframe.style.transformOrigin = 'top left';

                            if (strategy.transformSize) {
                                iframe.style.width = (100 * strategy.transformSize) + '%';
                                iframe.style.height = (100 * strategy.transformSize) + '%';
                                iframe.style.position = 'absolute';
                                container.style.overflow = 'hidden';
                            }
                        }

                        // Update UI
                        currentStrategy = strategyName;
                        document.getElementById('diag-strategy').textContent =
                            (strategy.autoSelected || strategyName) + (strategy.autoSelected ? ' (auto)' : '');
                        document.getElementById('diag-applied-zoom').textContent =
                            strategy.description || (strategy.zoom ? strategy.zoom.toFixed(3) : '1.0');

                        // Update button states
                        document.querySelectorAll('#diagnostic-panel button[id^="strat-"]').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        document.getElementById('strat-' + strategyName)?.classList.add('active');
                    }

                    // ============================================
                    // CALIBRATION & TESTING
                    // ============================================

                    function startCalibration() {
                        calibrationMode = true;
                        document.getElementById('calibration-overlay').classList.add('visible');
                    }

                    function endCalibration() {
                        calibrationMode = false;
                        document.getElementById('calibration-overlay').classList.remove('visible');
                    }

                    function handleCalibrationClick(e) {
                        if (!calibrationMode) return;

                        const target = document.getElementById('calibration-target');
                        const rect = target.getBoundingClientRect();
                        const targetX = rect.left + rect.width / 2;
                        const targetY = rect.top + rect.height / 2;

                        const clickX = e.clientX;
                        const clickY = e.clientY;

                        detectedOffset = {
                            x: clickX - targetX,
                            y: clickY - targetY
                        };

                        logDiagnostic({
                            calibration: true,
                            target: { x: targetX, y: targetY },
                            click: { x: clickX, y: clickY },
                            offset: detectedOffset
                        });

                        vscode.postMessage({
                            type: 'cursor-offset-detected',
                            offset: detectedOffset
                        });

                        updateDiagnostics();
                        endCalibration();

                        // Show result
                        alert('Detected offset: X=' + detectedOffset.x.toFixed(1) + 'px, Y=' + detectedOffset.y.toFixed(1) + 'px');
                    }

                    // Show click indicators for testing
                    function showClickIndicator(x, y, type) {
                        const indicator = document.createElement('div');
                        indicator.className = 'click-indicator ' + type;
                        indicator.style.left = x + 'px';
                        indicator.style.top = y + 'px';
                        document.body.appendChild(indicator);

                        setTimeout(() => indicator.remove(), 2000);
                    }

                    // ============================================
                    // EDITOR INITIALIZATION
                    // ============================================

                    async function checkOnlyOffice() {
                        try {
                            await fetch(onlyofficeUrl + '/healthcheck', { mode: 'no-cors' });
                            return true;
                        } catch (e) {
                            return false;
                        }
                    }

                    async function initEditor() {
                        const isAvailable = await checkOnlyOffice();

                        if (!isAvailable) {
                            document.getElementById('loading').style.display = 'none';
                            document.getElementById('error').style.display = 'flex';
                            vscode.postMessage({ type: 'error', error: 'OnlyOffice not available' });
                            return;
                        }

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
                        logDiagnostic({
                            event: 'createEditor',
                            documentUrl,
                            documentKey,
                            vscodeZoom: vscodeZoomFactor
                        });

                        docEditor = new DocsAPI.DocEditor('editor-container', {
                            document: {
                                fileType: 'docx',
                                key: documentKey,
                                title: fileName,
                                url: documentUrl,
                                permissions: { edit: true, download: true, print: true, review: true, comment: true }
                            },
                            editorConfig: {
                                mode: 'edit',
                                lang: 'en',
                                callbackUrl: callbackUrl,
                                user: { id: 'sciencestudio-user', name: 'Researcher' },
                                customization: {
                                    autosave: true,
                                    chat: false,
                                    comments: true,
                                    compactHeader: true,
                                    forcesave: true,
                                    help: false,
                                    uiTheme: 'theme-dark'
                                }
                            },
                            events: {
                                onReady: () => {
                                    vscode.postMessage({ type: 'ready' });
                                    setTimeout(() => {
                                        applyStrategy(currentStrategy);
                                        updateDiagnostics();
                                    }, 300);
                                },
                                onAppReady: () => {
                                    setTimeout(() => applyStrategy(currentStrategy), 100);
                                },
                                onDocumentStateChange: (e) => {
                                    if (e.data) vscode.postMessage({ type: 'modified' });
                                },
                                onError: (e) => vscode.postMessage({ type: 'error', error: e.data })
                            },
                            type: 'desktop',
                            width: '100%',
                            height: '100%'
                        });
                    }

                    // ============================================
                    // EVENT HANDLERS
                    // ============================================

                    // Handle messages from extension
                    window.addEventListener('message', (event) => {
                        const msg = event.data;
                        if (msg.type === 'vscode-zoom-changed') {
                            vscodeZoomLevel = msg.zoomLevel;
                            vscodeZoomFactor = msg.zoomFactor;
                            updateDiagnostics();
                            if (currentStrategy === 'auto' || currentStrategy === 'vscode' || currentStrategy === 'combined') {
                                applyStrategy(currentStrategy);
                            }
                        }
                    });

                    // Keyboard shortcuts
                    document.addEventListener('keydown', (e) => {
                        // Cmd+Shift+D: Toggle diagnostic panel
                        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
                            e.preventDefault();
                            document.getElementById('diagnostic-panel').classList.toggle('visible');
                            updateDiagnostics();
                        }
                        // Cmd+K: Inline AI
                        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                            e.preventDefault();
                            const popup = document.getElementById('inline-ai-popup');
                            popup.style.left = (window.innerWidth / 2 - 150) + 'px';
                            popup.style.top = (window.innerHeight / 2 - 100) + 'px';
                            popup.classList.add('visible');
                        }
                        // Escape
                        if (e.key === 'Escape') {
                            document.getElementById('inline-ai-popup').classList.remove('visible');
                            endCalibration();
                            testClickMode = false;
                        }
                    });

                    // Calibration click handler
                    document.getElementById('calibration-overlay').addEventListener('click', handleCalibrationClick);

                    // Test click mode
                    document.addEventListener('click', (e) => {
                        if (testClickMode && !e.target.closest('#diagnostic-panel')) {
                            showClickIndicator(e.clientX, e.clientY, 'actual');
                        }
                    });

                    // Strategy buttons
                    ['none', 'chrome128', 'vscode', 'dpr', 'combined', 'auto'].forEach(strat => {
                        document.getElementById('strat-' + strat)?.addEventListener('click', () => {
                            applyStrategy(strat);
                        });
                    });

                    // Calibrate button
                    document.getElementById('btn-calibrate')?.addEventListener('click', startCalibration);

                    // Test click mode toggle
                    document.getElementById('btn-test-click')?.addEventListener('click', (e) => {
                        testClickMode = !testClickMode;
                        e.target.classList.toggle('active', testClickMode);
                        e.target.textContent = testClickMode ? 'Exit Test Mode' : 'Test Click Mode';
                    });

                    // Window resize
                    window.addEventListener('resize', () => {
                        updateDiagnostics();
                        setTimeout(() => applyStrategy(currentStrategy), 100);
                    });

                    // Initialize
                    initEditor();
                    updateDiagnostics();
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
