import * as vscode from 'vscode';
import { FocusModeController } from './ui/focusMode';
import { DocxEditorProvider } from './editor/docxEditorProvider';
import { LibraryViewProvider } from './ui/sidebar/libraryView';

export function activate(context: vscode.ExtensionContext) {
    console.log('ScienceStudio is activating...');

    // Initialize Focus Mode
    const focusModeController = new FocusModeController();

    context.subscriptions.push(
        vscode.commands.registerCommand('sciencestudio.toggleFocusMode', () => {
            focusModeController.toggle();
        })
    );

    // Register custom editor for .docx files with OnlyOffice
    const docxEditorProvider = new DocxEditorProvider(context);

    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            DocxEditorProvider.viewType,
            docxEditorProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                    enableFindWidget: true
                },
                supportsMultipleEditorsPerDocument: false
            }
        )
    );

    // Command to check OnlyOffice status
    context.subscriptions.push(
        vscode.commands.registerCommand('sciencestudio.checkOnlyOffice', async () => {
            try {
                const response = await fetch('http://localhost:8080/healthcheck');
                if (response.ok) {
                    vscode.window.showInformationMessage('OnlyOffice Document Server is running!');
                } else {
                    vscode.window.showWarningMessage('OnlyOffice responded but may not be fully ready.');
                }
            } catch {
                vscode.window.showErrorMessage(
                    'OnlyOffice is not running. Start it with: docker-compose up -d',
                    'Open Terminal'
                ).then(selection => {
                    if (selection === 'Open Terminal') {
                        const terminal = vscode.window.createTerminal('ScienceStudio');
                        terminal.sendText('docker-compose up -d');
                        terminal.show();
                    }
                });
            }
        })
    );

    // Register Library View
    const libraryProvider = new LibraryViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            LibraryViewProvider.viewType,
            libraryProvider
        )
    );

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('sciencestudio.hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to ScienceStudio! Press Cmd/Ctrl+Shift+P and type "Focus Mode" to get started.',
            'Open Documentation'
        ).then(selection => {
            if (selection === 'Open Documentation') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/AIScienceStudio/ScienceStudio'));
            }
        });
        context.globalState.update('sciencestudio.hasShownWelcome', true);
    }

    console.log('ScienceStudio activated successfully!');
}

export function deactivate() {
    console.log('ScienceStudio is deactivating...');
}