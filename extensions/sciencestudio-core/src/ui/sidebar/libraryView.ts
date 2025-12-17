import * as vscode from 'vscode';

export class LibraryViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'sciencestudio.library';

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'openPdf':
                    vscode.window.showInformationMessage(`Opening PDF: ${data.file}`);
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PDF Library</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-sideBar-background);
                        padding: 0;
                        margin: 0;
                    }
                    .library-container {
                        padding: 1rem;
                    }
                    .library-item {
                        padding: 0.5rem;
                        cursor: pointer;
                        border-radius: 4px;
                        margin-bottom: 0.25rem;
                    }
                    .library-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .library-item-title {
                        font-weight: 500;
                    }
                    .library-item-meta {
                        font-size: 0.85em;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <div class="library-container">
                    <h3>PDF Library</h3>
                    <div class="library-item">
                        <div class="library-item-title">Sample Paper 1</div>
                        <div class="library-item-meta">Smith et al., 2023</div>
                    </div>
                    <div class="library-item">
                        <div class="library-item-title">Sample Paper 2</div>
                        <div class="library-item-meta">Johnson & Lee, 2022</div>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.querySelectorAll('.library-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const title = item.querySelector('.library-item-title').textContent;
                            vscode.postMessage({
                                type: 'openPdf',
                                file: title
                            });
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }
}