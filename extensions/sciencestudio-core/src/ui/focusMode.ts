import * as vscode from 'vscode';

export class FocusModeController {
    private isInFocusMode: boolean = false;
    private previousState: {
        activityBarVisible?: boolean;
        statusBarVisible?: boolean;
        sideBarVisible?: boolean;
        minimap?: boolean;
        breadcrumbs?: boolean;
        lineNumbers?: string;
    } = {};

    constructor() {
        // Check if we should start in focus mode
        const config = vscode.workspace.getConfiguration('sciencestudio');
        if (config.get('startInFocusMode', false)) {
            this.enable();
        }
    }

    public toggle(): void {
        if (this.isInFocusMode) {
            this.disable();
        } else {
            this.enable();
        }
    }

    private async enable(): Promise<void> {
        // Save current state
        const config = vscode.workspace.getConfiguration();
        this.previousState = {
            activityBarVisible: config.get('workbench.activityBar.visible'),
            statusBarVisible: config.get('workbench.statusBar.visible'),
            sideBarVisible: config.get('workbench.sideBar.visible'),
            minimap: config.get('editor.minimap.enabled'),
            breadcrumbs: config.get('breadcrumbs.enabled'),
            lineNumbers: config.get('editor.lineNumbers')
        };

        // Enter focus mode
        await vscode.commands.executeCommand('workbench.action.closeSidebar');
        
        // Update settings for focus mode
        const focusConfig = vscode.workspace.getConfiguration('sciencestudio.focusMode');
        
        if (focusConfig.get('hideActivityBar', true)) {
            await vscode.commands.executeCommand('workbench.action.toggleActivityBarVisibility');
        }
        
        if (focusConfig.get('hideStatusBar', false)) {
            await vscode.commands.executeCommand('workbench.action.toggleStatusbarVisibility');
        }

        // Update editor settings
        await config.update('editor.minimap.enabled', false, vscode.ConfigurationTarget.Global);
        await config.update('breadcrumbs.enabled', false, vscode.ConfigurationTarget.Global);
        await config.update('editor.lineNumbers', 'off', vscode.ConfigurationTarget.Global);

        this.isInFocusMode = true;
        vscode.window.showInformationMessage('Focus Mode enabled 🧘');
    }

    private async disable(): Promise<void> {
        const config = vscode.workspace.getConfiguration();

        // Restore activity bar if it was visible
        if (this.previousState.activityBarVisible !== false) {
            await vscode.commands.executeCommand('workbench.action.toggleActivityBarVisibility');
        }

        // Restore status bar if it was visible
        if (this.previousState.statusBarVisible !== false) {
            await vscode.commands.executeCommand('workbench.action.toggleStatusbarVisibility');
        }

        // Restore sidebar if it was visible
        if (this.previousState.sideBarVisible !== false) {
            await vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
        }

        // Restore editor settings
        await config.update('editor.minimap.enabled', this.previousState.minimap, vscode.ConfigurationTarget.Global);
        await config.update('breadcrumbs.enabled', this.previousState.breadcrumbs, vscode.ConfigurationTarget.Global);
        await config.update('editor.lineNumbers', this.previousState.lineNumbers, vscode.ConfigurationTarget.Global);

        this.isInFocusMode = false;
        vscode.window.showInformationMessage('Focus Mode disabled');
    }

    public isActive(): boolean {
        return this.isInFocusMode;
    }
}