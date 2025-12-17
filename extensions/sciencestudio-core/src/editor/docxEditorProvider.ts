import * as vscode from 'vscode';

export class DocxEditorProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'sciencestudio.docxEditor';

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'update':
                    this.updateTextDocument(document, e.content);
                    return;
            }
        });

        // Send initial content to webview
        webviewPanel.webview.postMessage({
            type: 'init',
            text: document.getText()
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>ScienceStudio Document Editor</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        padding: 2rem;
                        max-width: 800px;
                        margin: 0 auto;
                        line-height: 1.6;
                    }
                    #editor {
                        min-height: 600px;
                        border: 1px solid #e0e0e0;
                        padding: 1rem;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div id="editor">
                    <h1>ScienceStudio Document Editor</h1>
                    <p>ProseMirror integration coming soon...</p>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'init':
                                document.getElementById('editor').innerText = message.text;
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }

    private updateTextDocument(document: vscode.TextDocument, content: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            content
        );
        return vscode.workspace.applyEdit(edit);
    }
}