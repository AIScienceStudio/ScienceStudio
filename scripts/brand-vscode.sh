#!/bin/bash

# Apply ScienceStudio branding to VS Code fork
# This script modifies product.json and other branding files

set -e  # Exit on error

echo "🎨 Applying ScienceStudio branding..."

# Save current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VSCODE_DIR="$SCRIPT_DIR/../../vscode"

# Check if vscode directory exists
if [ ! -d "$VSCODE_DIR" ]; then
    echo "❌ VS Code directory not found at $VSCODE_DIR"
    echo "Please run clone-vscode.sh first"
    exit 1
fi

cd "$VSCODE_DIR"

echo "📝 Updating product.json..."

# Create backup if it doesn't exist
if [ ! -f "product.json.backup" ]; then
    cp product.json product.json.backup
    echo "✅ Created backup at product.json.backup"
fi

# Update product.json with ScienceStudio branding
cat > product.json << 'EOF'
{
	"nameShort": "ScienceStudio",
	"nameLong": "ScienceStudio - IDE for Science",
	"applicationName": "sciencestudio",
	"dataFolderName": ".sciencestudio",
	"win32MutexName": "sciencestudio",
	"licenseFileName": "LICENSE.txt",
	"licenseName": "MIT",
	"licenseUrl": "https://github.com/AIScienceStudio/ScienceStudio/blob/main/LICENSE",
	"reportIssueUrl": "https://github.com/AIScienceStudio/ScienceStudio/issues/new",
	"urlProtocol": "sciencestudio",
	"productIcon": "resources/linux/code.png",
	"quality": "stable",
	"extensionsGallery": {
		"serviceUrl": "https://marketplace.visualstudio.com/_apis/public/gallery",
		"cacheUrl": "https://vscode.blob.core.windows.net/gallery/index",
		"itemUrl": "https://marketplace.visualstudio.com/items",
		"publisherUrl": "https://marketplace.visualstudio.com/publishers",
		"resourceUrlTemplate": "https://az764295.vo.msecnd.net/extensions/{publisher}.{name}/{version}/{path}",
		"controlUrl": "https://az764295.vo.msecnd.net/extensions/marketplace.json"
	},
	"extensionAllowedProposedApi": [
		"ms-vscode.vscode-js-profile-flame",
		"ms-vscode.vscode-js-profile-table",
		"ms-vscode.references-view",
		"ms-vscode.js-debug",
		"ms-vscode.js-debug-companion",
		"ms-vscode.vscode-selfhost-test-provider"
	],
	"builtInExtensions": [
		{
			"name": "ms-vscode.references-view",
			"repo": "https://github.com/microsoft/vscode-references-view",
			"metadata": {
				"id": "dc489f46-520d-4556-ae85-1f9eab3c412d",
				"publisherId": {
					"publisherId": "5f5636e7-69ed-4afe-b5d6-8d231fb3d3ee",
					"publisherName": "ms-vscode",
					"displayName": "Microsoft",
					"flags": "verified"
				},
				"publisherDisplayName": "Microsoft"
			}
		}
	],
	"commit": "0000000000000000000000000000000000000000",
	"date": "2024-01-01T00:00:00.000Z",
	"version": "0.1.0",
	"release": "0.1.0",
	"aiConfig": {
		"ariaKey": ""
	},
	"serverDataFolderName": ".sciencestudio-server",
	"darwinBundleIdentifier": "com.aisciencestudio.ScienceStudio",
	"win32AppUserModelId": "AIScienceStudio.ScienceStudio",
	"win32AppId": "{{F8A2A208-72B3-4D61-95FC-8A65D340689B}",
	"win32x64AppId": "{{EA457B21-F73E-494C-ACAB-524FDE069978}",
	"win32arm64AppId": "{{A5270FC5-65AD-483E-AC30-2C276B63D0AC}",
	"win32NameVersion": "AIScienceStudio ScienceStudio",
	"win32DirName": "ScienceStudio",
	"win32SetupExeBasename": "ScienceStudioSetup",
	"win32ShellNameShort": "ScienceStudio",
	"win32MutexName": "sciencestudio",
	"win32RegValueName": "ScienceStudio",
	"darwinCredits": "resources/darwin/Credits.rtf",
	"darwinBundleDocumentTypes": [
		{
			"name": "ScienceStudio document",
			"role": "Editor",
			"ostypes": ["TEXT", "utxt", "TUTX", "****"],
			"extensions": ["docx", "research", "tex", "md", "bib", "txt"],
			"mimetypes": [
				"text/plain",
				"text/markdown",
				"text/x-tex",
				"application/x-bibtex",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			]
		}
	],
	"darwinBundleURLTypes": [
		{
			"role": "Viewer",
			"name": "ScienceStudio",
			"urlschemes": ["sciencestudio"]
		}
	],
	"welcomePageUrl": "https://sciencestudio.ai/welcome",
	"updateUrl": "https://sciencestudio.ai/api/update/darwin/stable",
	"webUrl": "https://sciencestudio.ai"
}
EOF

echo "✅ Updated product.json"

# Create sciencestudio-specific build configuration
echo "📝 Creating build configuration..."
cat > build/sciencestudio.json << 'EOF'
{
	"productConfiguration": {
		"nameShort": "ScienceStudio",
		"nameLong": "ScienceStudio - IDE for Science",
		"applicationName": "sciencestudio",
		"dataFolderName": ".sciencestudio"
	},
	"hiddenExtensions": [
		"ms-vscode.js-debug",
		"ms-vscode.vscode-js-profile-flame",
		"ms-python.python",
		"ms-toolsai.jupyter"
	],
	"defaultSettings": {
		"workbench.colorTheme": "Default Light Modern",
		"workbench.startupEditor": "welcomePage",
		"workbench.statusBar.visible": true,
		"workbench.activityBar.visible": true,
		"workbench.sideBar.location": "left",
		"editor.minimap.enabled": false,
		"editor.lineNumbers": "off",
		"editor.renderWhitespace": "none",
		"editor.wordWrap": "on",
		"editor.fontSize": 14,
		"editor.lineHeight": 1.8,
		"files.autoSave": "afterDelay",
		"git.enabled": false,
		"debug.showInStatusBar": "never",
		"terminal.integrated.enabled": false
	}
}
EOF

echo "📝 Tracking modifications..."
# Update sciencestudio.json with modification tracking
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('sciencestudio.json', 'utf8'));
config.modifications.push({
  timestamp: new Date().toISOString(),
  files: ['product.json', 'build/sciencestudio.json'],
  description: 'Initial branding configuration'
});
fs.writeFileSync('sciencestudio.json', JSON.stringify(config, null, 2));
"

echo "💾 Committing changes..."
git add product.json build/sciencestudio.json sciencestudio.json
git commit -m "Apply ScienceStudio branding

- Update product.json with ScienceStudio identity
- Configure default settings for research workflow
- Hide developer-focused features
- Set up document type associations"

echo "✨ Branding complete!"
echo ""
echo "Next steps:"
echo "1. Build VS Code: yarn && yarn watch"
echo "2. Test the branded version: ./scripts/code.sh"
echo "3. Create custom icons in resources/"